# ROADMAP — EMDR-AI Therapy Assistant

Последнее обновление: 2026-04-14

## Текущее состояние проекта

| Компонент | Статус | Issues |
|-----------|--------|--------|
| **Auth (register/login/JWT)** | ✅ Готово | #69, #70, #71 |
| **Users CRUD + GDPR** | ✅ Готово | #72, #73 |
| **Sessions CRUD + Prisma** | ✅ Готово | Реализовано ранее |
| **tRPC → реальные сервисы** | ✅ Готово | #78 |
| **Email + Password Reset** | ✅ Готово | #76, #77 |
| **EMDR Engine (8 фаз)** | ✅ Готово | packages/emdr-engine |
| **AI Providers (LLM/STT/TTS)** | ✅ Готово | packages/ai-providers |
| **Session Orchestrator** | ✅ Готово | services/orchestrator |
| **Voice Analytics** | ✅ Готово | #79 |
| **Cross-session AI context** | ✅ Готово | #81 |
| **Emotion Timeline** | ✅ Готово | #80 |
| **Prometheus Metrics** | ✅ Готово | #82, #83 |
| **i18n (EN/RU/ES)** | ✅ Готово | #84 |
| **Security (rate limiting, logging)** | ✅ Готово | #86, #88 |
| **Gamification (achievements, XP)** | ✅ Готово | #89 |
| **Therapist Cabinet (API)** | ✅ Готово | #90 |
| **Health Checks** | ✅ Готово | #101 |
| **Progress Page** | ✅ Готово | #93 |
| **Dependabot** | ✅ Готово | #91 |
| **Emotion Recognition (face-api.js)** | ✅ Готово | packages/core |
| **MediaPipe Face Mesh** | ⬜ Планируется | #85 |
| **Dashboard (реальные данные)** | ⬜ Планируется | #94 |
| **Settings (реальные данные)** | ⬜ Планируется | #95 |
| **Admin pages (реальные данные)** | ⬜ Планируется | #96 |
| **Mobile (React Native)** | ⬜ Планируется | #97 |
| **E2E тесты (расширение)** | ⬜ Планируется | #98 |
| **Storybook (расширение)** | ⬜ Планируется | #99 |
| **Docker production** | ⬜ Планируется | #102 |
| **Sentry error tracking** | ⬜ Планируется | #87 |

---

## Sprint 1 (завершён): Auth + Database

Issues: #69-#75

- AuthService: register с bcrypt + JWT, login с password verify
- UsersService: 7 методов с Prisma (findAll, findOne, update, deactivate, getUserSessions, exportAllData, deleteAllData)
- UsersController: JwtAuthGuard, GDPR ownership check
- Prisma schema: resetToken/resetTokenExpiry

## Sprint 2 (завершён): Email + Password Reset

Issues: #76, #77

- EmailService с nodemailer + SMTP + dev fallback
- Password reset через БД (не in-memory)

## Sprint 3 (завершён): tRPC

Issue: #78

- tRPC context с JWT auth + service injection
- Auth/Sessions/Users роутеры подключены к реальным NestJS сервисам
- Mounted в main.ts через createExpressMiddleware

## Sprint 4 (завершён): Voice Analytics

Issue: #79

- VoiceAnalyzer: паузы, speech rate, volume trend
- Интеграция в AI context (SessionHandler.buildContextMessage)

## Sprint 5 (завершён): Emotion Timeline

Issue: #80

- EmotionTimeline SVG компонент
- Графики stress/engagement/valence
- Маркеры для patient/ai/phase/safety событий

## Sprint 6 (завершён): Cross-session AI Context

Issue: #81

- Загрузка истории из BackendClient при старте сессии
- SUDS/VOC тренды в AI промпте

## Sprint 7 (завершён): Monitoring

Issues: #82, #83

- MetricsService с prom-client
- GET /metrics endpoint (Prometheus format)
- prometheus.yml обновлён

## Sprint 8 (завершён): i18n

Issue: #84

- 200+ ключей на язык
- 3 языка: EN, RU, ES
- 11 секций: common, nav, auth, session, dashboard, progress, settings, admin, safety, errors, voice

## Sprint 10 (завершён): Security + Logging

Issues: #86, #88

- Rate limiting на auth endpoints
- Structured JSON logging с request IDs

## Sprint 11 (завершён): Gamification

Issue: #89

- Achievement + UserAchievement Prisma models
- 7 достижений в seed
- XP система, level up

## Sprint 12 (завершён): Therapist Cabinet

Issue: #90

- TherapistNote model
- API: patients list, sessions, progress, notes

## Sprint 14 (завершён): Убрать моки

Issue: #92

- Mock emotion sender удалён из session page

## Sprint 15 (завершён): Progress Page

Issue: #93

- Stats cards, SUDS trend chart, session history table

## Sprint 23 (завершён): Health Checks

Issue: #101

- GET /health/live, GET /health/ready
- Проверки: PostgreSQL, Redis, Vosk, Ollama, Piper

---

## Следующие шаги

| Приоритет | Issue | Описание |
|-----------|-------|----------|
| P1 | #85 | MediaPipe Face Mesh — замена face-api.js |
| P1 | #87 | Sentry error tracking |
| P2 | #94 | Dashboard — реальные данные |
| P2 | #95 | Settings — реальные данные |
| P2 | #96 | Admin pages — реальные данные |
| P2 | #98 | Playwright E2E расширение |
| P2 | #102 | Docker production-ready |
| P3 | #97 | React Native mobile app |
| P3 | #99 | Storybook расширение |
