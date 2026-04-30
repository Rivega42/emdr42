# Системные промпты для LLM

Все промпты, которые ассистент отправляет в LLM, хранятся здесь как код. Версионирование — суффиксом `-vN`.

## Зачем

- Воспроизводимость поведения AI между релизами.
- Аудит для compliance (HIPAA / GDPR — что именно увидела модель).
- Удобство A/B и rollback.

## Содержание

- `emdr-facilitator-v1.md` — основной системный промпт ведущего EMDR.
- `crisis-triage-v1.md` — режим экстренной поддержки.
- `rdi-guide-v1.md` — Resource Development & Installation.
- `pii-armor-v1.md` — слой защиты от prompt injection и PII-leak.

> Реальные промпты переезжают из `packages/ai-providers/src/prompt-templates.ts` сюда по мере стабилизации.
