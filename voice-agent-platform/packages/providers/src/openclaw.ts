/**
 * OpenClawBackend — агентом выступает self-hosted OpenClaw-инстанс.
 *
 * Спека: docs/REQUIREMENTS.md § 2.
 * - WebSocket к gateway (url + token из BackendConfig)
 * - final transcript юзера → сообщение в OpenClaw-сессию
 * - стрим-чанки ответа → text_delta (сразу в TTS, не ждём полного ответа)
 * - ctx.signal (barge-in) → abort генерации upstream
 * - tool-calls исполняет сам OpenClaw; прокидываем только tool_status в UI
 * - conversationId ↔ OpenClaw-сессия (память на стороне инстанса)
 * - недоступность инстанса → error event; fallback на LlmBackend решает
 *   вызывающий код по BackendConfig.fallback
 */
import type {
  AgentBackend,
  AgentInput,
  BackendEvent,
  ConversationContext,
} from '@voice-platform/core';

export interface OpenClawBackendOptions {
  url: string;
  token?: string;
}

export class OpenClawBackend implements AgentBackend {
  constructor(private readonly opts: OpenClawBackendOptions) {}

  // eslint-disable-next-line require-yield
  async *respond(_input: AgentInput, _ctx: ConversationContext): AsyncIterable<BackendEvent> {
    throw new Error(
      'Not implemented: требуется фиксация версии gateway-протокола OpenClaw ' +
        '(см. docs/REQUIREMENTS.md § 2, открытые вопросы)',
    );
  }

  async dispose(): Promise<void> {
    // TODO: закрыть ws-коннект
  }
}
