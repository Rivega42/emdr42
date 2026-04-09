// ========== LLM ==========

export interface LlmProvider {
  name: string;

  /** Chat completion */
  chat(messages: ChatMessage[], options?: LlmOptions): Promise<ChatResponse>;

  /** Streaming chat */
  chatStream(
    messages: ChatMessage[],
    options?: LlmOptions
  ): AsyncGenerator<string>;

  /** Check availability */
  isAvailable(): Promise<boolean>;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  content: string;
  usage: { promptTokens: number; completionTokens: number };
  model: string;
  latencyMs: number;
}

export interface LlmOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

// ========== STT ==========

export interface SttProvider {
  name: string;

  /** Transcribe audio buffer */
  transcribe(
    audio: Buffer,
    options?: SttOptions
  ): Promise<TranscriptionResult>;

  /** Streaming transcription (for real-time) */
  transcribeStream(
    audioStream: ReadableStream,
    options?: SttOptions
  ): AsyncGenerator<TranscriptionChunk>;

  isAvailable(): Promise<boolean>;
}

export interface SttOptions {
  language?: string;
  model?: string;
  sampleRate?: number;
}

export interface TranscriptionResult {
  text: string;
  language: string;
  confidence: number;
  durationMs: number;
  words?: { word: string; start: number; end: number; confidence: number }[];
}

export interface TranscriptionChunk {
  text: string;
  isFinal: boolean;
  confidence: number;
}

// ========== TTS ==========

export interface TtsProvider {
  name: string;

  /** Generate speech */
  synthesize(text: string, options?: TtsOptions): Promise<SpeechResult>;

  /** Streaming synthesis */
  synthesizeStream(
    text: string,
    options?: TtsOptions
  ): AsyncGenerator<Buffer>;

  /** List available voices */
  getVoices(): Promise<VoiceInfo[]>;

  isAvailable(): Promise<boolean>;
}

export interface TtsOptions {
  voice?: string;
  speed?: number; // 0.5-2.0
  language?: string;
  format?: 'mp3' | 'wav' | 'opus' | 'pcm';
}

export interface SpeechResult {
  audio: Buffer;
  format: string;
  durationMs: number;
  sampleRate: number;
}

export interface VoiceInfo {
  id: string;
  name: string;
  language: string;
  gender: 'male' | 'female' | 'neutral';
  preview_url?: string;
}

// ========== Router Config ==========

export interface AiProviderConfig {
  llm: {
    primary: string;
    fallback?: string;
    providers: Record<string, any>;
  };
  stt: {
    primary: string;
    fallback?: string;
    providers: Record<string, any>;
  };
  tts: {
    primary: string;
    fallback?: string;
    providers: Record<string, any>;
  };
}

// ========== Usage Stats ==========

export interface ProviderUsageStats {
  llm: Record<string, ProviderStats>;
  stt: Record<string, ProviderStats>;
  tts: Record<string, ProviderStats>;
}

export interface ProviderStats {
  requests: number;
  errors: number;
  totalTokens: number;
  avgLatencyMs: number;
  lastUsed: number | null;
}

// ========== Events ==========

export type AiRouterEvent =
  | 'llm:request'
  | 'llm:response'
  | 'llm:error'
  | 'llm:fallback'
  | 'stt:request'
  | 'stt:response'
  | 'stt:error'
  | 'stt:fallback'
  | 'tts:request'
  | 'tts:response'
  | 'tts:error'
  | 'tts:fallback';

export type AiRouterEventHandler = (event: AiRouterEvent, data: any) => void;
