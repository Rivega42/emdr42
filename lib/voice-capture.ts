/**
 * VoiceCapture — Browser microphone capture and WebSocket streaming
 *
 * Captures audio from the browser microphone using MediaRecorder,
 * streams audio chunks to the orchestrator via Socket.io,
 * and receives transcriptions and TTS audio in return.
 */

import type { Socket } from 'socket.io-client';

export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking';

export interface VoiceEventHandlers {
  onStateChange?: (state: VoiceState) => void;
  onTranscript?: (text: string, isFinal: boolean) => void;
  onAiAudio?: (audioData: ArrayBuffer) => void;
  onError?: (error: string) => void;
}

/** Audio constraints for optimal speech recognition */
const AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  sampleRate: 16000,
  channelCount: 1,
};

/** MediaRecorder config for Vosk-compatible audio */
const RECORDER_OPTIONS: MediaRecorderOptions = {
  mimeType: 'audio/webm;codecs=opus',
  audioBitsPerSecond: 16000,
};

export class VoiceCapture {
  private socket: Socket;
  private sessionId: string;
  private mediaRecorder: MediaRecorder | null = null;
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private handlers: VoiceEventHandlers;
  private state: VoiceState = 'idle';
  private isActive = false;

  constructor(socket: Socket, sessionId: string, handlers: VoiceEventHandlers = {}) {
    this.socket = socket;
    this.sessionId = sessionId;
    this.handlers = handlers;

    this.setupSocketListeners();
  }

  /** Get current voice state */
  getState(): VoiceState {
    return this.state;
  }

  /** Check if voice capture is active */
  isListening(): boolean {
    return this.isActive && (this.state === 'listening' || this.state === 'processing');
  }

  /** Start capturing audio from microphone */
  async start(): Promise<void> {
    if (this.isActive) return;

    try {
      // Request microphone permission
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: AUDIO_CONSTRAINTS,
        video: false,
      });

      // Create AudioContext for potential audio processing
      this.audioContext = new AudioContext({ sampleRate: 16000 });

      // Setup MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      this.mediaRecorder = new MediaRecorder(this.mediaStream, {
        ...RECORDER_OPTIONS,
        mimeType,
      });

      this.mediaRecorder.ondataavailable = this.handleAudioData.bind(this);
      this.mediaRecorder.onerror = (e) => {
        console.error('[VoiceCapture] MediaRecorder error:', e);
        this.handlers.onError?.('Recording error');
        this.stop();
      };

      // Start recording with 100ms chunks for low latency
      this.mediaRecorder.start(100);
      this.isActive = true;
      this.setState('listening');

      // Notify orchestrator that voice mode is starting
      this.socket.emit('voice:start', { sessionId: this.sessionId });

      console.log('[VoiceCapture] Started capturing audio');
    } catch (err) {
      console.error('[VoiceCapture] Failed to start:', err);
      this.handlers.onError?.(
        err instanceof Error ? err.message : 'Failed to access microphone'
      );
      throw err;
    }
  }

  /** Stop capturing audio */
  stop(): void {
    if (!this.isActive) return;

    // Notify orchestrator
    this.socket.emit('voice:stop', { sessionId: this.sessionId });

    // Stop MediaRecorder
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    this.mediaRecorder = null;

    // Stop all media tracks
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    // Close AudioContext
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.isActive = false;
    this.setState('idle');

    console.log('[VoiceCapture] Stopped');
  }

  /** Pause voice input temporarily (e.g., when AI is speaking) */
  pause(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
      this.setState('speaking');
    }
  }

  /** Resume voice input */
  resume(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
      this.setState('listening');
    }
  }

  /** Cleanup resources */
  dispose(): void {
    this.stop();
    this.removeSocketListeners();
  }

  // -------------------------------------------------------------------------
  // Private methods
  // -------------------------------------------------------------------------

  private setState(newState: VoiceState): void {
    if (this.state !== newState) {
      this.state = newState;
      this.handlers.onStateChange?.(newState);
    }
  }

  private handleAudioData(event: BlobEvent): void {
    if (event.data.size > 0 && this.isActive) {
      // Convert blob to ArrayBuffer and send via socket
      event.data.arrayBuffer().then((buffer) => {
        this.socket.emit('voice:audio', {
          sessionId: this.sessionId,
          audio: buffer,
          timestamp: Date.now(),
        });
      });
    }
  }

  private setupSocketListeners(): void {
    // Partial transcription (interim results)
    this.socket.on('voice:transcript_partial', (data: { text: string }) => {
      this.handlers.onTranscript?.(data.text, false);
    });

    // Final transcription
    this.socket.on('voice:transcript_final', (data: { text: string }) => {
      this.handlers.onTranscript?.(data.text, true);
      this.setState('processing');
    });

    // AI is about to speak
    this.socket.on('voice:ai_speaking', () => {
      this.setState('speaking');
      // Pause microphone while AI speaks to avoid feedback
      this.pause();
    });

    // AI audio chunk
    this.socket.on('voice:ai_audio', (data: { audio: ArrayBuffer }) => {
      this.handlers.onAiAudio?.(data.audio);
    });

    // AI finished speaking
    this.socket.on('voice:ai_done', () => {
      if (this.isActive) {
        this.resume();
        this.setState('listening');
      }
    });

    // Voice error
    this.socket.on('voice:error', (data: { message: string }) => {
      this.handlers.onError?.(data.message);
    });
  }

  private removeSocketListeners(): void {
    this.socket.off('voice:transcript_partial');
    this.socket.off('voice:transcript_final');
    this.socket.off('voice:ai_speaking');
    this.socket.off('voice:ai_audio');
    this.socket.off('voice:ai_done');
    this.socket.off('voice:error');
  }
}

/**
 * Hook-friendly factory function
 */
export function createVoiceCapture(
  socket: Socket,
  sessionId: string,
  handlers: VoiceEventHandlers = {}
): VoiceCapture {
  return new VoiceCapture(socket, sessionId, handlers);
}
