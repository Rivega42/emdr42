import OpenAI from 'openai';
import type {
  SttProvider,
  SttOptions,
  TranscriptionResult,
  TranscriptionChunk,
} from '../types';

export interface OpenAiWhisperProviderConfig {
  apiKey: string;
  model?: string;
}

export class OpenAiWhisperProvider implements SttProvider {
  readonly name = 'openai-whisper';
  private client: OpenAI;
  private defaultModel: string;

  constructor(config: OpenAiWhisperProviderConfig) {
    this.client = new OpenAI({ apiKey: config.apiKey });
    this.defaultModel = config.model ?? 'whisper-1';
  }

  async transcribe(
    audio: Buffer,
    options?: SttOptions
  ): Promise<TranscriptionResult> {
    const start = Date.now();

    // OpenAI expects a File-like object
    const file = new File([new Uint8Array(audio)], 'audio.wav', {
      type: 'audio/wav',
    });

    const response = await this.client.audio.transcriptions.create({
      model: options?.model ?? this.defaultModel,
      file,
      language: options?.language,
      response_format: 'verbose_json',
      timestamp_granularities: ['word'],
    });

    const elapsed = Date.now() - start;

    return {
      text: response.text,
      language: (response as any).language ?? options?.language ?? 'en',
      confidence: 1.0, // Whisper API doesn't return confidence
      durationMs: ((response as any).duration ?? 0) * 1000,
      words: (response as any).words?.map(
        (w: { word: string; start: number; end: number }) => ({
          word: w.word,
          start: w.start,
          end: w.end,
          confidence: 1.0,
        })
      ),
    };
  }

  async *transcribeStream(
    _audioStream: ReadableStream,
    _options?: SttOptions
  ): AsyncGenerator<TranscriptionChunk> {
    // OpenAI Whisper API does not support streaming transcription.
    throw new Error(
      'OpenAI Whisper API does not support streaming. Use transcribe() instead.'
    );
    yield undefined as never;
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.client.models.retrieve('whisper-1');
      return true;
    } catch {
      return false;
    }
  }
}
