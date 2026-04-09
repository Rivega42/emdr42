import type {
  SttProvider,
  SttOptions,
  TranscriptionResult,
  TranscriptionChunk,
} from '../types';

export interface FasterWhisperProviderConfig {
  baseUrl?: string;
  model?: string;
}

const DEFAULT_BASE_URL = 'http://localhost:8080';

export class FasterWhisperProvider implements SttProvider {
  readonly name = 'faster-whisper';
  private baseUrl: string;
  private defaultModel: string;

  constructor(config: FasterWhisperProviderConfig = {}) {
    this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
    this.defaultModel = config.model ?? 'large-v3';
  }

  async transcribe(
    audio: Buffer,
    options?: SttOptions
  ): Promise<TranscriptionResult> {
    const formData = new FormData();
    formData.append(
      'file',
      new Blob([new Uint8Array(audio)], { type: 'audio/wav' }),
      'audio.wav'
    );
    formData.append('model', options?.model ?? this.defaultModel);

    if (options?.language) {
      formData.append('language', options.language);
    }

    const response = await fetch(`${this.baseUrl}/v1/audio/transcriptions`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(
        `Faster-Whisper API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    return {
      text: data.text ?? '',
      language: data.language ?? options?.language ?? 'en',
      confidence: data.confidence ?? 0.95,
      durationMs: (data.duration ?? 0) * 1000,
      words: data.words?.map(
        (w: { word: string; start: number; end: number; confidence: number }) => ({
          word: w.word,
          start: w.start,
          end: w.end,
          confidence: w.confidence,
        })
      ),
    };
  }

  async *transcribeStream(
    _audioStream: ReadableStream,
    _options?: SttOptions
  ): AsyncGenerator<TranscriptionChunk> {
    // Faster-Whisper streaming depends on the specific server implementation.
    throw new Error(
      'Faster-Whisper streaming requires WebSocket support. ' +
        'Use transcribe() for batch processing.'
    );
    yield undefined as never;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}
