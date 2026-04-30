/**
 * LLM / TTS / STT provider pricing table (#130).
 *
 * Цены в USD за 1M tokens (для LLM) или за 1 минуту (TTS/STT).
 * Обновить периодически — цены меняются.
 * Источники: официальные pricing pages провайдеров (апрель 2026).
 */

export interface LlmPricing {
  inputPer1M: number;
  outputPer1M: number;
  currency: 'USD';
}

export interface TtsPricing {
  per1MChars?: number;
  perMinute?: number;
  currency: 'USD';
}

export interface SttPricing {
  perMinute: number;
  currency: 'USD';
}

/** Prices as of 2026-04. Update via PR if provider pricing changes. */
export const LLM_PRICES: Record<string, LlmPricing> = {
  // Anthropic Claude (https://www.anthropic.com/pricing)
  'claude-opus-4-7': { inputPer1M: 15.0, outputPer1M: 75.0, currency: 'USD' },
  'claude-sonnet-4-6': { inputPer1M: 3.0, outputPer1M: 15.0, currency: 'USD' },
  'claude-haiku-4-5-20251001': { inputPer1M: 0.8, outputPer1M: 4.0, currency: 'USD' },
  // OpenAI (https://openai.com/pricing)
  'gpt-4o': { inputPer1M: 2.5, outputPer1M: 10.0, currency: 'USD' },
  'gpt-4o-mini': { inputPer1M: 0.15, outputPer1M: 0.6, currency: 'USD' },
  'gpt-4-turbo': { inputPer1M: 10.0, outputPer1M: 30.0, currency: 'USD' },
  // Local / self-hosted
  ollama: { inputPer1M: 0, outputPer1M: 0, currency: 'USD' },
};

export const TTS_PRICES: Record<string, TtsPricing> = {
  elevenlabs: { per1MChars: 18_000 / 1_000_000 * 1_000_000, currency: 'USD' }, // Approx. $0.018/k chars
  'openai-tts': { per1MChars: 15, currency: 'USD' },
  piper: { per1MChars: 0, currency: 'USD' },
};

export const STT_PRICES: Record<string, SttPricing> = {
  deepgram: { perMinute: 0.0043, currency: 'USD' },
  'openai-whisper': { perMinute: 0.006, currency: 'USD' },
  'faster-whisper': { perMinute: 0, currency: 'USD' }, // self-hosted
};

export interface UsageCostInput {
  type: 'LLM' | 'TTS' | 'STT';
  providerOrModel: string;
  inputTokens?: number;
  outputTokens?: number;
  chars?: number;
  durationSec?: number;
}

export function calculateCostUsd(input: UsageCostInput): number {
  switch (input.type) {
    case 'LLM': {
      const p = LLM_PRICES[input.providerOrModel];
      if (!p) return 0;
      const inCost = ((input.inputTokens ?? 0) / 1_000_000) * p.inputPer1M;
      const outCost = ((input.outputTokens ?? 0) / 1_000_000) * p.outputPer1M;
      return +(inCost + outCost).toFixed(6);
    }
    case 'TTS': {
      const p = TTS_PRICES[input.providerOrModel];
      if (!p) return 0;
      if (p.per1MChars != null && input.chars != null) {
        return +((input.chars / 1_000_000) * p.per1MChars).toFixed(6);
      }
      if (p.perMinute != null && input.durationSec != null) {
        return +((input.durationSec / 60) * p.perMinute).toFixed(6);
      }
      return 0;
    }
    case 'STT': {
      const p = STT_PRICES[input.providerOrModel];
      if (!p || input.durationSec == null) return 0;
      return +((input.durationSec / 60) * p.perMinute).toFixed(6);
    }
  }
}
