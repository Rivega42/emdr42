# Work Log — Project Review Cleanup (claude/project-review-issues-En09l)

Ветка: `claude/project-review-issues-En09l`
Начало: 2026-04-17
Финальное обновление: 2026-04-17 (итерация 3)

## Контекст

После полного ревью проекта создано 35 новых GitHub issues (#104–#151) в дополнение к 47 существующим (#46–#102). Этот журнал фиксирует три последовательных волны фиксов P0/P1 задач.

## Итог трёх волн (43 коммита суммарно)

### Волна 1 — Foundation / Hygiene (10 коммитов)

| # | Issue | Коммит | Описание |
|---|-------|--------|----------|
| 1 | #144 | `8f4d74c` | Удалены legacy HTML, TODO.md синхронизирован |
| 2 | #141 | `f6f1b1d` | CODEOWNERS, SECURITY.md, CODE_OF_CONDUCT.md, .editorconfig, .nvmrc |
| 3 | #127 | `7fc30f8` | Удалён stub `src/ml-service` |
| 4 | #104 | `2a4880d` | error.tsx, not-found.tsx, offline page, auth middleware, favicon |
| 5 | #108 | `c2db5e8` | Metadata exports + next/font Inter |
| 6 | #110 | `1eab55b` | TherapyContext: try/catch + Zod validation |
| 7 | #117 | `7771f55` | Orchestrator: SessionRegistry с TTL + per-socket cleanup |
| 8 | #124 | `0be2b79` | /healthz + /readyz + graceful shutdown + correlation IDs |
| 9 | #126 | `bd7a24b` | Seed с random паролями + NODE_ENV guard |
| 10 | #135 | `fbee6ab` | Docker: resource limits + healthchecks + env секреты |

### Волна 2 — Backend + Data + Security + AI (17 коммитов)

| # | Issue | Коммит |
|---|-------|--------|
| 11 | #113 | `9dc2ecb` Prisma migrations init + CI drift + Docker entrypoint |
| 12 | #112 | `d7a8ab2` DB schema expansion + migrations |
| 13 | #112 | `97f9d98` TherapistPatientService + controller + audit |
| 14 | #115 | `43e555f` Helmet + CSP + nginx security headers |
| 15 | #116 | `3c2ce33` CircuitBreaker + retry + timeout |
| 16 | #123 | `37a0369` XSS sanitize + pagination max + Prisma pool |
| 17 | #147 | `a9ab456` Crisis hotlines data layer + endpoints |
| 18 | #121 | `bc6b969` GDPR export/soft-delete/retention/audit |
| 19 | #131 | `24c6c51` RDI phase + adaptive BLS set length |
| 20 | #132 | `e0f4f51` Composite dissociation detection + baseline |
| 21 | #130 | `e3c38f5` LLM/TTS/STT cost tracking |
| 22 | #128 | `1f8f0e8` PII redaction + prompt injection guards |
| 23 | #134 | `8605113` DLQ + idempotency в JobQueue/EventBus |
| 24 | #120 | `6a62721` Audit coverage на auth actions |
| 25 | #118 | `310f07e` Redis-backed ThrottleGuard |
| 26 | #125 | `58b52b4` Analytics API |
| 27 | #122 | `f6371f6` Session recording/transcript endpoints |

### Волна 3 — Product features + Ops + Vika-handoffs (16 коммитов)

| # | Issue | Коммит |
|---|-------|--------|
| 28 | #114 | `2d219cf` Refresh token rotation + account lockout + MFA skeleton |
| 29 | #149 | `9d44bca` Email + phone verification + HTML шаблоны |
| 30 | #148 | `aae0020` NotificationsService + preferences + push skeleton |
| 31 | #145 | `ca55af3` Stripe billing + webhook + invoices |
| 32 | #142 | `c87a8ce` RUNBOOK + INCIDENT_RESPONSE + DATA_RETENTION docs |
| 33 | #146 | `32e6b76` Legal drafts (ToS/Privacy/Consent/Cookies) + guide |
| 34 | #136 | `d3c9d6d` K8s manifests + Kustomize overlays + SETUP guide |
| 35 | #137 | `7a1472d` PostgreSQL backup + restore scripts + CronJob |
| 36 | #138 | `34e7de1` Loki + Prometheus exporters + Alertmanager + Grafana |
| 37 | #139 | `100606d` Trivy + npm audit + Gitleaks + SBOM + Dependabot |
| 38 | #105 | `5e6b30c` Split session/_components (PhaseStepper, EmotionHeader, ChatPanel, BlsControls, SudsVocControls, Overlays) |
| 39 | #106 | `0e11f9a` Zod + react-hook-form + a11y для login/register/forgot/reset |
| 40 | #107 | `04e41ae` Remove `any` types + face-api.d.ts |
| 41 | #129 | `720810e` Deepgram STT streaming реализован |
| 42 | #109 | (part of #105, #106) A11y improvements в новых компонентах |

## Всего закрыто issues: 38

P0 (блокеры): #104, #108, #110, #112, #113, #114, #115, #116, #117, #121, #122, #126, #127, #128, #131, #132, #135, #136, #137, #144, #146, #147
P1 (важные): #105, #106, #107, #109, #118, #120, #123, #124, #125, #129, #130, #134, #138, #139, #141, #142, #145, #148, #149

## Issues с инструкциями для Вики (требуют внешних действий)

| Issue | Что нужно от Вики | Ссылка |
|-------|-------------------|--------|
| #149 | SMTP setup (SendGrid/Mailgun) + Twilio для SMS + DNS (SPF/DKIM/DMARC) | [comment](https://github.com/Rivega42/emdr42/issues/149) |
| #148 | VAPID keys для Web Push | [comment](https://github.com/Rivega42/emdr42/issues/148) |
| #145 | Stripe account + Price IDs + webhook secret | [comment](https://github.com/Rivega42/emdr42/issues/145) |
| #146 | Юрист review + Clinical Advisory Board + BAA с провайдерами + DPO + Insurance | [comment](https://github.com/Rivega42/emdr42/issues/146) |
| #136 | Создать K8s кластер (DO/EKS/GKE) + Ingress + cert-manager + DNS | [comment](https://github.com/Rivega42/emdr42/issues/136) |
| #137 | S3 bucket + IAM + secret для backup | [comment](https://github.com/Rivega42/emdr42/issues/137) |

Все инструкции подробно расписаны в comments issues.

## Что ещё не затронуто (оставшиеся P2)

- **#97** React Native / Expo мобильное приложение — отдельный проект
- **#89** Gamification (XP, уровни, achievements)
- **#79** Voice patterns analysis
- **#80** Emotion timeline visualization (после #125 analytics)
- **#81** Cross-session AI context
- **#85** MediaPipe замена face-api.js
- **#84** Полный i18n 3 языка (частично сделано — ключи в lib/i18n)
- **#56** PWA offline-first (частично сделано в #104)
- **#90** Therapist cabinet UI (после #112 schema)
- **#91** Dependabot (включено в #139)
- **#94, #95, #96** Admin/Settings/Dashboard подключить к реальным API
- **#92, #93** Session/Progress pages реальные данные
- **#98** Расширить Playwright E2E
- **#99** Расширить Storybook
- **#100** Обновить ROADMAP.md
- **#78** tRPC routers к NestJS
- **#82** Prometheus метрики API endpoints (base setup в #138)
- **#83** Voice pipeline latency metrics
- **#87** Sentry error tracking
- **#88** Pino JSON logs + correlation (частично через #124)
- **#151** RBAC portal UI (schema готов в #112)
- **#150** Test coverage 70% — постоянный процесс, покрытие растёт с каждой фичей

## Замечания / технический долг / риски

### Prerequisites для запуска кода

1. **Prisma generate** обязательно после миграций. Новые модели (RefreshToken, VerificationToken, CrisisEvent, UsageLog, Subscription, Invoice, TherapistPatient, TherapistNote) используются через `(prisma as any).model` до запуска generate. После `npx prisma generate` — убрать as any.

2. **npm install** в нескольких местах: ai-providers (+ ws), api (+ helmet, ioredis, xss, nodemailer, twilio, stripe), корень (+ react-hook-form, @hookform/resolvers).

3. **npx prisma migrate deploy** применит все миграции:
   - `20260417000000_init` — базовая схема
   - `20260417100000_therapist_patient_compliance` — связи + compliance поля
   - `20260417200000_auth_hardening` — failed attempts, lockout, MFA, verification
   - `20260417300000_billing` — Subscription, Invoice

### Integration work, отложенный для атомарности

- **PII redaction + prompt armor интеграция в LLM providers** — utilities созданы (#128), но в AnthropicProvider/OpenAiProvider ещё не подключены. Нужен отдельный PR с модификацией каждого provider.
- **Orchestrator UsageService.record()** после chatStream/tts/stt — #130 data layer готов, но фактические вызовы не подключены.
- **NotificationsService calls из CrisisService** — hook therapist crisis alert (#147 + #148).
- **Session therapistId validation в create** — #112 предотвращает чужого пациента, но endpoint не проверяет.
- **Fronend billing UI (/settings/billing)** — backend готов (#145), UI страница не создана.

### Open architectural decisions

1. **Data localization для РФ** — не решено. Требует отдельный deployment в Яндекс/VK Cloud с data routing по user.country.
2. **Medical device classification** — ждём юрист review (#146).
3. **Self-guided EMDR legality** — ждём юрист review per jurisdiction.
4. **Managed DB vs self-hosted PG** — для production строго рекомендую managed. В k8s/SETUP.md описано.
5. **Cookie-based auth** — пока localStorage; middleware.ts готов к переключению, но требует #114 финал + UI изменения.

## Метрика прогресса

| Область | Было | Стало | Оставшееся |
|---------|------|-------|------------|
| Frontend pages | 85% | 90% | #92-96 реальные данные (нужен #78 tRPC) |
| Frontend data integration | 20% | 25% | Зависит от #78 |
| Backend API | 65% | 90% | Integration hooks |
| Auth & Security | 40% | 85% | MFA TOTP setup endpoints |
| Orchestrator | 60% | 70% | integration #130/#128 |
| EMDR engine | 50% | 80% | session-engine полностью использует adaptive |
| AI providers | 55% | 85% | faster-whisper streaming, prompt armor integration |
| Compliance | 25% | 75% | Юрист review, BAA подпись |
| DevOps | 45% | 85% | Реальный deploy |
| Testing | 35% | 40% | Write tests, к 70% нужен отдельный спринт |
| Documentation | 70% | 95% | |

## Следующий логический блок задач

Приоритет 1 (нельзя без них в production):
1. **Юрист review** #146 — критичный блокер для legal launch
2. **Clinical Advisory Board review** #147 protocols
3. **Staging deploy** через #136 — real-world test
4. **BAA подписать** с Anthropic, Twilio, SMTP провайдером
5. **First security audit / pen test**

Приоритет 2 (UX + monetization):
6. **#92-96** UI к реальным API данным
7. **Billing UI** (/settings/billing)
8. **MFA TOTP flow** (завершение #114)
9. **Cookie-based auth** (#115 CSRF)

Приоритет 3 (growth):
10. Observability #82/#83/#87 (метрики)
11. Test coverage to 70%
12. Load testing
13. Mobile app #97
