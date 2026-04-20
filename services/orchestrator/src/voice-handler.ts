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

    if (this.voskWs) {
      // Send EOF to Vosk
      this.voskWs.send(JSON.stringify({ eof: 1 }));
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

      this.voskWs = new WebSocket(wsUrl);

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
        resolve();
      });

      this.voskWs.on('message', (data: Buffer) => {
        this.handleVoskMessage(data);
      });

      this.voskWs.on('error', (err) => {
        console.error(`[voice:${this.sessionId}] Vosk error:`, err);
        if (!this.isActive) {
          reject(err);
        } else {
          this.socket.emit('voice:error', {
            message: 'Speech recognition error',
          });
        }
      });

      this.voskWs.on('close', () => {
        console.log(`[voice:${this.sessionId}] Vosk connection closed`);
        if (this.isActive) {
          // Attempt to reconnect
          setTimeout(() => {
            if (this.isActive) {
              this.connectToVosk().catch((err) => {
                console.error(`[voice:${this.sessionId}] Reconnect failed:`, err);
              });
            }
          }, 1000);
        }
      });

      // Timeout for initial connection
      setTimeout(() => {
        if (this.voskWs?.readyState !== WebSocket.OPEN) {
          reject(new Error('Vosk connection timeout'));
        }
      }, 5000);
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
   */
  private async processSilence(): Promise<void> {
    const text = this.accumulatedText.trim();
    this.accumulatedText = '';

    if (!text || text.length < 2) return;

    console.log(`[voice:${this.sessionId}] Processing: "${text}"`);

    try {
      // Notify client that AI is thinking
      this.socket.emit('voice:ai_speaking');

      // Get AI response using the existing session handler
      // This reuses the existing handlePatientMessage logic
      const aiResponse = await this.getAiResponse(text);

      if (aiResponse) {
        // Generate TTS audio
        const audioBuffer = await this.synthesizeSpeech(aiResponse);

        if (audioBuffer) {
          // Send audio to client
          this.socket.emit('voice:ai_audio', {
            audio: audioBuffer,
          });
        }
      }

      // Notify client that AI is done speaking
      this.socket.emit('voice:ai_done');
    } catch (err) {
      console.error(`[voice:${this.sessionId}] Processing error:`, err);
      this.socket.emit('voice:error', {
        message: 'Failed to process voice input',
      });
      this.socket.emit('voice:ai_done');
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
   */
  private async synthesizeSpeech(text: string): Promise<ArrayBuffer | null> {
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
      });

      if (!response.ok) {
        throw new Error(`Piper TTS error: ${response.status}`);
      }

      return await response.arrayBuffer();
    } catch (err) {
      console.error(`[voice:${this.sessionId}] TTS error:`, err);

      // Fallback: Try alternative Piper endpoint format
      try {
        const response = await fetch(
          `${this.config.piperUrl}/synthesize?text=${encodeURIComponent(text)}`,
          { method: 'GET' }
        );

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
