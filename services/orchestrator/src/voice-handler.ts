/**
 * VoiceHandler — Realtime voice dialogue pipeline
 *
 * Pipeline: Browser Audio → Vosk STT → AiDialogue → Piper TTS → Browser Audio
 *
 * Manages WebSocket connection to Vosk for real-time speech recognition,
 * integrates with AiDialogue for AI responses, and calls Piper TTS for synthesis.
 */

import WebSocket from 'ws';
import type { Socket } from 'socket.io';
import type { SessionHandler } from './session-handler';

export interface VoiceHandlerConfig {
  voskUrl: string;
  piperUrl: string;
  sampleRate?: number;
  language?: string;
}

export interface VoskResult {
  text?: string;
  partial?: string;
  result?: Array<{ word: string; start: number; end: number; conf: number }>;
}

export class VoiceHandler {
  private socket: Socket;
  private sessionId: string;
  private config: VoiceHandlerConfig;
  private sessionHandler: SessionHandler;

  private voskWs: WebSocket | null = null;
  private isActive = false;
  private accumulatedText = '';
  private silenceTimeout: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  /** Silence threshold in ms before processing accumulated text */
  private readonly SILENCE_THRESHOLD_MS = 800;

  constructor(
    socket: Socket,
    sessionId: string,
    config: VoiceHandlerConfig,
    sessionHandler: SessionHandler
  ) {
    this.socket = socket;
    this.sessionId = sessionId;
    this.config = {
      sampleRate: 16000,
      language: 'en-us',
      ...config,
    };
    this.sessionHandler = sessionHandler;
  }

  /** Start voice dialogue mode */
  async start(): Promise<void> {
    if (this.isActive) return;

    try {
      await this.connectToVosk();
      this.isActive = true;
      console.log(`[voice:${this.sessionId}] Voice handler started`);
    } catch (err) {
      console.error(`[voice:${this.sessionId}] Failed to start:`, err);
      this.socket.emit('voice:error', {
        message: 'Failed to initialize voice recognition',
      });
      throw err;
    }
  }

  /** Stop voice dialogue mode */
  stop(): void {
    if (!this.isActive) return;

    this.isActive = false;
    this.clearSilenceTimeout();

    // Отменяем reconnect, если он был запланирован — иначе после stop
    // через несколько секунд оживает старая сессия Vosk.
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempts = 0;

    if (this.voskWs) {
      try {
        this.voskWs.removeAllListeners();
        this.voskWs.send(JSON.stringify({ eof: 1 }));
      } catch {
        /* ignore */
      }
      this.voskWs.close();
      this.voskWs = null;
    }

    console.log(`[voice:${this.sessionId}] Voice handler stopped`);
  }

  /** Handle incoming audio chunk from browser */
  handleAudioChunk(audioBuffer: ArrayBuffer): void {
    if (!this.isActive || !this.voskWs) return;

    // Reset silence timeout
    this.resetSilenceTimeout();

    // Send audio to Vosk
    if (this.voskWs.readyState === WebSocket.OPEN) {
      this.voskWs.send(Buffer.from(audioBuffer));
    }
  }

  /** Check if voice handler is active */
  isVoiceActive(): boolean {
    return this.isActive;
  }

  // -------------------------------------------------------------------------
  // Vosk connection
  // -------------------------------------------------------------------------

  private async connectToVosk(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = this.config.voskUrl;
      console.log(`[voice:${this.sessionId}] Connecting to Vosk at ${wsUrl}`);

      // Очищаем предыдущий socket если есть. Без этого reconnect создавал
      // листенеры на старом WS, утечка событий + потенциальный race на
      // одновременно открытые соединения.
      if (this.voskWs) {
        try {
          this.voskWs.removeAllListeners();
          this.voskWs.close();
        } catch {
          /* ignore */
        }
      }

      this.voskWs = new WebSocket(wsUrl);
      let settled = false;

      // Timeout для initial connection. Если успешно — clearTimeout, иначе
      // raceся с open/error. ВАЖНО: clearTimeout в open/error чтобы fake
      // timeout не reject-ил уже подключённый сокет.
      const connectTimeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        if (this.voskWs?.readyState !== WebSocket.OPEN) {
          try {
            this.voskWs?.removeAllListeners();
            this.voskWs?.close();
          } catch {
            /* ignore */
          }
          reject(new Error('Vosk connection timeout'));
        }
      }, 5000);

      this.voskWs.on('open', () => {
        // Configure Vosk
        this.voskWs!.send(
          JSON.stringify({
            config: {
              sample_rate: this.config.sampleRate,
              words: true,
              partial_results: true,
            },
          })
        );
        console.log(`[voice:${this.sessionId}] Connected to Vosk`);
        if (!settled) {
          settled = true;
          clearTimeout(connectTimeout);
          resolve();
        }
      });

      this.voskWs.on('message', (data: Buffer) => {
        this.handleVoskMessage(data);
      });

      this.voskWs.on('error', (err) => {
        console.error(`[voice:${this.sessionId}] Vosk error:`, err);
        if (!settled) {
          settled = true;
          clearTimeout(connectTimeout);
          reject(err);
        } else if (this.isActive) {
          this.socket.emit('voice:error', {
            message: 'Speech recognition error',
          });
        }
      });

      this.voskWs.on('close', () => {
        console.log(`[voice:${this.sessionId}] Vosk connection closed`);
        // Exponential backoff с jitter — иначе при упавшем Vosk-сервере
        // мы spammим reconnect раз в секунду. Cap 30 сек.
        if (this.isActive) {
          const delay = Math.min(
            30_000,
            1000 * 2 ** Math.min(this.reconnectAttempts, 5),
          ) + Math.floor(Math.random() * 500);
          this.reconnectAttempts += 1;
          this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            if (this.isActive) {
              this.connectToVosk()
                .then(() => {
                  this.reconnectAttempts = 0;
                })
                .catch((err) => {
                  console.error(`[voice:${this.sessionId}] Reconnect failed:`, err);
                });
            }
          }, delay);
          this.reconnectTimer.unref?.();
        }
      });
    });
  }

  private handleVoskMessage(data: Buffer): void {
    try {
      const result: VoskResult = JSON.parse(data.toString());

      if (result.partial) {
        // Partial (interim) result
        this.socket.emit('voice:transcript_partial', {
          text: result.partial,
        });
      }

      if (result.text) {
        // Final result for this utterance
        const text = result.text.trim();
        if (text) {
          this.accumulatedText += (this.accumulatedText ? ' ' : '') + text;
          this.socket.emit('voice:transcript_final', { text });

          // Voice pattern analysis (#79) — передать indicators в SessionHandler
          if (result.result && result.result.length > 0) {
            const words = result.result.map((w) => ({
              word: w.word,
              start: w.start,
              end: w.end,
              confidence: w.conf,
            }));
            const durationSec =
              words[words.length - 1].end - words[0].start;
            this.sessionHandler.handleVoiceMetrics({
              words,
              durationSec,
            });
          }
        }
      }
    } catch (err) {
      console.error(`[voice:${this.sessionId}] Failed to parse Vosk message:`, err);
    }
  }

  // -------------------------------------------------------------------------
  // Silence detection & AI processing
  // -------------------------------------------------------------------------

  private resetSilenceTimeout(): void {
    this.clearSilenceTimeout();
    this.silenceTimeout = setTimeout(() => {
      this.processSilence();
    }, this.SILENCE_THRESHOLD_MS);
  }

  private clearSilenceTimeout(): void {
    if (this.silenceTimeout) {
      clearTimeout(this.silenceTimeout);
      this.silenceTimeout = null;
    }
  }

  /**
   * Called when silence is detected after speech.
   * Processes accumulated text through AI and generates TTS response.
   * End-to-end timeout = VOICE_LOOP_TIMEOUT_MS (default 12s). Без него
   * подвисший Anthropic/Piper заблокировал бы pipeline и пациент видел бы
   * "AI печатает..." неопределённое время.
   */
  private async processSilence(): Promise<void> {
    const text = this.accumulatedText.trim();
    this.accumulatedText = '';

    // Защита от unbounded роста accumulatedText при длинной речи пациента
    // (силенс-детектор может не сработать в abreaction).
    const MAX_INPUT = 2000;
    const safeText = text.length > MAX_INPUT ? text.slice(0, MAX_INPUT) : text;

    if (!safeText || safeText.length < 2) return;

    console.log(`[voice:${this.sessionId}] Processing: "${safeText.slice(0, 80)}..."`);

    const timeoutMs = Number(process.env.VOICE_LOOP_TIMEOUT_MS) || 12_000;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(new Error('voice loop timeout')), timeoutMs);

    try {
      // Notify client that AI is thinking
      this.socket.emit('voice:ai_speaking');

      const aiPromise = this.getAiResponse(safeText);
      const aiResponse = await Promise.race([
        aiPromise,
        new Promise<string>((_, reject) =>
          ctrl.signal.addEventListener('abort', () => reject(ctrl.signal.reason)),
        ),
      ]);

      if (aiResponse) {
        const audioBuffer = await this.synthesizeSpeech(aiResponse, ctrl.signal);

        if (audioBuffer && !ctrl.signal.aborted) {
          this.socket.emit('voice:ai_audio', {
            audio: audioBuffer,
          });
        }
      }

      this.socket.emit('voice:ai_done');
    } catch (err) {
      const isTimeout =
        err instanceof Error && /timeout/i.test(err.message);
      console.error(`[voice:${this.sessionId}] Processing error:`, err);
      this.socket.emit('voice:error', {
        message: isTimeout
          ? 'Ассистент не ответил вовремя. Попробуйте сказать ещё раз.'
          : 'Failed to process voice input',
      });
      this.socket.emit('voice:ai_done');
    } finally {
      clearTimeout(timer);
    }
  }

  // -------------------------------------------------------------------------
  // AI dialogue integration
  // -------------------------------------------------------------------------

  /**
   * Get AI response for the given text.
   * Uses the session handler's voice-specific method that returns text directly.
   */
  private async getAiResponse(text: string): Promise<string> {
    return this.sessionHandler.handlePatientMessageForVoice(text);
  }

  // -------------------------------------------------------------------------
  // Piper TTS integration
  // -------------------------------------------------------------------------

  /**
   * Synthesize speech using Piper TTS.
   * Returns audio as ArrayBuffer (WAV format).
   * ВАЖНО: ВСЕГДА POST. GET-fallback с текстом в URL раньше отправлял
   * транскрипт пациента в access-logs → PHI leak.
   */
  private async synthesizeSpeech(
    text: string,
    signal?: AbortSignal,
  ): Promise<ArrayBuffer | null> {
    if (!text.trim()) return null;

    try {
      const response = await fetch(`${this.config.piperUrl}/api/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          output_format: 'wav',
        }),
        signal,
      });

      if (!response.ok) {
        throw new Error(`Piper TTS error: ${response.status}`);
      }

      return await response.arrayBuffer();
    } catch (err) {
      console.error(`[voice:${this.sessionId}] TTS error:`, err);

      // Fallback: POST на /synthesize (некоторые сборки Piper экспонируют
      // только этот эндпоинт). НЕ используем GET — это утечка PHI в логи.
      try {
        const response = await fetch(`${this.config.piperUrl}/synthesize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
          signal,
        });

        if (response.ok) {
          return await response.arrayBuffer();
        }
      } catch {
        // Ignore fallback error
      }

      return null;
    }
  }
}
