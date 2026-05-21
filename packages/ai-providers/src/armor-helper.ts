import type { ChatMessage, LlmOptions } from './types';
import { redactPii } from './pii-redactor';
import {
  analyzeForInjection,
  wrapUserMessage,
  THERAPIST_ARMOR_PREAMBLE,
} from './prompt-armor';

/**
 * Shared helper для применения PII redaction + prompt armor перед LLM-вызовом (#128).
 *
 * Возвращает:
 *   - safeMessages — массив messages с wrapped user content и PII redacted
 *   - systemPrompt — с armor preamble если enabled
 *   - injections — массив detected injection attempts для AuditLog
 */

export interface ArmoredMessages {
  messages: ChatMessage[];
  systemPrompt: string | null;
  injectionsDetected: Array<{
    index: number;
    score: number;
    matched: string[];
  }>;
}

export function applyArmor(
  messages: ChatMessage[],
  options?: LlmOptions,
): ArmoredMessages {
  const injections: ArmoredMessages['injectionsDetected'] = [];
  const enableArmor = options?.enableArmor ?? false;
  const personalNames = options?.redactPersonalNames ?? [];

  // Extract system prompt
  let systemPrompt: string | null = options?.systemPrompt ?? null;
  const others: ChatMessage[] = [];
  for (const m of messages) {
    if (m.role === 'system') {
      systemPrompt = (systemPrompt ?? '') + (systemPrompt ? '\n\n' : '') + m.content;
    } else {
      others.push(m);
    }
  }

  if (enableArmor && systemPrompt && !systemPrompt.includes('CRITICAL RULES')) {
    systemPrompt = THERAPIST_ARMOR_PREAMBLE + '\n' + systemPrompt;
  } else if (enableArmor && !systemPrompt) {
    systemPrompt = THERAPIST_ARMOR_PREAMBLE;
  }

  const safeMessages = others.map((msg, index) => {
    if (msg.role !== 'user') return msg;

    // Redact PII
    let redacted = personalNames.length > 0 || enableArmor
      ? redactPii(msg.content, {
          personalNames,
          redactEmail: true,
          redactPhone: true,
          redactCreditCard: true,
          redactSsn: true,
        })
      : msg.content;

    // Injection detection
    if (enableArmor) {
      const analysis = analyzeForInjection(msg.content);
      if (analysis.suspicious) {
        injections.push({ index, score: analysis.score, matched: analysis.matched });
        options?.onInjection?.(analysis);
      }
      redacted = wrapUserMessage(redacted);
    }

    return { ...msg, content: redacted };
  });

  return {
    messages: safeMessages,
    systemPrompt,
    injectionsDetected: injections,
  };
}
