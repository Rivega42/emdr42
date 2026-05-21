# DevOps правила

Применимо к любому DevOps-агенту или человеку, работающему с инфрой EMDR-AI.

## Общие принципы

1. **Прод неприкасаем без change-window и approval.** GitHub Environment `production` требует manual approval (см. `deploy-prod.yml` после ШАГА 7).
2. **Staging — зеркало прода.** Конфиги совпадают, отличается только масштаб и тестовые данные.
3. **IaC — единственный путь.** Никаких ручных изменений в облачной консоли без последующего отражения в `infra/` или `k8s/`.
4. **Секреты только в Secrets Manager / K8s Secret / GitHub Secrets.** Никогда — в env-файлах, репо, чатах.

## Деплой

- Staging: автоматически на push в `main` после успешного CI.
- Prod: только по тегу `v*` + manual approval.
- Rollback: повторный деплой предыдущего тега. Данные — отдельный план (PITR).

## Изменения схемы БД

1. Prisma migration в feature-ветке.
2. Тест в staging: данные сохранены, миграция идемпотентна.
3. Прод: backup перед `prisma migrate deploy`. Verify через `prisma migrate status`.
4. При фейле — restore из backup, никаких manual fixes на прод-БД.

## Бэкапы

- Daily PostgreSQL `pg_dump` → encrypted S3, retention 30+ дней (#137).
- Continuous WAL archiving для PITR (если managed RDS).
- Quarterly DR-drill с restore в staging.

## Секреты

- Ротация JWT_SECRET / PHI_ENCRYPTION_KEY / API-keys раз в 90 дней.
- При компрометации — немедленная ротация + audit-log просмотр + уведомление пользователей если затронут PHI.
- Секреты в K8s — только `Secret` объекты, монтируем как env, не volumes (для большинства).

## Мониторинг

- `/healthz` — liveness.
- `/readyz` — readiness, проверяет Prisma + Redis (#124).
- Prometheus → Loki → Grafana (#138).
- Sentry для exceptions (#87).
- Алерты P0 → PagerDuty/Telegram.

## Инциденты

- Runbook: [`../../docs/INCIDENT_RESPONSE.md`](../INCIDENT_RESPONSE.md).
- Post-mortem обязателен для P0/P1 в течение 5 рабочих дней.

## Связанные

- [`VIKA_RULES.md`](VIKA_RULES.md) — формат задач для Вики
- [`../../docs/RUNBOOK.md`](../RUNBOOK.md) — операционные сценарии
- [`../runbooks/`](../runbooks/) — расширенные runbooks
