import { EventEmitter } from 'events';
import type {
  AiProviderConfig,
  AiRouterEvent,
  AiRouterEventHandler,
  ChatMessage,
  ChatResponse,
  LlmOptions,
  LlmProvider,
  ProviderStats,
  ProviderUsageStats,
  SpeechResult,
  SttOptions,
  SttProvider,
  TranscriptionResult,
  TtsOptions,
  TtsProvider,
} from './types';

// LLM providers
import { AnthropicProvider } from './llm/anthropic-provider';
import { OpenAiLlmProvider } from './llm/openai-provider';
import { OllamaProvider } from './llm/ollama-provider';

// STT providers
import { DeepgramProvider } from './stt/deepgram-provider';
import { OpenAiWhisperProvider } from './stt/openai-whisper-provider';
import { FasterWhisperProvider } from './stt/faster-whisper-provider';

// TTS providers
import { ElevenLabsProvider } from './tts/elevenlabs-provider';
import { OpenAiTtsProvider } from './tts/openai-tts-provider';
import { PiperProvider } from './tts/piper-provider';

const LLM_FACTORIES: Record<
  string,
  (config: any) => LlmProvider
> = {
  anthropic: (c) => new AnthropicProvider(c),
  openai: (c) => new OpenAiLlmProvider(c),
  ollama: (c) => new OllamaProvider(c),
};

const STT_FACTORIES: Record<
  string,
  (config: any) => SttProvider
> = {
  deepgram: (c) => new DeepgramProvider(c),
  'openai-whisper': (c) => new OpenAiWhisperProvider(c),
  'faster-whisper': (c) => new FasterWhisperProvider(c),
};

const TTS_FACTORIES: Record<
  string,
  (config: any) => TtsProvider
> = {
  elevenlabs: (c) => new ElevenLabsProvider(c),
  'openai-tts': (c) => new OpenAiTtsProvider(c),
  piper: (c) => new PiperProvider(c),
};

function createEmptyStats(): ProviderStats {
  return {
    requests: 0,
    errors: 0,
    totalTokens: 0,
    avgLatencyMs: 0,
    lastUsed: null,
  };
}

export class AiRouter {
  private llmProviders: Map<string, LlmProvider> = new Map();
  private sttProviders: Map<string, SttProvider> = new Map();
  private ttsProviders: Map<string, TtsProvider> = new Map();
  private config: AiProviderConfig;
  private emitter = new EventEmitter();
  private stats: ProviderUsageStats = { llm: {}, stt: {}, tts: {} };

  constructor(config: AiProviderConfig) {
    this.config = structuredClone(config);
  }

  /** Initialize all providers from config */
  async initialize(): Promise<void> {
    // LLM
    for (const [name, providerConfig] of Object.entries(
      this.config.llm.providers
    )) {
      const factory = LLM_FACTORIES[name];
      if (factory) {
        this.llmProviders.set(name, factory(providerConfig));
        this.stats.llm[name] = createEmptyStats();
      }
    }

    // STT
    for (const [name, providerConfig] of Object.entries(
      this.config.stt.providers
    )) {
      const factory = STT_FACTORIES[name];
      if (factory) {
        this.sttProviders.set(name, factory(providerConfig));
        this.stats.stt[name] = createEmptyStats();
      }
    }

    // TTS
    for (const [name, providerConfig] of Object.entries(
      this.config.tts.providers
    )) {
      const factory = TTS_FACTORIES[name];
      if (factory) {
        this.ttsProviders.set(name, factory(providerConfig));
        this.stats.tts[name] = createEmptyStats();
      }
    }
  }

  // ---- Provider access ----

  getLlm(): LlmProvider {
    return this.getProviderOrThrow(
      this.llmProviders,
      this.config.llm.primary,
      'LLM'
    );
  }

  getStt(): SttProvider {
    return this.getProviderOrThrow(
      this.sttProviders,
      this.config.stt.primary,
      'STT'
    );
  }

  getTts(): TtsProvider {
    return this.getProviderOrThrow(
      this.ttsProviders,
      this.config.tts.primary,
      'TTS'
    );
  }

  getLlmProvider(name: string): LlmProvider | undefined {
    return this.llmProviders.get(name);
  }

  getSttProvider(name: string): SttProvider | undefined {
    return this.sttProviders.get(name);
  }

  getTtsProvider(name: string): TtsProvider | undefined {
    return this.ttsProviders.get(name);
  }

  // ---- High-level methods with fallback ----

  async chat(
    messages: ChatMessage[],
    options?: LlmOptions
  ): Promise<ChatResponse> {
    return this.withFallback(
      'llm',
      this.llmProviders,
      this.config.llm,
      async (provider: LlmProvider) => {
        this.emit('llm:request', { provider: provider.name, messages });
        const response = await provider.chat(messages, options);
        this.recordLlmUsage(provider.name, response);
        this.emit('llm:response', {
          provider: provider.name,
          response,
        });
        return response;
      }
    );
  }

  async *chatStream(
    messages: ChatMessage[],
    options?: LlmOptions
  ): AsyncGenerator<string> {
    const primary = this.llmProviders.get(this.config.llm.primary);
    const fallback = this.config.llm.fallback
      ? this.llmProviders.get(this.config.llm.fallback)
      : undefined;

    const provider = primary ?? fallback;
    if (!provider) {
      throw new Error('No LLM provider available for streaming');
    }

    this.emit('llm:request', {
      provider: provider.name,
      messages,
      streaming: true,
    });

    try {
      yield* provider.chatStream(messages, options);
    } catch (error) {
      this.recordError('llm', provider.name);
      this.emit('llm:error', { provider: provider.name, error });

      if (fallback && provider !== fallback) {
        this.emit('llm:fallback', {
          from: provider.name,
          to: fallback.name,
        });
        yield* fallback.chatStream(messages, options);
      } else {
        throw error;
      }
    }
  }

  async transcribe(
    audio: Buffer,
    options?: SttOptions
  ): Promise<TranscriptionResult> {
    return this.withFallback(
      'stt',
      this.sttProviders,
      this.config.stt,
      async (provider: SttProvider) => {
        this.emit('stt:request', { provider: provider.name });
        const result = await provider.transcribe(audio, options);
        this.recordRequest('stt', provider.name, 0);
        this.emit('stt:response', { provider: provider.name, result });
        return result;
      }
    );
  }

  async synthesize(
    text: string,
    options?: TtsOptions
  ): Promise<SpeechResult> {
    return this.withFallback(
      'tts',
      this.ttsProviders,
      this.config.tts,
      async (provider: TtsProvider) => {
        this.emit('tts:request', { provider: provider.name, text });
        const result = await provider.synthesize(text, options);
        this.recordRequest('tts', provider.name, 0);
        this.emit('tts:response', { provider: provider.name, result });
        return result;
      }
    );
  }

  // ---- Health & stats ----

  async healthCheck(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    const checks: Promise<void>[] = [];

    const checkProvider = async (
      prefix: string,
      name: string,
      provider: { isAvailable(): Promise<boolean> }
    ) => {
      try {
        results[`${prefix}:${name}`] = await provider.isAvailable();
      } catch {
        results[`${prefix}:${name}`] = false;
      }
    };

    for (const [name, p] of this.llmProviders) {
      checks.push(checkProvider('llm', name, p));
    }
    for (const [name, p] of this.sttProviders) {
      checks.push(checkProvider('stt', name, p));
    }
    for (const [name, p] of this.ttsProviders) {
      checks.push(checkProvider('tts', name, p));
    }

    await Promise.allSettled(checks);
    return results;
  }

  updateConfig(config: Partial<AiProviderConfig>): void {
    if (config.llm) {
      Object.assign(this.config.llm, config.llm);
    }
    if (config.stt) {
      Object.assign(this.config.stt, config.stt);
    }
    if (config.tts) {
      Object.assign(this.config.tts, config.tts);
    }
  }

  getUsageStats(): ProviderUsageStats {
    return structuredClone(this.stats);
  }

  // ---- Events ----

  on(event: AiRouterEvent, handler: AiRouterEventHandler): void {
    this.emitter.on(event, (data) => handler(event, data));
  }

  off(event: AiRouterEvent, handler: (...args: any[]) => void): void {
    this.emitter.off(event, handler);
  }

  // ---- Private helpers ----

  private emit(event: AiRouterEvent, data: any): void {
    this.emitter.emit(event, data);
  }

  private getProviderOrThrow<T>(
    map: Map<string, T>,
    name: string,
    kind: string
  ): T {
    const provider = map.get(name);
    if (!provider) {
      throw new Error(`${kind} provider "${name}" not found`);
    }
    return provider;
  }

  private async withFallback<TProvider, TResult>(
    kind: 'llm' | 'stt' | 'tts',
    providers: Map<string, TProvider>,
    layerConfig: { primary: string; fallback?: string },
    fn: (provider: TProvider) => Promise<TResult>
  ): Promise<TResult> {
    const primary = providers.get(layerConfig.primary);

    if (primary) {
      try {
        return await fn(primary);
      } catch (error) {
        this.recordError(kind, layerConfig.primary);
        this.emit(`${kind}:error` as AiRouterEvent, {
          provider: layerConfig.primary,
          error,
        });

        if (layerConfig.fallback) {
          const fallback = providers.get(layerConfig.fallback);
          if (fallback) {
            this.emit(`${kind}:fallback` as AiRouterEvent, {
              from: layerConfig.primary,
              to: layerConfig.fallback,
            });
            return fn(fallback);
          }
        }
        throw error;
      }
    }

    // Primary not found — try fallback directly
    if (layerConfig.fallback) {
      const fallback = providers.get(layerConfig.fallback);
      if (fallback) return fn(fallback);
    }

    throw new Error(
      `No ${kind.toUpperCase()} provider available (primary: ${layerConfig.primary})`
    );
  }

  private recordLlmUsage(name: string, response: ChatResponse): void {
    const stats = this.stats.llm[name] ?? createEmptyStats();
    const totalRequests = stats.requests + 1;
    stats.avgLatencyMs =
      (stats.avgLatencyMs * stats.requests + response.latencyMs) /
      totalRequests;
    stats.requests = totalRequests;
    stats.totalTokens +=
      response.usage.promptTokens + response.usage.completionTokens;
    stats.lastUsed = Date.now();
    this.stats.llm[name] = stats;
  }

  private recordRequest(
    kind: 'stt' | 'tts',
    name: string,
    latencyMs: number
  ): void {
    const statsMap = this.stats[kind];
    const stats = statsMap[name] ?? createEmptyStats();
    const totalRequests = stats.requests + 1;
    stats.avgLatencyMs =
      (stats.avgLatencyMs * stats.requests + latencyMs) / totalRequests;
    stats.requests = totalRequests;
    stats.lastUsed = Date.now();
    statsMap[name] = stats;
  }

  private recordError(kind: 'llm' | 'stt' | 'tts', name: string): void {
    const statsMap = this.stats[kind];
    const stats = statsMap[name] ?? createEmptyStats();
    stats.errors += 1;
    statsMap[name] = stats;
  }
}
