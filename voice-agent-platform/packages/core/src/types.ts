/**
 * Конфигурация агента — паритет с ElevenLabs Agents.
 * См. docs/REQUIREMENTS.md, матрица фич.
 */

export interface AgentConfig {
  id: string;
  name: string;
  /** System prompt. Поддерживает {{variables}} (паритет: dynamic variables). */
  systemPrompt: string;
  /** Реплика агента при старте сессии (если задана — агент говорит первым). */
  firstMessage?: string;
  /** BCP-47, напр. 'ru-RU', 'en-US'. Влияет на STT и TTS. */
  language: string;
  voice: VoiceConfig;
  backend: BackendConfig;
  turnTaking?: TurnTakingConfig;
  tools?: ToolConfig[];
  /** Значения для подстановки в systemPrompt/firstMessage. */
  variables?: Record<string, string>;
}

export interface VoiceConfig {
  /** Идентификатор TTS-адаптера: 'piper' | 'elevenlabs' | 'openai' | ... */
  provider: string;
  voiceId: string;
  /** 0.5..2.0, по умолчанию 1.0 */
  speed?: number;
}

/**
 * Мозг агента. Ключевое отличие от 11labs — вариант 'openclaw':
 * агентом выступает self-hosted OpenClaw-инстанс с его памятью и тулами.
 */
export type BackendConfig =
  | {
      type: 'llm';
      /** Идентификатор LLM-адаптера: 'claude' | 'openai' | 'local' | ... */
      provider: string;
      model: string;
      temperature?: number;
    }
  | {
      type: 'openclaw';
      /** WebSocket URL gateway-инстанса. */
      url: string;
      token?: string;
      /** Fallback на LLM при недоступности инстанса. */
      fallback?: { provider: string; model: string };
    };

export interface TurnTakingConfig {
  /** Тишина после речи юзера до передачи хода агенту, мс. По умолчанию 500. */
  endpointingMs?: number;
  /** Разрешено ли юзеру перебивать агента (barge-in). По умолчанию true. */
  allowInterruption?: boolean;
  /** Чувствительность VAD 0..1. По умолчанию 0.5. */
  vadSensitivity?: number;
}

/** Паритет: client tools + server tools (webhooks). */
export type ToolConfig =
  | {
      type: 'webhook';
      name: string;
      description: string;
      url: string;
      /** JSONSchema параметров. */
      parameters: Record<string, unknown>;
    }
  | {
      type: 'client';
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    };

/** Переопределения конфига на конкретную сессию (паритет: overrides). */
export interface SessionOptions {
  conversationId?: string;
  overrides?: Partial<Pick<AgentConfig, 'systemPrompt' | 'firstMessage' | 'variables' | 'voice'>>;
}

// ---- События пайплайна (сервер → клиент) ----

export type PipelineEvent =
  | { type: 'transcript'; text: string; final: boolean }
  | { type: 'agent_text'; delta: string }
  | { type: 'agent_audio'; chunk: ArrayBuffer }
  | { type: 'agent_speaking_start' }
  | { type: 'agent_speaking_end' }
  | { type: 'tool_call'; name: string; args: Record<string, unknown> }
  | { type: 'tool_status'; name: string; status: 'running' | 'done' | 'error' }
  | { type: 'interrupted' }
  | { type: 'error'; message: string; recoverable: boolean };
