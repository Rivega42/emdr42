# Production Launch Plan — EMDR-AI Therapy Assistant

> Документ синтезирован из ревью 4 параллельных аудиторов (backend/security, orchestrator/AI, frontend/UX, infra/deploy). Дата: 2026-05-27. Ветка origin: `claude/project-review-issues-En09l` (= PR #162 head).

## TL;DR

Сейчас проект **не запускается в прод даже технически**:

- Frontend не собирается — `lib/schemas/auth.ts` импортируется, но не существует.
- Backend runtime-поломка: `JwtStrategy` возвращает `{ id }`, 10 контроллеров читают `user.userId` → MFA, billing, crisis, usage, therapist-patient, verification падают.
- Mock-эмоции эмитятся в socket → симулированные данные в БД пациентов.
- CI делает SSH+PM2 deploy при K8s-архитектуре; реальный k8s-deploy — `echo TODO`.
- Backup CronJob сломан в 2 местах — бэкапов не будет.
- Camera включается без consent flow — HIPAA/GDPR блокер.

До прода — **8–11 недель работы** при 1-2 full-time dev + Вика + параллельно юрист/founders.

## Сводка блокеров P0 (50 штук)

Сгруппированы по категориям A–E. Каждый — с `file:line`.

### A. Authentication / Authorization

| # | Блокер | Файл |
|---|---|---|
| A1 | `user.userId` vs `user.id` массово сломан | `services/api/src/auth/strategies/jwt.strategy.ts:30` + 10 контроллеров |
| A2 | MFA challenge backdoor — `userId` из body без JwtAuthGuard | `services/api/src/mfa/mfa.controller.ts:59-67` |
| A3 | `JWT_SECRET \|\| 'change-me-in-production'` fallback | `auth.module.ts:14`, `jwt.strategy.ts:17` |
| A4 | THERAPIST видит ВСЕХ users, а не только assigned | `users.controller.ts:99-122`, `sessions.service.ts:115-117` |
| A5 | WS-IDOR — `socket.userId` не сверяется с `entry.userId` | `services/orchestrator/src/server.ts:159+` |
| A6 | `POST /usage/record` открыт пациенту | `services/api/src/usage/usage.controller.ts:16-33` |
| A7 | `?next=` без whitelist → open-redirect | `app/login/page.tsx:14,30` |
| A8 | JWT в localStorage + `unsafe-inline` CSP → XSS = угон | `contexts/AuthContext.tsx:33`, `next.config.js:14-17` |
| A9 | `token` vs `access_token` — разные ключи Auth vs tRPC | `lib/socket.ts:8` vs `lib/trpc.ts:16` |
| A10 | Refresh-token rotation race | `services/api/src/auth/refresh-token.service.ts:62-95` |

### B. PHI / Compliance

| # | Блокер | Файл |
|---|---|---|
| B1 | `PHI_ENCRYPTION_KEY` молча игнорится → plaintext в БД | `services/api/src/prisma/prisma.service.ts:61-64` |
| B2 | `mfaSecret`, `transcriptText`, `triggerText`, `TherapistNote.content`, `phone` НЕ в PHI_FIELDS | `services/api/src/prisma/encryption.middleware.ts:4-13` |
| B3 | Нет key versioning — ротация = все данные мертвы | `encryption.middleware.ts` |
| B4 | `@nestjs/schedule` не установлен → retention не работает | `services/api/src/users/users.service.ts:332` |
| B5 | SW кэширует `/api/*` PHI в Cache Storage | `public/sw.js:43-54` |
| B6 | Camera/microphone без consent UI | `contexts/EmotionContext.tsx:103-108`, `components/EmotionCamera.tsx:78` |
| B7 | Mock-эмоции эмитятся в socket | `app/session/page.tsx:206-235` |
| B8 | `stopTracking` не освобождает камеру | `contexts/EmotionContext.tsx:111-114` |
| B9 | Audit log не покрывает чтение PHI | `sessions.service.ts:98-120`, `therapist-patient.service.ts:205` |
| B10 | Piper TTS-fallback — транскрипт пациента в URL | `services/orchestrator/src/voice-handler.ts:319-322` |
| B11 | `sharedNotes` без PII-redaction в LLM | `services/api/src/patient-context/patient-context.service.ts:233` |
| B12 | pino-redact урезанный | `services/api/src/common/logger/pino-logger.ts:33-46` |

### C. Realtime / Voice / AI

| # | Блокер | Файл |
|---|---|---|
| C1 | Нет timeout/AbortController на STT/LLM/TTS | `voice-handler.ts:235-272`, `ai-dialogue.ts:75` |
| C2 | `maxTokens: 1000` → 70-сек TTS-монолог в BLS | `ai-dialogue.ts:75` |
| C3 | Reconnect = немедленный endSession | `services/orchestrator/src/server.ts:315-343` |
| C4 | CircuitBreaker in-memory | `packages/ai-providers/src/circuit-breaker.ts:40-128` |
| C5 | Streaming fallback склеивает два разных ответа | `packages/ai-providers/src/router.ts:241-256` |
| C6 | Vosk reconnect race + утечка таймеров | `voice-handler.ts:150-169` |
| C7 | CrisisService не вызывается на critical dissociation | `services/orchestrator/src/session-handler.ts:283-301` |
| C8 | `therapistNotified=true` ставится всегда | `services/api/src/crisis/crisis.service.ts:97-112` |
| C9 | Нет rate-limit на WS events | `services/orchestrator/src/server.ts:106-307` |
| C10 | `provider: 'anthropic'` захардкожен в usage | `services/orchestrator/src/session-handler.ts:543` |
| C11 | SMS-код через `Math.random()` | `services/api/src/verification/verification.service.ts:125` |
| C12 | Stripe webhook без идемпотентности | `services/api/src/billing/billing.service.ts:183-219` |

### D. Frontend / Safety

| # | Блокер | Файл |
|---|---|---|
| D1 | `lib/schemas/auth.ts` НЕ существует → build падает | `app/{login,register,forgot-password,reset-password}/page.tsx` |
| D2 | Нет `prefers-reduced-motion` → photosensitive epilepsy risk | `app/session/SessionCanvas.tsx:178-193` |
| D3 | Sparkles + flashing → flicker | `SessionCanvas.tsx` |
| D4 | Safety-alert модалки без `role="dialog"` + focus-trap | `app/session/page.tsx:811-857` |
| D5 | Глобальный `outline: none` без восстановления на `<a>` | `app/globals.css:72-82` |
| D6 | Admin users page — изменения только в локальном state | `app/(protected)/admin/users/page.tsx:31-32` |

### E. Infrastructure / Deploy

| # | Блокер | Файл |
|---|---|---|
| E1 | `ci.yml` SSH+PM2 deploy ломает k8s-стейт | `.github/workflows/ci.yml:113-132` |
| E2 | `deploy-staging.yml` / `deploy-prod.yml` — `echo TODO` | `.github/workflows/deploy-*.yml` |
| E3 | `docker.yml` собирает только frontend | `.github/workflows/docker.yml:54` |
| E4 | Dockerfile-ы под root + `npm ci` в pnpm-проекте | `Dockerfile`, `services/{api,orchestrator}/Dockerfile` |
| E5 | K8s манифесты без `securityContext` | `k8s/base/*.yaml` |
| E6 | `backup-cronjob.yaml` — пустой ConfigMap + не в kustomization | `k8s/base/backup-cronjob.yaml:9-12` |
| E7 | Prisma migrations в каждом pod → race | `services/api/docker-entrypoint.sh:6` |
| E8 | Нет манифестов для cert-manager / LiveKit / MinIO | `k8s/base/` |
| E9 | Orchestrator без readinessProbe | `k8s/base/orchestrator.yaml:40-45` |
| E10 | Alertmanager `${SMTP_*}` без envsubst | `monitoring/alertmanager.yml:6-7` |

## Спринт-план

### Sprint 0 — Разблокировка (1 неделя)
- D1: создать `lib/schemas/auth.ts`
- A9: унифицировать ключ `token`
- B7: удалить mock-emotion emitter
- A1: нормализовать `JwtStrategy.validate` → `{ id, userId: id, ... }`

### Sprint 1 — Auth + PHI (2 недели)
A2-A4, A6-A8, A10, B1-B4, B9, B12

### Sprint 2 — Realtime + Crisis + Voice (2 недели)
A5, C1-C12, B10, B11

### Sprint 3 — Frontend safety + Camera consent + A11y (2 недели)
B5, B6, B8, D2-D6, A8 (CSP nonce)

### Sprint 4 — Deploy + Secrets (2 недели, Vika + Dev)
E1-E10, source-maps Sentry, External Secrets

### Sprint 5 — External validation (1 неделя)
Pen-test (HackerOne/Cure53), k6 load 1000 WS, DR drill, юрист подписывает ToS/Privacy/Consent/BAA, HIPAA RA.

### Sprint 6 — Soft launch (2 недели)
10–20 пациентов + 2–3 терапевта. Daily monitoring. Bug-fix параллельно.

### Sprint 7 — GA (1 неделя)
Если 14 дней без P0/P1 incidents — открытый запуск.

**Итого: 11 недель при 1 dev. 7–8 недель при 2 dev.**

## Распределение ролей

| Роль | Что делает | Загрузка |
|---|---|---|
| Dev #1 (backend) | Sprint 1+2 backend, Sprint 4 deploy fixes | full-time 6 недель |
| Dev #2 (frontend+RT) | Sprint 0 unblock, Sprint 3, Sprint 2 orchestrator | full-time 6 недель |
| Vika | Sprint 4 infra, Sprint 5 load+DR, Sprint 6+7 ops | full-time 3-4 недели |
| Юрист | ToS / Privacy / Consent / BAA | 2-3 недели |
| Founders | Decisions, HIPAA RA, страховка | part-time весь период |
| External pen-tester | Sprint 5 | 1 неделя |

## Решения founders нужны сейчас (issue #159)

1. Юрисдикция первого запуска (US HIPAA / EU GDPR / RU 152-ФЗ).
2. Self-host vs managed (LLM, STT, TTS, Postgres, LiveKit).
3. Бюджет $30–50k до запуска.
4. License подтверждение.
5. CODEOWNERS / состав команды.

## Soft-launch criteria

- [ ] Все 50 P0 закрыты.
- [ ] HIPAA Risk Assessment подписан.
- [ ] Pen-test пройден.
- [ ] Load test 1000 WS — <1% error rate, p95 latency <2с.
- [ ] DR drill — restore работает за <1 час.
- [ ] BAA с подрядчиками подписаны.
- [ ] ToS / Privacy / Consent юристом подписаны.
- [ ] Страховка Cyber Liability оформлена.
- [ ] On-call rotation назначена.
- [ ] Sentry / Loki / Alertmanager / PagerDuty работают.
- [ ] Crisis pipeline тестирован end-to-end (фейк-тригер → терапевт получил уведомление <30s).

## GA criteria

- [ ] 14 дней soft-launch без P0/P1 incidents.
- [ ] Все postmortems закрыты.
- [ ] SLO документированы.
- [ ] Маркетинг-сайт + intake-воронка (#161) готовы.
- [ ] Терапевтический портал — full UX.
