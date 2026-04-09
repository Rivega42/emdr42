import type {
  TtsProvider,
  TtsOptions,
  SpeechResult,
  VoiceInfo,
} from '../types';

export interface ElevenLabsProviderConfig {
  apiKey: string;
  voiceId?: string;
  model?: string;
}

const ELEVENLABS_API = 'https://api.elevenlabs.io/v1';

// Rachel — a warm, calm voice well-suited for therapeutic contexts
const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM';

export class ElevenLabsProvider implements TtsProvider {
  readonly name = 'elevenlabs';
  private apiKey: string;
  private defaultVoiceId: string;
  private defaultModel: string;

  constructor(config: ElevenLabsProviderConfig) {
    this.apiKey = config.apiKey;
    this.defaultVoiceId = config.voiceId ?? DEFAULT_VOICE_ID;
    this.defaultModel = config.model ?? 'eleven_multilingual_v2';
  }

  async synthesize(
    text: string,
    options?: TtsOptions
  ): Promise<SpeechResult> {
    const voiceId = options?.voice ?? this.defaultVoiceId;
    const format = options?.format ?? 'mp3';

    const response = await fetch(
      `${ELEVENLABS_API}/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
          Accept: this.mimeType(format),
        },
        body: JSON.stringify({
          text,
          model_id: this.defaultModel,
          voice_settings: {
            stability: 0.7,
            similarity_boost: 0.8,
            speed: options?.speed ?? 1.0,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(
        `ElevenLabs API error: ${response.status} ${response.statusText}`
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const audio = Buffer.from(arrayBuffer);

    return {
      audio,
      format,
      durationMs: 0, // ElevenLabs doesn't return duration in the response
      sampleRate: format === 'pcm' ? 24000 : 44100,
    };
  }

  async *synthesizeStream(
    text: string,
    options?: TtsOptions
  ): AsyncGenerator<Buffer> {
    const voiceId = options?.voice ?? this.defaultVoiceId;

    const response = await fetch(
      `${ELEVENLABS_API}/text-to-speech/${voiceId}/stream`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: this.defaultModel,
          voice_settings: {
            stability: 0.7,
            similarity_boost: 0.8,
            speed: options?.speed ?? 1.0,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(
        `ElevenLabs streaming error: ${response.status} ${response.statusText}`
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
    const response = await fetch(`${ELEVENLABS_API}/voices`, {
      headers: { 'xi-api-key': this.apiKey },
    });

    if (!response.ok) {
      throw new Error(
        `ElevenLabs voices error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    return (data.voices ?? []).map(
      (v: {
        voice_id: string;
        name: string;
        labels?: { language?: string; gender?: string };
        preview_url?: string;
      }) => ({
        id: v.voice_id,
        name: v.name,
        language: v.labels?.language ?? 'en',
        gender: (v.labels?.gender as 'male' | 'female' | 'neutral') ?? 'neutral',
        preview_url: v.preview_url,
      })
    );
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${ELEVENLABS_API}/voices`, {
        headers: { 'xi-api-key': this.apiKey },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private mimeType(format: string): string {
    switch (format) {
      case 'mp3':
        return 'audio/mpeg';
      case 'wav':
        return 'audio/wav';
      case 'opus':
        return 'audio/opus';
      case 'pcm':
        return 'audio/pcm';
      default:
        return 'audio/mpeg';
    }
  }
}
