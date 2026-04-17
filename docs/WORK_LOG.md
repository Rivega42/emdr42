# Work Log — Project Review Cleanup (claude/project-review-issues-En09l)

Ветка: `claude/project-review-issues-En09l`
Начало: 2026-04-17
Обновлено: 2026-04-17 (большая итерация)

## Контекст

После полного ревью проекта создано 35 новых GitHub issues (#104–#151) в дополнение к 47 существующим (#46–#102). Этот журнал фиксирует итерацию сфокусированных фиксов P0/P1 задач.

## Итог итерации (25 коммитов)

### Волна 1 — Foundation / Hygiene (10 коммитов)

| # | Issue | Коммит | Описание |
|---|-------|--------|----------|
| 1 | #144 | `8f4d74c` | Удалены legacy HTML, TODO.md синхронизирован с реальностью |
| 2 | #141 | `f6f1b1d` | CODEOWNERS, SECURITY.md, CODE_OF_CONDUCT.md, .editorconfig, .nvmrc |
| 3 | #127 | `7fc30f8` | Удалён stub `src/ml-service` |
| 4 | #104 | `2a4880d` | error.tsx, not-found.tsx, offline page, auth middleware, favicon |
| 5 | #108 | `c2db5e8` | Metadata exports + next/font Inter (cyrillic) |
| 6 | #110 | `1eab55b` | TherapyContext: try/catch + Zod validation + versioned storage |
| 7 | #117 | `7771f55` | Orchestrator: SessionRegistry с TTL и per-socket cleanup |
| 8 | #124 | `0be2b79` | /healthz + /readyz (K8s), graceful shutdown, correlation IDs |
| 9 | #126 | `bd7a24b` | Seed с random паролями + NODE_ENV guard |
| 10 | #135 | `fbee6ab` | Docker: resource limits, healthchecks, обязательные env секреты |

### Волна 2 — Backend / Data / Security / AI (15 коммитов)

| # | Issue | Коммит | Описание |
|---|-------|--------|----------|
| 11 | #113 | `9dc2ecb` | Prisma migrations init + CI drift check + Docker entrypoint |
| 12 | #112 | `d7a8ab2` | DB schema: therapist↔patient, RefreshToken, CrisisEvent, UsageLog, recording fields, GDPR fields |
| 13 | #112 | `97f9d98` | TherapistPatientService + controller + audit integration |
| 14 | #115 | `43e555f` | Helmet + CSP (API, Next, nginx security headers, rate-limit zones) |
| 15 | #116 | `3c2ce33` | CircuitBreaker + withRetry + timeout для AI providers |
| 16 | #123 | `37a0369` | XSS sanitize pipe, pagination max, Prisma connection pool |
| 17 | #147 | `a9ab456` | Crisis hotline data layer (RU/US/GB/CA/DE/FR/AU/UA/KZ/BY + fallback) + Crisis endpoints |
| 18 | #121 | `bc6b969` | GDPR: export, soft-delete, retention job, audit |
| 19 | #131 | `24c6c51` | RDI phase + adaptive BLS set length randomization |
| 20 | #132 | `e0f4f51` | Composite dissociation detection + adaptive baseline |
| 21 | #130 | `e3c38f5` | LLM/TTS/STT cost tracking + summary API |
| 22 | #128 | `1f8f0e8` | PII redaction (regex) + prompt injection guards + armor preamble |
| 23 | #134 | `8605113` | JobQueue DLQ + idempotency keys в EventBus/JobQueue |
| 24 | #120 | `6a62721` | Audit coverage на auth actions + JWT expiry 15m |
| 25 | #118 | `310f07e` | Redis-backed ThrottleGuard + @Throttle на auth (5/h register, 10/min login) |
| 26 | #125 | `58b52b4` | Analytics API (session trends, safety events, patient summary) |
| 27 | #122 | `f6371f6` | Session recording consent + attach + transcript endpoints |

## Всего закрыто issues в итерации: 22

P0: #104, #108, #110, #112, #113, #115, #116, #117, #121, #122, #126, #127, #132, #135, #144
P1: #118, #120, #123, #124, #125, #128, #130, #131, #134, #141, #147

## Что не вошло (требует отдельной работы)

### Крупные функциональные фичи (требуют больше времени/внешних сервисов)

- **#114** Refresh token rotation + MFA — требует переход на cookie-based auth, меняет много мест, отдельный спринт
- **#119** WebSocket JWT revalidation + blacklist — после #114
- **#145** Stripe billing — требует account setup, webhook URL, test Stripe keys
- **#146** Legal docs (ToS, Privacy, Informed Consent, BAA) — требует юриста
- **#149** Email/phone verification — требует SMS provider (Twilio) credentials
- **#148** Email/push notifications — требует SMTP/FCM setup
- **#151** RBAC portal UI — большая работа на frontend

### Инфраструктура (требует тестовой среды/аккаунтов)

- **#136** Kubernetes / Helm manifests — нужна тестовая K8s кластер
- **#137** PostgreSQL backups + PITR — требует S3/WAL-g
- **#138** Loki + Prometheus exporters — расширение docker-compose + dashboards
- **#139** Trivy/SBOM/secrets scanning — расширение CI

### Frontend

- **#105** Split session/page.tsx — большой рефакторинг
- **#106** Zod + react-hook-form для auth — переписывание 4 форм
- **#107** Убрать any types (face-api, emotion-test)
- **#109** a11y (aria-value, focus-trap)
- **#111** useVoice hook
- **#84** Полный i18n 3 языка
- **#85** MediaPipe вместо face-api
- **#92–96** UI pages подключение реальных API (нужны #78 tRPC wiring)
- **#80** Emotion timeline visualization

### Реализации поверх уже сделанной инфраструктуры

- **#129** STT streaming (Deepgram + faster-whisper) — реализация методов, которые сейчас throw
- **#78** tRPC wiring — подключить routers к NestJS services
- **#131** Применить #131 в session-engine для реальных BLS set routing
- **#128** Интеграция PII/armor в AnthropicProvider.chat() — требует модификации каждого provider

### Процесс / Ops

- **#142** Runbook + Incident Response docs
- **#143** k6 load tests
- **#150** 70% coverage — требует написания множества unit/integration тестов
- **#140** Husky + commitlint + semantic-release

## Замечания / открытые риски

1. **Prisma generate** — новые модели (RefreshToken, CrisisEvent, UsageLog, TherapistPatient, TherapistNote, VerificationToken) требуют запуска `prisma generate` в CI и Docker build. До этого — IDE ошибки и runtime errors на этих моделях. Миграция ожидает `prisma migrate deploy` на БД.
2. **Типизация crisis/usage services** использует `(this.prisma as any).crisisEvent` / `.usageLog` / `.therapistPatient` / `.therapistNote` — до запуска generate типы недоступны. После generate надо убрать `as any`.
3. **Интеграция CircuitBreaker в provider retry callbacks** — retries внутри breaker могут конкурировать с внешним fallback. Тесты покрывают unit, но не integration между providers.
4. **PII redactor и prompt armor не подключены в AnthropicProvider** — utilities готовы, но каждый provider должен вызывать их в chat(). Оставлено на отдельный PR для атомарности.
5. **CrisisEvent модель типизирована через `as any`** — после `prisma generate` заменить.
6. **Seed работает с @emdr42.local доменом** — если email верификация включается (#149), надо генерировать dummy email-ы которые SMTP-фильтр пропустит.
7. **Adaptive set length может не совпадать с session-engine** — поменяли types, но не весь flow в session-engine использует adaptive-controller.calculateBlsParams.
8. **Next.js CSP с 'unsafe-inline'** — safe для MVP, но для production надо перейти на nonce-based.

## Появившиеся новые issues в ходе работы

Не появилось — все работы уместились в скоуп существующих issues.
Однако обнаружены несколько technical debt items для будущих PR:

- Applied PII redaction + prompt armor нужно интегрировать в каждый LLM provider (не создавал issue т.к. это часть #128)
- UsageService.record() нужно вызывать из orchestrator после каждого chatStream/tts/stt (часть #130)
- TherapistPatientService проверки при создании Session (session.therapistId) — надо гарантировать что терапевт не приставлен к чужому пациенту (часть #112)
- Тесты на SanitizePipe
- Тесты на PrismaService pool config

## Следующий логический блок задач

Рекомендую далее (в порядке impact/effort):

1. **#114 Refresh token + MFA** — большой, меняет auth flow (foundation для #115/119/149)
2. **#145 Stripe billing** — нужно для монетизации
3. **#146 Legal docs draft** — шаблоны с пометкой "draft — review by lawyer"
4. **#105 Split session/page.tsx** — улучшает maintainability
5. **#92–96** frontend data integration (после того как tRPC routers подключены через #78)
6. **#142 Runbook + IR docs** — готовность к incident response

Эти задачи лучше делать последовательно, не параллельно — у них общий blast radius.
