/**
 * Session Handler
 *
 * Main session logic. One instance per connected client. Wires together the
 * EmdrSessionEngine, SafetyMonitor, AdaptiveController, AiDialogue, and
 * BackendClient for a single live therapy session.
 */

import type { Socket } from 'socket.io';
import type { AiRouter } from '@emdr42/ai-providers';
import {
  EmdrSessionEngine,
  SafetyMonitor,
  AdaptiveController,
  EMDR_SYSTEM_PROMPT,
  PHASE_PROMPTS,
  SAFETY_PROMPTS,
} from '@emdr42/emdr-engine';
import type {
  EmdrPhase,
  EmotionSnapshot,
  FullSessionExport,
} from '@emdr42/emdr-engine';

import { AiDialogue } from './ai-dialogue';
import { BackendClient } from './backend-client';
import { analyzeVoiceSegment } from './voice-analysis';

/** Interval for batch-flushing emotion records to the backend (ms). */
const EMOTION_FLUSH_INTERVAL_MS = 10_000;

export class SessionHandler {
  private engine: EmdrSessionEngine;
  private safetyMonitor: SafetyMonitor;
  private adaptiveController: AdaptiveController;
  private aiDialogue: AiDialogue;
  private backendClient: BackendClient;
  private socket: Socket;
  private sessionId: string;
  private userId: string;

  /** Buffered emotions waiting to be flushed to the backend. */
  private emotionBuffer: EmotionSnapshot[] = [];
  private emotionFlushTimer: ReturnType<typeof setInterval> | null = null;

  /**
   * Closed-loop BLS set tracking (#core-2). Когда сессия в BLS phase:
   * таймер срабатывает после каждого "set" (setLength / speed сек),
   * вызывает AI check-in "How does that feel now?" + просит SUDS rating.
   */
  private blsSetTimer: ReturnType<typeof setTimeout> | null = null;
  private blsPhaseActive = false;
  private lastCheckInAt = 0;

  constructor(
    socket: Socket,
    sessionId: string,
    userId: string,
    aiRouter: AiRouter,
    backendClient: BackendClient
  ) {
    this.socket = socket;
    this.sessionId = sessionId;
    this.userId = userId;
    this.backendClient = backendClient;

    this.engine = new EmdrSessionEngine(sessionId, userId);
    this.safetyMonitor = new SafetyMonitor();
    this.adaptiveController = new AdaptiveController();

    // Build initial system prompt: base + phase 1
    const initialPrompt = `${EMDR_SYSTEM_PROMPT}\n\n${PHASE_PROMPTS.history}`;
    this.aiDialogue = new AiDialogue(aiRouter, initialPrompt);
  }

  // --------------------------------------------------------------------------
  // Lifecycle
  // --------------------------------------------------------------------------

  /** Start a new EMDR session. */
  async start(): Promise<void> {
    // Start the engine
    this.engine.startSession();

    // Create session in backend
    try {
      await this.backendClient.createSession({});
    } catch (err) {
      console.error(`[session:${this.sessionId}] Failed to create backend session:`, err);
    }

    // Start emotion batch flush
    this.emotionFlushTimer = setInterval(
      () => this.flushEmotions(),
      EMOTION_FLUSH_INTERVAL_MS
    );

    // Send initial AI greeting (Phase 1: History)
    await this.streamAiResponse('Begin the EMDR session. Greet the client warmly and start Phase 1 (History Taking).');

    // Record timeline event
    this.recordTimeline('phase_start', { phase: 'history' });
  }

  /** End session. */
  async endSession(): Promise<void> {
    // Flush remaining emotions
    await this.flushEmotions();
    this.clearEmotionFlush();
    this.stopBlsCheckInLoop();

    // End the engine
    this.engine.endSession('standard_closure', 'session_ended_by_client');

    // Export and save to backend
    const exportData = this.engine.exportSessionData();
    await this.saveToBackend(exportData);

    // Emit summary to client
    const latestSuds = this.engine.getLatestSuds();
    const latestVoc = this.engine.getLatestVoc();
    this.socket.emit('session:session_ended', {
      sessionId: this.sessionId,
      elapsedSeconds: exportData.elapsedSeconds,
      blsSetsCompleted: exportData.blsSetsCompleted,
      finalSuds: latestSuds,
      finalVoc: latestVoc,
      phasesCompleted: exportData.phases.length,
      safetyEventsCount: exportData.safetyEvents.length,
    });

    // Notify gamification (#89) — best-effort, не ломает endSession
    this.backendClient.notifyGamificationEvent({
      type: 'session_completed',
      finalSuds: latestSuds,
      finalVoc: latestVoc,
      phasesCompleted: exportData.phases.length,
    }).catch(() => void 0);
  }

  // --------------------------------------------------------------------------
  // Patient message
  // --------------------------------------------------------------------------

  /** Handle patient text (from STT or typed). */
  async handlePatientMessage(text: string): Promise<void> {
    // Record in timeline
    this.recordTimeline('patient_utterance', { text });

    // Build context and stream AI response
    const context = this.buildContextMessage();
    const fullResponse = await this.streamAiResponseWithContext(text, context);

    // Check if AI suggests a phase transition
    const { suggestsTransition, nextPhase } =
      this.aiDialogue.analyzeResponse(fullResponse);

    if (suggestsTransition && nextPhase) {
      this.tryPhaseTransition(nextPhase, 'ai_suggestion');
    }

    // Also check AdaptiveController for data-driven transitions
    const transitionCheck = this.adaptiveController.shouldTransitionPhase(
      this.engine.getState()
    );
    if (transitionCheck.transition && transitionCheck.nextPhase) {
      this.tryPhaseTransition(
        transitionCheck.nextPhase,
        transitionCheck.reason ?? 'adaptive_controller'
      );
    }
  }

  /**
   * Handle patient message for voice mode.
   * Returns the full AI response text (for TTS) instead of streaming to socket.
   */
  async handlePatientMessageForVoice(text: string): Promise<string> {
    // Record in timeline
    this.recordTimeline('patient_utterance', { text, source: 'voice' });

    // Build context
    const context = this.buildContextMessage();

    // Get AI response without streaming to socket
    let fullResponse = '';
    try {
      const stream = this.aiDialogue.sendMessage(text, context);
      for await (const chunk of stream) {
        fullResponse += chunk;
      }

      // Record in timeline
      this.recordTimeline('ai_utterance', {
        text: fullResponse.slice(0, 500),
        source: 'voice',
      });
    } catch (err) {
      console.error(`[session:${this.sessionId}] Voice AI response error:`, err);
      fullResponse = 'I apologize, I encountered a technical issue. Please give me a moment.';
    }

    // Check for phase transitions
    const { suggestsTransition, nextPhase } =
      this.aiDialogue.analyzeResponse(fullResponse);

    if (suggestsTransition && nextPhase) {
      this.tryPhaseTransition(nextPhase, 'ai_suggestion');
    }

    const transitionCheck = this.adaptiveController.shouldTransitionPhase(
      this.engine.getState()
    );
    if (transitionCheck.transition && transitionCheck.nextPhase) {
      this.tryPhaseTransition(
        transitionCheck.nextPhase,
        transitionCheck.reason ?? 'adaptive_controller'
      );
    }

    return fullResponse;
  }

  // --------------------------------------------------------------------------
  // Voice metrics (#79 — voice pattern analysis)
  // --------------------------------------------------------------------------

  /**
   * Вызывается из VoiceHandler после каждого final transcript с word-level timing.
   * Считает indicators и передаёт в SafetyMonitor для composite dissociation detection.
   */
  handleVoiceMetrics(segment: {
    words: Array<{ word: string; start: number; end: number; confidence?: number }>;
    durationSec: number;
  }): void {
    try {
      const analysis = analyzeVoiceSegment(segment);
      this.safetyMonitor.updateVoiceIndicators(analysis.indicators);
    } catch (err) {
      // best-effort — voice analysis не критичен для flow
      console.warn(`[session:${this.sessionId}] voice analysis failed:`, err);
    }
  }

  // --------------------------------------------------------------------------
  // Emotion data
  // --------------------------------------------------------------------------

  /** Handle emotion snapshot from frontend. */
  handleEmotionUpdate(data: EmotionSnapshot): void {
    // Record in engine
    this.engine.recordEmotion(data);

    // Buffer for batch save
    this.emotionBuffer.push(data);

    // Feed to SafetyMonitor
    const analysis = this.safetyMonitor.analyzeEmotion(
      data,
      this.engine.getState()
    );

    if (!analysis.safe && analysis.intervention) {
      // Report safety event to engine
      for (const event of analysis.events) {
        this.engine.reportSafetyEvent(event);
      }

      // Emit intervention to client
      this.socket.emit('session:intervention', {
        type: analysis.intervention.type,
        instructions: analysis.intervention.instructions,
        priority: analysis.intervention.priority,
        riskLevel: analysis.riskLevel,
      });

      // Emit safety alert
      this.socket.emit('session:safety_alert', {
        riskLevel: analysis.riskLevel,
        events: analysis.events,
      });

      // Persist safety events
      for (const event of analysis.events) {
        this.backendClient
          .addSafetyEvent(this.sessionId, event)
          .catch((err) =>
            console.error(`[session:${this.sessionId}] Failed to save safety event:`, err)
          );
      }

      // If critical, pause BLS
      if (
        analysis.intervention.priority === 'critical' ||
        analysis.intervention.priority === 'high'
      ) {
        this.socket.emit('session:bls_config', {
          ...this.engine.getBlsConfig(),
          paused: true,
        });
      }
    }

    // Feed to AdaptiveController for BLS adjustment
    const currentPhase = this.engine.getCurrentPhase();
    if (currentPhase === 'desensitization' || currentPhase === 'installation') {
      const newBlsConfig = this.adaptiveController.calculateBlsParams(
        currentPhase,
        data,
        this.engine.getBlsSetsCompleted(),
        this.engine.getSudsHistory()
      );

      const currentConfig = this.engine.getBlsConfig();
      const changed =
        newBlsConfig.speed !== currentConfig.speed ||
        newBlsConfig.pattern !== currentConfig.pattern ||
        newBlsConfig.setLength !== currentConfig.setLength;

      if (changed) {
        this.engine.adaptBls(newBlsConfig, 'adaptive_controller');
        this.socket.emit('session:bls_config', newBlsConfig);
      }
    }
  }

  // --------------------------------------------------------------------------
  // SUDS / VOC
  // --------------------------------------------------------------------------

  /** Handle SUDS rating from patient. */
  handleSudsRating(value: number, context: string): void {
    this.engine.recordSuds(value, context);

    // Persist
    this.backendClient
      .addSudsRecord(this.sessionId, {
        timestamp: Date.now(),
        value,
        context,
      })
      .catch((err) =>
        console.error(`[session:${this.sessionId}] Failed to save SUDS:`, err)
      );

    // Check for phase transition (SUDS=0 in desensitization -> installation)
    const transitionCheck = this.adaptiveController.shouldTransitionPhase(
      this.engine.getState()
    );
    if (transitionCheck.transition && transitionCheck.nextPhase) {
      this.tryPhaseTransition(
        transitionCheck.nextPhase,
        transitionCheck.reason ?? 'suds_threshold'
      );
    }

    // Check for stuck processing
    const interweave = this.adaptiveController.suggestInterweave(
      this.engine.getState()
    );
    if (interweave) {
      this.recordTimeline('interweave', { question: interweave });
      // The interweave will be included in the next AI context
    }
  }

  /** Handle VOC rating from patient. */
  handleVocRating(value: number, context: string): void {
    this.engine.recordVoc(value, context);

    // Persist
    this.backendClient
      .addVocRecord(this.sessionId, {
        timestamp: Date.now(),
        value,
        context,
      })
      .catch((err) =>
        console.error(`[session:${this.sessionId}] Failed to save VOC:`, err)
      );

    // Check for phase transition (VOC=7 in installation -> body_scan)
    const transitionCheck = this.adaptiveController.shouldTransitionPhase(
      this.engine.getState()
    );
    if (transitionCheck.transition && transitionCheck.nextPhase) {
      this.tryPhaseTransition(
        transitionCheck.nextPhase,
        transitionCheck.reason ?? 'voc_threshold'
      );
    }
  }

  // --------------------------------------------------------------------------
  // Stop signal / Pause / Resume
  // --------------------------------------------------------------------------

  /** Handle stop signal from patient. */
  handleStopSignal(): void {
    // Pause BLS
    this.socket.emit('session:bls_config', {
      ...this.engine.getBlsConfig(),
      paused: true,
    });

    // Report safety event
    this.engine.reportSafetyEvent({
      timestamp: Date.now(),
      type: 'stop_signal',
      severity: 'high',
      actionTaken: 'pause',
      resolved: false,
    });

    // Send grounding intervention
    this.socket.emit('session:intervention', {
      type: 'pause',
      instructions: SAFETY_PROMPTS.grounding_54321,
      priority: 'high',
      riskLevel: 'high',
    });

    this.recordTimeline('grounding_started', { trigger: 'stop_signal' });
  }

  /** Handle pause. */
  handlePause(): void {
    this.engine.pauseSession();
    this.socket.emit('session:bls_config', {
      ...this.engine.getBlsConfig(),
      paused: true,
    });
  }

  /** Handle resume. */
  handleResume(): void {
    this.engine.resumeSession();
    this.socket.emit('session:bls_config', {
      ...this.engine.getBlsConfig(),
      paused: false,
    });
  }

  // --------------------------------------------------------------------------
  // Phase transitions
  // --------------------------------------------------------------------------

  private tryPhaseTransition(nextPhase: EmdrPhase, reason: string): void {
    if (!this.engine.canTransitionTo(nextPhase)) return;

    this.engine.transitionToPhase(nextPhase, reason);

    // Update AI system prompt with new phase-specific prompt
    const phasePrompt = PHASE_PROMPTS[nextPhase];
    this.aiDialogue.updateSystemPrompt(
      `${EMDR_SYSTEM_PROMPT}\n\n${phasePrompt}`
    );

    // Emit to client
    this.socket.emit('session:phase_changed', {
      phase: nextPhase,
      reason,
    });

    // Start/stop closed-loop BLS check-in (#core-2)
    const blsPhases: EmdrPhase[] = ['desensitization', 'installation', 'body_scan'];
    if (blsPhases.includes(nextPhase)) {
      this.startBlsCheckInLoop();
    } else {
      this.stopBlsCheckInLoop();
    }

    // Record timeline
    this.recordTimeline('phase_start', { phase: nextPhase, reason });

    // Persist
    this.backendClient
      .updateSession(this.sessionId, {
        currentPhase: nextPhase,
      })
      .catch((err) =>
        console.error(`[session:${this.sessionId}] Failed to update phase:`, err)
      );
  }

  // --------------------------------------------------------------------------
  // AI streaming helpers
  // --------------------------------------------------------------------------

  /**
   * Send a system-level prompt to the AI and stream the response to the client.
   * Used for initial greeting and similar orchestrator-initiated messages.
   */
  private async streamAiResponse(prompt: string): Promise<string> {
    const context = this.buildContextMessage();
    return this.streamAiResponseWithContext(prompt, context);
  }

  /**
   * Stream AI response for a given user message and context.
   * Emits `session:ai_response` chunks and a final complete message.
   */
  private async streamAiResponseWithContext(
    userMessage: string,
    context: string
  ): Promise<string> {
    let fullResponse = '';
    const start = Date.now();

    // Load cross-session patient context (#81). Best-effort — не ломает flow.
    let patientContext: string | undefined;
    try {
      const ctx = await this.backendClient.getPatientContext();
      patientContext = ctx?.prompt;
    } catch {
      // Continue without patient context
    }

    try {
      const stream = this.aiDialogue.sendMessage(userMessage, context, {
        enableArmor: true,
        patientContext,
        onInjection: (analysis) => {
          this.recordTimeline('interweave', {
            kind: 'prompt_injection_detected',
            score: analysis.score,
            matched: analysis.matched.slice(0, 3),
          });
        },
      });

      for await (const chunk of stream) {
        fullResponse += chunk;
        this.socket.emit('session:ai_response', {
          type: 'chunk',
          text: chunk,
        });
      }

      // Usage tracking (#130) — best-effort
      this.backendClient.recordUsage({
        sessionId: this.sessionId,
        provider: 'anthropic', // TODO: router should report actual provider
        providerType: 'LLM',
        inputTokens: userMessage.length / 4, // rough estimate
        outputTokens: fullResponse.length / 4,
        durationMs: Date.now() - start,
      }).catch(() => void 0);

      // Emit complete response
      this.socket.emit('session:ai_response', {
        type: 'complete',
        text: fullResponse,
      });

      // Record in timeline
      this.recordTimeline('ai_utterance', {
        text: fullResponse.slice(0, 500), // Truncate for timeline
      });
    } catch (err) {
      console.error(`[session:${this.sessionId}] AI response error:`, err);
      this.socket.emit('session:ai_response', {
        type: 'error',
        text: 'I apologize, I encountered a technical issue. Please give me a moment.',
      });
    }

    return fullResponse;
  }

  // --------------------------------------------------------------------------
  // Context builder
  // --------------------------------------------------------------------------

  /** Build a context string for the AI with current session state. */
  private buildContextMessage(): string {
    const state = this.engine.getState();
    const avgEmotions = this.engine.getAverageEmotions(5);
    const safetyCheck = this.safetyMonitor.isSafeToContinue(state);

    const parts: string[] = [
      `Phase: ${state.currentPhase}`,
      `Elapsed: ${state.elapsedSeconds}s`,
      `BLS sets completed: ${state.blsSetsCompleted}`,
    ];

    const latestSuds = this.engine.getLatestSuds();
    if (latestSuds !== null) {
      parts.push(`Current SUDS: ${latestSuds}/10`);
    }

    const latestVoc = this.engine.getLatestVoc();
    if (latestVoc !== null) {
      parts.push(`Current VOC: ${latestVoc}/7`);
    }

    if (avgEmotions.confidence > 0) {
      parts.push(
        `Avg emotions (last 5): stress=${avgEmotions.stress.toFixed(2)}, ` +
          `engagement=${avgEmotions.engagement.toFixed(2)}, ` +
          `valence=${avgEmotions.valence.toFixed(2)}`
      );
    }

    if (!safetyCheck.safe) {
      parts.push(`SAFETY CONCERN: ${safetyCheck.reason}`);
    }

    // Include interweave suggestion if processing is stuck
    const interweave = this.adaptiveController.suggestInterweave(state);
    if (interweave) {
      parts.push(`Suggested cognitive interweave: "${interweave}"`);
    }

    const target = this.engine.getTarget();
    if (target) {
      parts.push(
        `Target: ${target.description}`,
        `NC: "${target.negativeCognition}" | PC: "${target.positiveCognition}"`
      );
    }

    return parts.join('\n');
  }

  // --------------------------------------------------------------------------
  // Persistence helpers
  // --------------------------------------------------------------------------

  private recordTimeline(
    type: string,
    data: Record<string, unknown>
  ): void {
    const event = {
      timestamp: Date.now(),
      type: type as import('@emdr42/emdr-engine').TimelineEventType,
      data,
    };

    this.engine.addTimelineEvent(event);

    this.backendClient.addTimelineEvent(this.sessionId, event).catch((err) =>
      console.error(`[session:${this.sessionId}] Failed to save timeline event:`, err)
    );
  }

  private async flushEmotions(): Promise<void> {
    if (this.emotionBuffer.length === 0) return;

    const batch = this.emotionBuffer.splice(0);
    try {
      await this.backendClient.addEmotionRecords(this.sessionId, batch);
    } catch (err) {
      console.error(`[session:${this.sessionId}] Failed to flush emotions:`, err);
      // Put them back for next flush attempt
      this.emotionBuffer.unshift(...batch);
    }
  }

  private clearEmotionFlush(): void {
    if (this.emotionFlushTimer) {
      clearInterval(this.emotionFlushTimer);
      this.emotionFlushTimer = null;
    }
  }

  // --- Closed-loop BLS check-in (#core-2) ---

  /**
   * Во время BLS phase: после каждого "set" (длительность = setLength / speed сек)
   * AI делает краткий check-in + просит SUDS rating. Создаёт closed loop:
   * emotion → BLS adapt → check-in → SUDS → new adapt.
   */
  private startBlsCheckInLoop(): void {
    this.stopBlsCheckInLoop();
    this.blsPhaseActive = true;
    this.scheduleNextCheckIn();
  }

  private stopBlsCheckInLoop(): void {
    this.blsPhaseActive = false;
    if (this.blsSetTimer) {
      clearTimeout(this.blsSetTimer);
      this.blsSetTimer = null;
    }
  }

  private scheduleNextCheckIn(): void {
    if (!this.blsPhaseActive) return;
    const config = this.engine.getBlsConfig();
    // Длительность одного BLS-сета в секундах (passes / speed Hz).
    // Clamp в [20, 90] чтобы не вызывать check-in слишком часто/редко.
    const setDurationSec = Math.max(20, Math.min(90, (config.setLength ?? 24) / Math.max(config.speed, 0.3)));
    this.blsSetTimer = setTimeout(() => {
      void this.triggerCheckIn();
    }, setDurationSec * 1000);
    this.blsSetTimer.unref?.();
  }

  private async triggerCheckIn(): Promise<void> {
    if (!this.blsPhaseActive) return;
    const now = Date.now();
    // Дебаунс — не чаще раза в 20 сек
    if (now - this.lastCheckInAt < 20_000) {
      this.scheduleNextCheckIn();
      return;
    }
    this.lastCheckInAt = now;

    // Увеличить счётчик BLS sets
    this.engine.endBlsSet();

    // AI prompt: короткий check-in + запрос SUDS
    try {
      await this.streamAiResponse(
        'Short check-in after a BLS set. Ask the client: "What comes up now? How does it feel on a scale of 0-10 (SUDS)?" Keep it under 25 words.',
      );
    } catch (err) {
      console.warn(`[session:${this.sessionId}] check-in failed:`, err);
    }

    // Попросить клиента явно отправить SUDS через UI hint
    this.socket.emit('session:check_in_prompt', {
      setsCompleted: this.engine.getBlsSetsCompleted(),
      message: 'Оцените текущий уровень дискомфорта (SUDS 0-10)',
    });

    this.recordTimeline('bls_stop', { reason: 'auto_check_in' });

    // Планируем следующий check-in
    this.scheduleNextCheckIn();
  }

  private async saveToBackend(data: FullSessionExport): Promise<void> {
    try {
      await this.backendClient.updateSession(this.sessionId, {
        status: 'completed',
        endedAt: new Date(data.endedAt).toISOString(),
        elapsedSeconds: data.elapsedSeconds,
        blsSetsCompleted: data.blsSetsCompleted,
      });
    } catch (err) {
      console.error(`[session:${this.sessionId}] Failed to save session to backend:`, err);
    }
  }
}
