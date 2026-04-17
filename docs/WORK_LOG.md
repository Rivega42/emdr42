# Work Log — Project Review Cleanup (claude/project-review-issues-En09l)

Ветка: `claude/project-review-issues-En09l`
Начало: 2026-04-17
Обновлено: 2026-04-17

## Контекст

После полного ревью проекта создано 35 новых GitHub issues (#104–#151) в дополнение к 47 существующим (#46–#102). Этот журнал фиксирует итерацию сфокусированных фиксов P0/P1 задач, которые можно выполнить атомарно в рамках текущей сессии.

## Итог итерации (10 коммитов)

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

## Что не вошло в эту итерацию

Требует большей проработки / внешних сервисов / архитектурных решений:

**Критичные для production, но крупные:**
- #112 therapist↔patient Prisma schema (меняет множество мест, миграция)
- #113 Prisma migrations init + CI drift check
- #114 refresh token rotation + MFA + account lockout
- #115 CSRF + Helmet + CSP + переход на HttpOnly cookies
- #116 LLM circuit breaker (opossum) + timeouts
- #121 GDPR export/delete/retention
- #128 PII redaction + prompt injection guards
- #131 RDI phase + adaptive set length
- #146 Legal docs (требует юриста)
- #147 Crisis hotline + C-SSRS

**Требуют внешних сервисов / платных провайдеров:**
- #145 Stripe billing
- #137 PostgreSQL backups + PITR
- #136 Kubernetes / Helm
- #138 Loki + Prometheus exporters
- #139 Trivy + SBOM scans

**Frontend полировка:**
- #105 split session/page.tsx
- #106 zod + react-hook-form
- #107 убрать все any
- #109 a11y

## Появившиеся новые задачи в ходе работы

Не обнаружено — все работы уместились в скоуп существующих issues.

## Замечания / дефекты обнаруженные по ходу

1. **Redis volume path** был `/var/lib/redis/data` (некорректно для officia redis-image) — исправлен на `/data` в #135.
2. **Orchestrator disconnect handler** чистил voice handlers ВСЕХ клиентов, не только своего — исправлено в #117.
3. **CLAUDE.md** ссылался на устаревший `src/` — обновлено в #127.
4. **Redundant alias** `/health/ready` оставлен для обратной совместимости рядом с `/readyz`.

## Следующий логический блок задач

Рекомендую далее блок backend security (#114 + #115 + #119) связанной триадой. Они меняют auth flow и должны идти вместе, иначе будут конфликты. Отдельно — #113 Prisma migrations (foundation для всего остального backend).
