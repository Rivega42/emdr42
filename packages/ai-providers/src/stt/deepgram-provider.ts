import type {
  SttProvider,
  SttOptions,
  TranscriptionResult,
  TranscriptionChunk,
} from '../types';

export interface DeepgramProviderConfig {
  apiKey: string;
  model?: string;
}

const DEEPGRAM_API = 'https://api.deepgram.com/v1';

export class DeepgramProvider implements SttProvider {
  readonly name = 'deepgram';
  private apiKey: string;
  private defaultModel: string;

  constructor(config: DeepgramProviderConfig) {
    this.apiKey = config.apiKey;
    this.defaultModel = config.model ?? 'nova-2';
  }

  async transcribe(
    audio: Buffer,
    options?: SttOptions
  ): Promise<TranscriptionResult> {
    const params = new URLSearchParams({
      model: options?.model ?? this.defaultModel,
      punctuate: 'true',
      utterances: 'true',
    });

    if (options?.language) {
      params.set('language', options.language);
    }
    if (options?.sampleRate) {
      params.set('sample_rate', String(options.sampleRate));
    }

    const response = await fetch(
      `${DEEPGRAM_API}/listen?${params.toString()}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Token ${this.apiKey}`,
          'Content-Type': 'audio/wav',
        },
        body: new Uint8Array(audio),
      }
    );

    if (!response.ok) {
      throw new Error(
        `Deepgram API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    const result = data.results?.channels?.[0]?.alternatives?.[0];

    return {
      text: result?.transcript ?? '',
      language:
        data.results?.channels?.[0]?.detected_language ??
        options?.language ??
        'en',
      confidence: result?.confidence ?? 0,
      durationMs: (data.metadata?.duration ?? 0) * 1000,
      words: result?.words?.map(
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
    // Deepgram streaming uses WebSocket at wss://api.deepgram.com/v1/listen
    // Full implementation requires a WebSocket client in the runtime environment.
    // This is a placeholder that yields nothing — implement with ws or native WebSocket.
    throw new Error(
      'Deepgram streaming transcription requires WebSocket support. ' +
        'Use transcribe() for batch processing.'
    );
    // TypeScript requires yield for AsyncGenerator return type
    yield undefined as never;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${DEEPGRAM_API}/projects`, {
        headers: { Authorization: `Token ${this.apiKey}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
