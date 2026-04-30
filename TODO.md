# 📋 TODO — EMDR-AI Therapy Assistant

> Актуальное состояние проекта и дорожная карта. Детальные задачи — в GitHub Issues.

**Последнее обновление**: 2026-04-17
**Прогресс до MVP**: ~55%
**Прогресс до production**: ~30%

---

## ✅ Сделано

### Фаза 1: Инфраструктура и документация (100%)
- Репозиторий `emdr42`, структура, README, ROADMAP, ARCHITECTURE, WHITEPAPER
- Docker Compose, package.json, .gitignore, CI/CD pipelines
- GitHub Pages, LICENSE (MIT), CONTRIBUTING.md

### Фаза 2: MVP разработка (частично — ~60%)

**Frontend (Next.js 13 App Router):**
- ✅ Next.js + TypeScript + Tailwind setup
- ✅ Pages: home, about, login, register, forgot/reset password, session, (protected)/dashboard/patients/progress/settings/admin
- ✅ EMDR Canvas с 11 BLS-паттернами (Three.js + R3F)
- ✅ PWA (manifest, service worker, #56 offline-first)
- ✅ Responsive / mobile (#46)
- ✅ Realtime voice dialogue (#66, #67, Vosk STT)
- ✅ Audio BLS (Tone.js)
- ✅ Emotion camera компонент (face-api.js)
- ✅ Contexts: Auth / Emotion / Therapy
- ✅ tRPC client / Socket.io client / LiveKit client

**Backend (NestJS):**
- ✅ Структура модулей: auth, users, sessions, admin, audit, email, health, livekit, trpc
- ✅ Prisma schema + PostgreSQL
- ✅ JWT + bcrypt auth (#69, #70, #71), register/login (#103)
- ✅ Swagger/OpenAPI документация (#64)
- ✅ EmailService (#76), Password reset (#77)
- ✅ Seed данных (#75)
- ✅ RBAC guards (частично)

**Session Orchestrator:**
- ✅ WebSocket сервер (Socket.io)
- ✅ Session handler, AI dialogue, voice handler
- ✅ Backend client для взаимодействия с API

**Packages (pnpm workspaces + Turborepo, #54):**
- ✅ `@emdr42/core` — shared types и business logic
- ✅ `@emdr42/emdr-engine` — EMDR 8-phase protocol (incomplete, нужен RDI — #131)
- ✅ `@emdr42/ai-providers` — LLM/TTS/STT router (streaming не завершён — #129)
- ✅ `@emdr42/livekit-integration` — client/server utils
- ✅ `@emdr42/events` — Redis pub/sub + BullMQ (#62)
- ✅ `@emdr42/common` — shared utilities

**DevOps / Quality:**
- ✅ Docker Compose (dev)
- ✅ CI: build, lint, test, CodeQL, docker, release
- ✅ PM2 ecosystem
- ✅ Playwright E2E (базовый набор — #65)
- ✅ Storybook (#63)
- ✅ HIPAA/GDPR groundwork (#58)
- ✅ Edge inference WebGPU + ONNX (#59)
- ✅ WebRTC P2P через LiveKit (#57)
- ✅ E2E encryption заготовка (#61)
- ✅ Микросервисная архитектура (#60)

---

## 🚧 В работе — P0 (блокеры до production)

Актуальный список — в GitHub Issues с меткой `P0`. Ключевые:

**Safety & Clinical:**
- #131 RDI phase + адаптивная длина BLS-сета
- #132 Улучшить детекцию диссоциации
- #147 Crisis hotline + C-SSRS screening + emergency contact
- #146 Legal: ToS, Privacy, Informed Consent, BAA

**Security:**
- #114 Refresh token rotation + MFA + account lockout
- #115 CSRF + Helmet + CSP + SameSite cookies
- #119 WebSocket JWT revalidation + revocation list
- #128 PII redaction + prompt injection guards
- #133 LiveKit token expiry + encrypted recording

**Reliability:**
- #116 LLM timeouts + retry + circuit breaker
- #117 Fix orchestrator memory leaks
- #113 Prisma migrations + CI migration drift check
- #137 PostgreSQL backups + PITR + DR drill
- #135 Docker resource limits + healthchecks

**Compliance:**
- #121 GDPR export / delete / retention policy
- #120 Audit log coverage + pagination
- #122 Session recording + transcript storage (encrypted)
- #112 Therapist ↔ patient Prisma relationship

---

## 📅 P1 (до beta-launch)

**Features:**
- #90 Therapist cabinet (зависит от #112)
- #145 Billing / Stripe subscriptions
- #149 Email + phone verification
- #148 Notification system
- #151 RBAC roles + admin portal
- #96 Admin pages с реальными данными
- #95 Settings с реальными данными
- #94 Dashboard с реальными данными
- #93 Progress page с графиками
- #92 Убрать mock emotion sender из session
- #129 STT streaming (Deepgram + faster-whisper)
- #130 LLM cost tracking
- #80 Emotion timeline visualization
- #79 Voice pattern analysis

**Infra:**
- #136 Kubernetes manifests / Helm
- #138 Loki logging + Prometheus exporters
- #139 Trivy + SBOM + secrets scanning
- #142 Runbook / Incident Response / DR docs
- #124 Healthz/readyz + graceful shutdown
- #134 DLQ + idempotency keys
- #118 Redis-backed rate limiting

**Frontend:**
- #104 Error pages + offline + auth middleware
- #105 Split session/page.tsx
- #106 zod + react-hook-form для auth форм
- #107 Убрать any types
- #109 A11y (aria-value, focus-trap)
- #85 MediaPipe вместо face-api
- #84 Полный i18n (3 языка)

**Backend:**
- #123 Input sanitization + pagination limits + Prisma pooling
- #126 Safe seed with faker
- #125 Analytics API
- #81 Cross-session AI context
- #82 Prometheus метрики в API
- #83 Voice pipeline latency метрики
- #87 Sentry error tracking
- #86 Rate limiting / Helmet / sanitization
- #88 Pino JSON logs + correlation IDs

---

## 📅 P2 (nice-to-have)

- #97 React Native / Expo мобильное приложение
- #89 Gamification (XP, уровни)
- #98 Расширить Playwright E2E
- #99 Расширить Storybook
- #100 Обновить ROADMAP.md
- #101 Расширенные health checks
- #102 Production docker-compose + SSL
- #91 Playwright в CI + Docker build + Dependabot
- #78 tRPC роутеры к реальным NestJS сервисам
- #73/#74 Users controller/spec
- #127 ml-service decision
- #140 husky + commitlint + semantic-release
- #141 CODEOWNERS + PR template
- #143 k6 load testing
- #144 Cleanup legacy files
- #150 Test coverage 70%
- #108 Metadata + next/font
- #110 TherapyContext safe parse
- #111 useVoice hook refactor

---

## 🧪 Фаза 3 — Clinical validation (перед launch)

- IRB approval для pilot study
- Efficacy trial с контрольной группой
- HIPAA risk assessment + BAA с облачными провайдерами (Anthropic, Deepgram, LiveKit)
- SOC 2 Type II audit
- Penetration test
- Clinical Advisory Board (сертифицированные EMDR-терапевты)
- C-SSRS validation
- Multilingual clinical protocol review

---

## 📊 Метрики прогресса

| Область | Готовность | Issues до готовности |
|---------|-----------|---------------------|
| Frontend pages | 85% | #104, #105, #106, #108 |
| Frontend data integration | 20% | #92, #93, #94, #95, #96 |
| Backend API | 65% | #112, #121, #122, #125, #151 |
| Auth & Security | 40% | #114, #115, #118, #119, #128 |
| Orchestrator | 60% | #116, #117, #119 |
| EMDR engine | 50% | #131, #132 |
| AI providers | 55% | #128, #129, #130 |
| Compliance | 25% | #120, #121, #122, #146, #147 |
| DevOps | 45% | #113, #135, #136, #137, #138, #139 |
| Testing | 35% | #98, #143, #150 |
| Documentation | 70% | #100, #142 |

---

## Ссылки

- Все issues: https://github.com/Rivega42/emdr42/issues
- P0 блокеры: issue filter по label `P0`
- Рабочий журнал текущей итерации: `docs/WORK_LOG.md`
- ROADMAP: `docs/ROADMAP.md`
- ARCHITECTURE: `docs/ARCHITECTURE.md`
- WHITEPAPER: `docs/WHITEPAPER.md`
