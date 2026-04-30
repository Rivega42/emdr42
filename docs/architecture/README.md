# Архитектурные диаграммы

Высокоуровневые описания подсистем. Каждая система — отдельный файл.

## Подсистемы

- `emdr-engine.md` — 9-фазный EMDR-протокол, BLS-движок, set-tracker.
- `safety-monitor.md` — детекция диссоциации, voice-индикаторы, baseline.
- `voice-loop.md` — STT (Vosk/Deepgram) → orchestrator → TTS (Piper/ElevenLabs).
- `ai-pipeline.md` — LLM-провайдеры, circuit breaker, prompt-injection armor, PII-redaction.
- `livekit-integration.md` — WebRTC, рум-роутинг, медиа-треки.
- `billing.md` — Stripe + webhooks + invoice flow.
- `auth.md` — JWT, refresh tokens, MFA TOTP, backup-коды.
- `gdpr.md` — soft-delete, retention, export, audit-log.

Диаграммы — Mermaid в .md. Тяжёлые `.drawio` / `.excalidraw` — отдельно с PNG-экспортом рядом.
