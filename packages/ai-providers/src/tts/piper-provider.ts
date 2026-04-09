import type {
  TtsProvider,
  TtsOptions,
  SpeechResult,
  VoiceInfo,
} from '../types';

export interface PiperProviderConfig {
  baseUrl?: string;
  voice?: string;
}

const DEFAULT_BASE_URL = 'http://localhost:5000';

export class PiperProvider implements TtsProvider {
  readonly name = 'piper';
  private baseUrl: string;
  private defaultVoice: string;

  constructor(config: PiperProviderConfig = {}) {
    this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
    this.defaultVoice = config.voice ?? 'en_US-lessac-medium';
  }

  async synthesize(
    text: string,
    options?: TtsOptions
  ): Promise<SpeechResult> {
    const voice = options?.voice ?? this.defaultVoice;
    const format = options?.format ?? 'wav';

    const response = await fetch(`${this.baseUrl}/api/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        voice,
        speed: options?.speed ?? 1.0,
        output_format: format,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Piper TTS error: ${response.status} ${response.statusText}`
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const audio = Buffer.from(arrayBuffer);

    return {
      audio,
      format,
      durationMs: 0,
      sampleRate: 22050,
    };
  }

  async *synthesizeStream(
    text: string,
    options?: TtsOptions
  ): AsyncGenerator<Buffer> {
    const voice = options?.voice ?? this.defaultVoice;

    const response = await fetch(`${this.baseUrl}/api/tts/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        voice,
        speed: options?.speed ?? 1.0,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Piper TTS streaming error: ${response.status} ${response.statusText}`
      );
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        yield Buffer.from(value);
      }
    } finally {
      reader.releaseLock();
    }
  }

  async getVoices(): Promise<VoiceInfo[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/voices`);
      if (!response.ok) return [];

      const data = await response.json();
      return (data.voices ?? []).map(
        (v: { id: string; name: string; language?: string; gender?: string }) => ({
          id: v.id,
          name: v.name,
          language: v.language ?? 'en',
          gender: (v.gender as 'male' | 'female' | 'neutral') ?? 'neutral',
        })
      );
    } catch {
      return [];
    }
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
