/**
 * PII Redactor (#128).
 *
 * Regex-based редактор PII перед отправкой в внешние LLM провайдеры.
 * Покрывает:
 *   - Email, телефон, SSN/ИНН, credit card
 *   - IP addresses
 *   - URLs (optional preservation)
 *   - Имена (из whitelist — только явно заданные patient names)
 *   - Даты рождения
 *
 * Ограничения: regex-only — не заменяет ML NER. Для production-уровня
 * подключить spaCy / compromise.js / cloud NER.
 */

export interface RedactionOptions {
  redactEmail?: boolean;
  redactPhone?: boolean;
  redactCreditCard?: boolean;
  redactSsn?: boolean;
  redactIp?: boolean;
  redactUrls?: boolean;
  redactDob?: boolean;
  /** Явно заданные имена пациента/семьи для замены */
  personalNames?: string[];
  /** Замена вместо удаления */
  replacement?: string;
}

const DEFAULTS: Required<Omit<RedactionOptions, 'personalNames'>> = {
  redactEmail: true,
  redactPhone: true,
  redactCreditCard: true,
  redactSsn: true,
  redactIp: true,
  redactUrls: false,
  redactDob: true,
  replacement: '[REDACTED]',
};

// Phone: E.164 и разные локальные форматы; min 7 digits to reduce false positives
const PHONE = /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{3,4}\)?[\s.-]?)?\d{3,4}[\s.-]?\d{3,4}/g;
const EMAIL = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const CREDIT_CARD = /\b(?:\d[ -]*?){13,19}\b/g;
const SSN = /\b\d{3}-\d{2}-\d{4}\b/g;
const INN = /\b(?:ИНН|inn)[:\s]*\d{10,12}\b/gi;
const IP = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
const URL = /https?:\/\/[^\s<>]+/gi;
// DOB — YYYY-MM-DD, DD/MM/YYYY, DD.MM.YYYY
const DOB = /\b(?:(?:19|20)\d{2}[-./]\d{2}[-./]\d{2}|\d{2}[-./]\d{2}[-./](?:19|20)\d{2})\b/g;

export function redactPii(text: string, options: RedactionOptions = {}): string {
  const opts = { ...DEFAULTS, ...options };
  let redacted = text;

  if (opts.redactEmail) redacted = redacted.replace(EMAIL, opts.replacement);
  if (opts.redactCreditCard)
    redacted = redacted.replace(CREDIT_CARD, opts.replacement);
  if (opts.redactSsn) {
    redacted = redacted.replace(SSN, opts.replacement);
    redacted = redacted.replace(INN, opts.replacement);
  }
  if (opts.redactIp) redacted = redacted.replace(IP, opts.replacement);
  if (opts.redactUrls) redacted = redacted.replace(URL, opts.replacement);
  if (opts.redactDob) redacted = redacted.replace(DOB, opts.replacement);
  if (opts.redactPhone) redacted = redacted.replace(PHONE, opts.replacement);

  if (options.personalNames && options.personalNames.length > 0) {
    for (const name of options.personalNames) {
      if (!name || name.length < 2) continue;
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`\\b${escaped}\\b`, 'gi');
      redacted = redacted.replace(re, opts.replacement);
    }
  }

  return redacted;
}
