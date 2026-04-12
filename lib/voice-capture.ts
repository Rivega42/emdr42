/**
 * VoiceCapture — захват микрофона и стриминг аудио через WebSocket.
 *
 * Поток: Микрофон → MediaRecorder → WebSocket → Orchestrator (Vosk STT)
 *
 * Использование:
 *   const vc = new VoiceCapture(socket);
 *   await vc.start();
 *   vc.onTranscript((text, isFinal) => { ... });
 *   vc.stop();
 */

import type { Socket } from 'socket.io-client';

export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking';

interface VoiceCaptureOptions {
  /** Интервал отправки аудио-чанков (мс) */
  chunkInterval?: number;
  /** MIME-тип записи */
  mimeType?: string;
}

export class VoiceCapture {
  private socket: Socket;
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private transcriptCallback?: (text: string, isFinal: boolean) => void;
  private stateCallback?: (state: VoiceState) => void;
  private audioResponseCallback?: (audioData: ArrayBuffer) => void;
  private options: Required<VoiceCaptureOptions>;

  constructor(socket: Socket, options: VoiceCaptureOptions = {}) {
    this.socket = socket;
    this.options = {
      chunkInterval: options.chunkInterval ?? 250,
      mimeType: options.mimeType ?? 'audio/webm;codecs=opus',
    };

    this.setupSocketListeners();
  }

  private setupSocketListeners(): void {
    // Транскрипция от Vosk STT
    this.socket.on('voice:transcript', (data: { text: string; isFinal: boolean }) => {
      this.transcriptCallback?.(data.text, data.isFinal);
    });

    // Изменение состояния pipeline
    this.socket.on('voice:state', (data: { state: VoiceState }) => {
      this.stateCallback?.(data.state);
    });

    // Аудио-ответ от Piper TTS
    this.socket.on('voice:audio_response', (data: ArrayBuffer) => {
      this.audioResponseCallback?.(data);
    });
  }

  /** Начать запись и стриминг */
  async start(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 16000,
      },
    });

    const mimeType = MediaRecorder.isTypeSupported(this.options.mimeType)
      ? this.options.mimeType
      : 'audio/webm';

    this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        event.data.arrayBuffer().then((buffer) => {
          this.socket.emit('voice:audio_chunk', buffer);
        });
      }
    };

    this.mediaRecorder.start(this.options.chunkInterval);
    this.socket.emit('voice:start');
    this.stateCallback?.('listening');
  }

  /** Остановить запись */
  stop(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.mediaRecorder = null;
    this.socket.emit('voice:stop');
    this.stateCallback?.('idle');
  }

  /** Подписка на транскрипцию */
  onTranscript(callback: (text: string, isFinal: boolean) => void): void {
    this.transcriptCallback = callback;
  }

  /** Подписка на изменение состояния */
  onStateChange(callback: (state: VoiceState) => void): void {
    this.stateCallback = callback;
  }

  /** Подписка на аудио-ответ */
  onAudioResponse(callback: (audioData: ArrayBuffer) => void): void {
    this.audioResponseCallback = callback;
  }

  /** Проверка активности записи */
  get isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }

  /** Очистка ресурсов */
  dispose(): void {
    this.stop();
    this.socket.off('voice:transcript');
    this.socket.off('voice:state');
    this.socket.off('voice:audio_response');
  }
}
