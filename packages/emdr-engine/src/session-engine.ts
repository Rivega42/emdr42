/**
 * EMDR Session Engine
 *
 * Main orchestrator for an EMDR therapy session. Manages the 8-phase protocol,
 * tracks scales (SUDS/VOC), emotion snapshots, BLS sets, timeline events,
 * and safety incidents. Emits events for every meaningful state change so that
 * UI and AI layers can react in real time.
 */

import { EventEmitter } from 'events';
import type {
  BlsConfig,
  EmdrPhase,
  EmdrSessionState,
  EmotionSnapshot,
  FullSessionExport,
  PhaseTransition,
  SafetyEvent,
  ScaleRecord,
  TimelineEvent,
  TimelineEventType,
  TargetMemory,
} from './types';

// ---------------------------------------------------------------------------
// Valid phase transitions (directed graph)
// ---------------------------------------------------------------------------

const VALID_TRANSITIONS: Record<EmdrPhase, EmdrPhase[]> = {
  history: ['preparation'],
  preparation: ['assessment'],
  assessment: ['desensitization'],
  desensitization: ['installation', 'closure'],
  installation: ['body_scan', 'closure'],
  body_scan: ['closure'],
  closure: ['reevaluation'],
  reevaluation: ['assessment', 'desensitization', 'closure'],
};

// ---------------------------------------------------------------------------
// Default BLS configuration
// ---------------------------------------------------------------------------

const DEFAULT_BLS_CONFIG: BlsConfig = {
  pattern: 'horizontal',
  speed: 1.0,
  setLength: 24,
  type: 'eye_movement',
};

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export class EmdrSessionEngine extends EventEmitter {
  private state: EmdrSessionState;
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private closureTechnique = '';
  private clientStateAtEnd = '';

  constructor(sessionId: string, userId: string) {
    super();

    this.state = {
      sessionId,
      userId,
      currentPhase: 'history',
      phaseHistory: [],
      target: null,
      sudsHistory: [],
      vocHistory: [],
      emotionTrack: [],
      timelineEvents: [],
      safetyEvents: [],
      blsConfig: { ...DEFAULT_BLS_CONFIG },
      blsSetsCompleted: 0,
      isActive: false,
      isPaused: false,
      startedAt: 0,
      elapsedSeconds: 0,
    };
  }

  // -----------------------------------------------------------------------
  // Phase management
  // -----------------------------------------------------------------------

  startSession(): void {
    if (this.state.isActive) return;

    this.state.isActive = true;
    this.state.startedAt = Date.now();
    this.startTimer();

    this.addTimelineEvent({
      timestamp: Date.now(),
      type: 'phase_start',
      data: { phase: this.state.currentPhase },
    });
  }

  transitionToPhase(phase: EmdrPhase, reason: string): void {
    if (!this.canTransitionTo(phase)) {
      throw new Error(
        `Invalid transition from "${this.state.currentPhase}" to "${phase}"`
      );
    }

    const now = Date.now();
    const from = this.state.currentPhase;

    // Record end of current phase
    this.addTimelineEvent({
      timestamp: now,
      type: 'phase_end',
      data: { phase: from, reason },
    });

    const transition: PhaseTransition = {
      from,
      to: phase,
      timestamp: now,
      reason,
    };
    this.state.phaseHistory.push(transition);
    this.state.currentPhase = phase;

    // Record start of new phase
    this.addTimelineEvent({
      timestamp: now,
      type: 'phase_start',
      data: { phase, reason },
    });

    this.emit('phaseChanged', transition);
  }

  getCurrentPhase(): EmdrPhase {
    return this.state.currentPhase;
  }

  canTransitionTo(phase: EmdrPhase): boolean {
    return VALID_TRANSITIONS[this.state.currentPhase]?.includes(phase) ?? false;
  }

  // -----------------------------------------------------------------------
  // Target memory
  // -----------------------------------------------------------------------

  setTarget(target: TargetMemory): void {
    this.state.target = target;
  }

  getTarget(): TargetMemory | null {
    return this.state.target;
  }

  // -----------------------------------------------------------------------
  // Scale tracking — SUDS (0-10) & VOC (1-7)
  // -----------------------------------------------------------------------

  recordSuds(value: number, context: string): void {
    const clamped = Math.max(0, Math.min(10, Math.round(value)));
    const record: ScaleRecord = { timestamp: Date.now(), value: clamped, context };
    this.state.sudsHistory.push(record);

    this.addTimelineEvent({
      timestamp: record.timestamp,
      type: 'suds_recorded',
      data: { value: clamped, context },
    });

    this.emit('sudsRecorded', record);
  }

  recordVoc(value: number, context: string): void {
    const clamped = Math.max(1, Math.min(7, Math.round(value)));
    const record: ScaleRecord = { timestamp: Date.now(), value: clamped, context };
    this.state.vocHistory.push(record);

    this.addTimelineEvent({
      timestamp: record.timestamp,
      type: 'voc_recorded',
      data: { value: clamped, context },
    });

    this.emit('vocRecorded', record);
  }

  getLatestSuds(): number | null {
    const h = this.state.sudsHistory;
    return h.length > 0 ? h[h.length - 1].value : null;
  }

  getLatestVoc(): number | null {
    const h = this.state.vocHistory;
    return h.length > 0 ? h[h.length - 1].value : null;
  }

  getSudsHistory(): ScaleRecord[] {
    return this.state.sudsHistory;
  }

  getVocHistory(): ScaleRecord[] {
    return this.state.vocHistory;
  }

  // -----------------------------------------------------------------------
  // Emotion tracking
  // -----------------------------------------------------------------------

  recordEmotion(snapshot: EmotionSnapshot): void {
    this.state.emotionTrack.push(snapshot);
    this.emit('emotionRecorded', snapshot);
  }

  getEmotionTrack(): EmotionSnapshot[] {
    return this.state.emotionTrack;
  }

  getAverageEmotions(lastN: number): EmotionSnapshot {
    const track = this.state.emotionTrack;
    const slice = track.slice(-Math.max(1, lastN));
    const count = slice.length;

    if (count === 0) {
      return {
        timestamp: Date.now(),
        stress: 0,
        engagement: 0,
        positivity: 0,
        arousal: 0,
        valence: 0,
        joy: 0,
        sadness: 0,
        anger: 0,
        fear: 0,
        confidence: 0,
      };
    }

    const sum = slice.reduce<Omit<EmotionSnapshot, 'timestamp'>>(
      (acc, s) => ({
        stress: acc.stress + s.stress,
        engagement: acc.engagement + s.engagement,
        positivity: acc.positivity + s.positivity,
        arousal: acc.arousal + s.arousal,
        valence: acc.valence + s.valence,
        joy: acc.joy + s.joy,
        sadness: acc.sadness + s.sadness,
        anger: acc.anger + s.anger,
        fear: acc.fear + s.fear,
        confidence: acc.confidence + s.confidence,
      }),
      {
        stress: 0,
        engagement: 0,
        positivity: 0,
        arousal: 0,
        valence: 0,
        joy: 0,
        sadness: 0,
        anger: 0,
        fear: 0,
        confidence: 0,
      }
    );

    return {
      timestamp: Date.now(),
      stress: sum.stress / count,
      engagement: sum.engagement / count,
      positivity: sum.positivity / count,
      arousal: sum.arousal / count,
      valence: sum.valence / count,
      joy: sum.joy / count,
      sadness: sum.sadness / count,
      anger: sum.anger / count,
      fear: sum.fear / count,
      confidence: sum.confidence / count,
    };
  }

  // -----------------------------------------------------------------------
  // BLS management
  // -----------------------------------------------------------------------

  startBlsSet(): void {
    this.addTimelineEvent({
      timestamp: Date.now(),
      type: 'bls_start',
      data: { config: { ...this.state.blsConfig } },
    });
    this.emit('blsStarted', this.state.blsConfig);
  }

  endBlsSet(): void {
    this.state.blsSetsCompleted += 1;
    this.addTimelineEvent({
      timestamp: Date.now(),
      type: 'bls_stop',
      data: { setsCompleted: this.state.blsSetsCompleted },
    });
    this.emit('blsStopped', this.state.blsSetsCompleted);
  }

  adaptBls(config: Partial<BlsConfig>, reason: string): void {
    Object.assign(this.state.blsConfig, config);

    this.addTimelineEvent({
      timestamp: Date.now(),
      type: 'bls_adapt',
      data: { config: { ...this.state.blsConfig }, reason },
    });

    this.emit('blsAdapted', { config: this.state.blsConfig, reason });
  }

  getBlsConfig(): BlsConfig {
    return { ...this.state.blsConfig };
  }

  getBlsSetsCompleted(): number {
    return this.state.blsSetsCompleted;
  }

  // -----------------------------------------------------------------------
  // Timeline
  // -----------------------------------------------------------------------

  addTimelineEvent(event: TimelineEvent): void {
    this.state.timelineEvents.push(event);
  }

  getTimeline(): TimelineEvent[] {
    return this.state.timelineEvents;
  }

  // -----------------------------------------------------------------------
  // Safety
  // -----------------------------------------------------------------------

  reportSafetyEvent(event: SafetyEvent): void {
    this.state.safetyEvents.push(event);

    this.addTimelineEvent({
      timestamp: event.timestamp,
      type: 'safety_alert',
      data: { ...event },
    });

    this.emit('safetyAlert', event);
  }

  getSafetyEvents(): SafetyEvent[] {
    return this.state.safetyEvents;
  }

  // -----------------------------------------------------------------------
  // Session control
  // -----------------------------------------------------------------------

  pauseSession(): void {
    if (!this.state.isActive || this.state.isPaused) return;
    this.state.isPaused = true;
    this.stopTimer();
    this.emit('sessionPaused');
  }

  resumeSession(): void {
    if (!this.state.isActive || !this.state.isPaused) return;
    this.state.isPaused = false;
    this.startTimer();
    this.emit('sessionResumed');
  }

  endSession(closureTechnique: string, clientState: string): void {
    if (!this.state.isActive) return;

    this.closureTechnique = closureTechnique;
    this.clientStateAtEnd = clientState;
    this.state.isActive = false;
    this.state.isPaused = false;
    this.stopTimer();

    this.addTimelineEvent({
      timestamp: Date.now(),
      type: 'phase_end',
      data: {
        phase: this.state.currentPhase,
        reason: 'session_ended',
        closureTechnique,
        clientState,
      },
    });

    this.emit('sessionEnded', this.exportSessionData());
  }

  getState(): EmdrSessionState {
    return { ...this.state };
  }

  getElapsedSeconds(): number {
    return this.state.elapsedSeconds;
  }

  // -----------------------------------------------------------------------
  // Export
  // -----------------------------------------------------------------------

  exportSessionData(): FullSessionExport {
    return {
      sessionId: this.state.sessionId,
      userId: this.state.userId,
      startedAt: this.state.startedAt,
      endedAt: Date.now(),
      elapsedSeconds: this.state.elapsedSeconds,
      phases: [...this.state.phaseHistory],
      target: this.state.target,
      sudsHistory: [...this.state.sudsHistory],
      vocHistory: [...this.state.vocHistory],
      emotionTrack: [...this.state.emotionTrack],
      timeline: [...this.state.timelineEvents],
      safetyEvents: [...this.state.safetyEvents],
      blsSetsCompleted: this.state.blsSetsCompleted,
      closureTechnique: this.closureTechnique,
      clientStateAtEnd: this.clientStateAtEnd,
    };
  }

  // -----------------------------------------------------------------------
  // Internal timer
  // -----------------------------------------------------------------------

  private startTimer(): void {
    if (this.timerInterval) return;
    this.timerInterval = setInterval(() => {
      if (this.state.isActive && !this.state.isPaused) {
        this.state.elapsedSeconds += 1;
      }
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }
}
