// Types
export type {
  LlmProvider,
  ChatMessage,
  ChatResponse,
  LlmOptions,
  SttProvider,
  SttOptions,
  TranscriptionResult,
  TranscriptionChunk,
  TtsProvider,
  TtsOptions,
  SpeechResult,
  VoiceInfo,
  AiProviderConfig,
  ProviderUsageStats,
  ProviderStats,
  AiRouterEvent,
  AiRouterEventHandler,
} from './types';

// Router + reliability
export { AiRouter } from './router';
export type { RouterReliabilityOptions } from './router';
export {
  CircuitBreaker,
  CircuitOpenError,
  CircuitTimeoutError,
  withRetry,
} from './circuit-breaker';
export type { CircuitState, CircuitBreakerOptions } from './circuit-breaker';

// Config
export { DEFAULT_CONFIG } from './config';

// Cost tracking (#130)
export { calculateCostUsd, LLM_PRICES, TTS_PRICES, STT_PRICES } from './pricing';
export type { LlmPricing, TtsPricing, SttPricing, UsageCostInput } from './pricing';

// PII redaction & prompt armor (#128)
export { redactPii } from './pii-redactor';
export type { RedactionOptions } from './pii-redactor';
export {
  analyzeForInjection,
  wrapUserMessage,
  THERAPIST_ARMOR_PREAMBLE,
} from './prompt-armor';
export type { InjectionAnalysis } from './prompt-armor';

// LLM providers
export { AnthropicProvider } from './llm/anthropic-provider';
export type { AnthropicProviderConfig } from './llm/anthropic-provider';
export { OpenAiLlmProvider } from './llm/openai-provider';
export type { OpenAiLlmProviderConfig } from './llm/openai-provider';
export { OllamaProvider } from './llm/ollama-provider';
export type { OllamaProviderConfig } from './llm/ollama-provider';

// STT providers
export { DeepgramProvider } from './stt/deepgram-provider';
export type { DeepgramProviderConfig } from './stt/deepgram-provider';
export { OpenAiWhisperProvider } from './stt/openai-whisper-provider';
export type { OpenAiWhisperProviderConfig } from './stt/openai-whisper-provider';
export { FasterWhisperProvider } from './stt/faster-whisper-provider';
export type { FasterWhisperProviderConfig } from './stt/faster-whisper-provider';

// TTS providers
export { ElevenLabsProvider } from './tts/elevenlabs-provider';
export type { ElevenLabsProviderConfig } from './tts/elevenlabs-provider';
export { OpenAiTtsProvider } from './tts/openai-tts-provider';
export type { OpenAiTtsProviderConfig } from './tts/openai-tts-provider';
export { PiperProvider } from './tts/piper-provider';
export type { PiperProviderConfig } from './tts/piper-provider';
