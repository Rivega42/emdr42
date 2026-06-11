/**
 * AgentBackend — ключевая абстракция платформы.
 *
 * VoicePipeline не знает, кто формирует ответ: голый LLM, OpenClaw-инстанс
 * или кастомная реализация. Контракт один: финальная реплика юзера на входе,
 * стрим событий на выходе.
 */

export interface AgentInput {
  /** Финальный транскрипт реплики пользователя. */
  text: string;
  conversationId: string;
}

export interface ConversationContext {
  /** История диалога для LLM-бэкендов. OpenClaw держит память сам — игнорирует. */
  history: Array<{ role: 'user' | 'assistant'; text: string }>;
  /** Сигнал прерывания (barge-in): бэкенд обязан остановить генерацию. */
  signal: AbortSignal;
}

export type BackendEvent =
  | { type: 'text_delta'; delta: string }
  | { type: 'tool_call'; name: string; args: Record<string, unknown> }
  | { type: 'tool_status'; name: string; status: 'running' | 'done' | 'error' }
  | { type: 'done' }
  | { type: 'error'; message: string };

export interface AgentBackend {
  /**
   * Стримит ответ агента. text_delta-чанки уходят в TTS немедленно,
   * не дожидаясь done (требование TTFA < 800мс).
   */
  respond(input: AgentInput, ctx: ConversationContext): AsyncIterable<BackendEvent>;
  /** Освобождение ресурсов (ws-коннекты и т.п.). */
  dispose?(): Promise<void>;
}
