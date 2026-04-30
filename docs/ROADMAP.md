# 🗺️ ROADMAP — EMDR-AI Therapy Assistant

Актуальная дорожная карта проекта. Обновлено: 2026-04-17.

---

## Где мы сейчас

- **Stage**: Pre-alpha — готова архитектура, основные сервисы, security и compliance фундамент
- **Готовность к MVP**: ~75%
- **Готовность к production**: ~45% (блокируется юрист-ревью legal docs + реальный deploy + clinical validation)

---

## ✅ Фаза 1 — Foundation (ЗАВЕРШЕНО)

### Архитектура
- Next.js 13 App Router + TypeScript + Tailwind
- pnpm workspaces + Turborepo monorepo
- NestJS backend + Prisma ORM + PostgreSQL
- Socket.io Session Orchestrator
- LiveKit WebRTC для видео/аудио
- Packages: `@emdr42/core`, `/emdr-engine`, `/ai-providers`, `/events`, `/livekit-integration`, `/common`

### Пайплайны
- EMDR 9-фазный протокол (8 канонических + опциональная RDI)
- Adaptive BLS (11 паттернов, adaptive set length)
- Safety Monitor с composite dissociation detection
- Multi-provider AI router с circuit breaker + fallback
- Real-time emotion recognition (локальный face-api.js / ONNX)
- Voice dialogue: Vosk STT + Piper TTS + Deepgram streaming

---

## ✅ Фаза 2 — Security & Compliance (ЗАВЕРШЕНО)

### Auth & Security
- JWT access (15 min) + refresh token rotation (7 days)
- Account lockout (5 failed attempts → 15 min)
- Password reset через VerificationToken в БД
- Email + phone verification flow
- MFA skeleton (TOTP flow endpoints — в Фазе 3)
- Helmet + CSP + Permissions-Policy + HSTS
- nginx security headers + rate-limit zones
- Redis-backed ThrottleGuard (distributed rate limiting)
- XSS sanitization + input validation (Zod, class-validator)
- PII redaction + prompt injection guards для LLM

### Compliance
- HIPAA/GDPR-ready схема (AuditLog, deletedAt, dataConsentAt)
- GDPR Art. 15 export / Art. 17 erasure + 30-day grace period
- Retention job (auto hard-delete + sessions expiry)
- AuditLog coverage на auth + PHI actions
- Session recording consent flow
- Crisis hotline data layer (10 стран + fallback)
- Crisis event tracking + severity levels
- Emergency contact в User profile

### Legal (drafts)
- Terms of Service v0.1 (DRAFT)
- Privacy Policy v0.1 (GDPR + HIPAA + CCPA)
- Informed Consent v0.1 (клинический)
- Cookies Policy v0.1
- Data Retention Policy
- ⚠️ **Требует юрист review перед публикацией**

---

## ✅ Фаза 3 — Product Features (ЗАВЕРШЕНО)

### Backend
- Therapist↔Patient relationships (M:N + notes)
- Analytics API (session trends, safety events, patient summary)
- Cross-session AI context (для continuity LLM-диалога)
- LLM/TTS/STT cost tracking + usage limits
- Gamification: XP, levels, streaks, 13 achievements
- Voice pattern analysis (WPM, pauses, filler words, flat affect)
- Stripe billing skeleton (subscriptions, webhooks, invoices)
- Notifications service (email + SMS + push)

### Frontend
- error.tsx / not-found.tsx / offline page + auth middleware
- Auth forms: zod + react-hook-form + password strength + a11y
- Session page split в компоненты (PhaseStepper, ChatPanel, BlsControls, Overlays)
- Progress page: EmotionTimeline SVG + achievements + metrics
- Dashboard: реальные данные
- Settings: GDPR export/delete, preferences
- Home + About на русском с crisis disclaimer
- next/font + Metadata exports + semantic HTML + a11y
- EmotionTimeline визуализация компонент
- TherapyContext safe parsing через Zod

---

## 🚧 Фаза 4 — Production Launch (В РАБОТЕ)

### Observability & Ops
- ✅ Prometheus метрики (API + Orchestrator: wsConnections, activeSessions, voice pipeline latency)
- ✅ Pino JSON structured logs с PII redaction
- ✅ Sentry skeleton (требует DSN от Вики)
- ✅ Healthz/readyz K8s probes
- ✅ Graceful shutdown + correlation IDs
- ✅ Loki + Promtail + Alertmanager + Grafana (docker-compose.observability.yml)
- ✅ Prometheus exporters (postgres, redis, node, cadvisor)
- ✅ Trivy + Gitleaks + SBOM + npm audit в CI
- ⏳ Deploy в staging через K8s (k8s/ manifests готовы, ждёт Вика)

### External integrations (ждут Вику — инструкции в issues)
- ⏳ **#145** Stripe live keys + Price IDs + webhooks
- ⏳ **#149** SMTP setup (SendGrid/Mailgun) + Twilio SMS
- ⏳ **#148** VAPID keys для Web Push
- ⏳ **#146** Юрист review legal docs
- ⏳ **#136** K8s cluster creation + secrets + DNS
- ⏳ **#137** S3 bucket + IAM credentials для backups
- ⏳ **#87** Sentry DSN

### Quality
- ✅ Circuit breaker + retry + timeout для AI
- ✅ Session orchestrator memory leak fix + TTL eviction
- ✅ Prisma migrations init + CI drift check
- ✅ DLQ + idempotency в events
- ✅ Playwright в CI
- ⏳ Test coverage до 70% (сейчас ~40%)
- ⏳ Load testing (k6 — требует staging)

---

## 📅 Фаза 5 — Clinical Validation (ПЕРЕД LAUNCH)

- [ ] Clinical Advisory Board (3 EMDRIA-certified therapists)
- [ ] Sign-off на клинические протоколы (#131, #132, #147)
- [ ] Pilot study / IRB approval
- [ ] C-SSRS validation
- [ ] Efficacy trial с контрольной группой
- [ ] HIPAA risk assessment
- [ ] SOC 2 Type II audit
- [ ] Penetration test
- [ ] BAA подписаны с провайдерами:
  - [ ] Anthropic Enterprise
  - [ ] OpenAI Enterprise (если используется)
  - [ ] Deepgram
  - [ ] Twilio
  - [ ] SendGrid/Mailgun
  - [ ] AWS/GCP/Azure hosting

---

## 📅 Фаза 6 — Post-MVP Growth

### Feature backlog
- [ ] **#97** Mobile apps (React Native / Expo)
- [ ] **#151** Full RBAC admin portal UI
- [ ] **#85** MediaPipe Face Mesh замена face-api.js
- [ ] **#84** Full i18n (русский, английский, ещё один)
- [ ] **#90** Therapist cabinet (assigned patients, notes UI, supervision)
- [ ] Cross-session trauma processing longitudinal analytics
- [ ] Integration с wearables (Apple Health, Oura, HRV)
- [ ] VR / AR модальности (Meta Quest, Apple Vision)
- [ ] Group therapy sessions
- [ ] Peer support community (модерированный)

### Research / advanced
- [ ] ML персонализация BLS-паттернов per user
- [ ] Dissociation prediction из multi-modal сигналов
- [ ] Cross-session embedding memory для LLM
- [ ] Differential privacy для research aggregates

---

## 🎯 Целевые сроки

| Milestone | Target |
|-----------|--------|
| Staging deploy (Vika) | Q2 2026 |
| Юрист review + legal finalized | Q2 2026 |
| Clinical Advisory Board onboarded | Q2 2026 |
| BAA signed с провайдерами | Q2–Q3 2026 |
| Pilot study IRB approval | Q3 2026 |
| Closed beta (100 users) | Q3 2026 |
| Open beta | Q4 2026 |
| v1.0 Production launch | Q1 2027 |
| Mobile apps | Q2 2027 |
| Enterprise (B2B therapist platforms) | Q3–Q4 2027 |

---

## 🚫 Не-цели (out of scope для MVP)

- Замена живого терапевта: EMDR-AI — **вспомогательный инструмент**, не medical device
- Диагностика: никаких DSM-5 / ICD-11 ярлыков
- Медикаментозные рекомендации
- Crisis intervention сам по себе (только перенаправление на hotlines)

---

## 📊 Метрики прогресса по областям

| Область | Готовность | Осталось |
|---------|-----------|----------|
| Frontend | 90% | UI polish, i18n full |
| Backend API | 90% | MFA TOTP, tRPC wiring |
| Auth & Security | 90% | CSRF переход на cookies |
| Orchestrator | 75% | LLM integration hooks |
| EMDR Engine | 85% | Clinical review |
| AI providers | 85% | faster-whisper streaming |
| Compliance | 80% | Юрист review, BAA |
| DevOps | 85% | Реальный deploy (Vika) |
| Observability | 90% | Sentry DSN (Vika) |
| Testing | 40% | Coverage к 70% |
| Clinical validation | 10% | CAB + IRB |

---

## Ссылки

- GitHub Issues: https://github.com/Rivega42/emdr42/issues
- Work log: `docs/WORK_LOG.md`
- Runbook: `docs/RUNBOOK.md`
- Incident Response: `docs/INCIDENT_RESPONSE.md`
- Data Retention: `docs/DATA_RETENTION.md`
- Legal drafts: `docs/legal/`
- K8s setup: `k8s/SETUP.md`
