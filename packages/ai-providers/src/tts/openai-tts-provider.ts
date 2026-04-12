import OpenAI from 'openai';
import type {
  TtsProvider,
  TtsOptions,
  SpeechResult,
  VoiceInfo,
} from '../types';

export interface OpenAiTtsProviderConfig {
  apiKey: string;
  voice?: string;
}

type OpenAiVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

const AVAILABLE_VOICES: VoiceInfo[] = [
  { id: 'alloy', name: 'Alloy', language: 'en', gender: 'neutral' },
  { id: 'echo', name: 'Echo', language: 'en', gender: 'male' },
  { id: 'fable', name: 'Fable', language: 'en', gender: 'neutral' },
  { id: 'onyx', name: 'Onyx', language: 'en', gender: 'male' },
  { id: 'nova', name: 'Nova', language: 'en', gender: 'female' },
  { id: 'shimmer', name: 'Shimmer', language: 'en', gender: 'female' },
];

export class OpenAiTtsProvider implements TtsProvider {
  readonly name = 'openai-tts';
  private client: OpenAI;
  private defaultVoice: OpenAiVoice;

  constructor(config: OpenAiTtsProviderConfig) {
    this.client = new OpenAI({ apiKey: config.apiKey });
    this.defaultVoice = (config.voice as OpenAiVoice) ?? 'nova';
  }

  async synthesize(
    text: string,
    options?: TtsOptions
  ): Promise<SpeechResult> {
    const format = options?.format ?? 'mp3';
    const voice = (options?.voice as OpenAiVoice) ?? this.defaultVoice;

    const response = await this.client.audio.speech.create({
      model: 'tts-1',
      voice,
      input: text,
      response_format: format === 'wav' ? 'wav' : format === 'opus' ? 'opus' : 'mp3',
      speed: options?.speed ?? 1.0,
    });

    const arrayBuffer = await response.arrayBuffer();
    const audio = Buffer.from(arrayBuffer);

    return {
      audio,
      format,
      durationMs: 0, // OpenAI TTS doesn't return duration
      sampleRate: 24000,
    };
  }

  async *synthesizeStream(
    text: string,
    options?: TtsOptions
  ): AsyncGenerator<Buffer> {
    const format = options?.format ?? 'mp3';
    const voice = (options?.voice as OpenAiVoice) ?? this.defaultVoice;

    const response = await this.client.audio.speech.create({
      model: 'tts-1',
      voice,
      input: text,
      response_format: format === 'wav' ? 'wav' : format === 'opus' ? 'opus' : 'mp3',
      speed: options?.speed ?? 1.0,
    });

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
    return AVAILABLE_VOICES;
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.client.models.list();
      return true;
    } catch {
      return false;
    }
  }
}
