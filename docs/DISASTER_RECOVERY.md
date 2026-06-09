# DISASTER RECOVERY — EMDR-AI

Цели восстановления, процедуры и drill-расписание. PHI-данные: потеря недопустима.

---

## 1. Цели

| Метрика | Цель | Обоснование |
|---------|------|-------------|
| RPO (потеря данных) | ≤ 24 ч (бэкап) / ≤ 5 мин (с WAL-архивацией, #137) | PHI + клинические записи |
| RTO (время восстановления) | ≤ 4 ч | Терапия не экстренная служба, но crisis-данные критичны |

Текущее состояние: автоматические бэкапы НЕ настроены (#137 — P0 blocker
для production). До его закрытия production-запуск запрещён.

---

## 2. Что бэкапим

| Данные | Где | Метод |
|--------|-----|-------|
| PostgreSQL (PHI, сессии, audit) | volume `postgres_data` | `pg_dump` daily + WAL archiving (целевое) |
| MinIO/S3 (записи сессий) | volume minio | bucket replication / sync |
| Redis | volume redis | НЕ бэкапим — кэш/трансиент (rate-limits, circuit state) |
| Конфигурация | git | уже версионируется |
| Секреты (.env) | vault | вне репо; восстановление из vault |

PHI-бэкапы — только в **encrypted** хранилище (SSE-KMS / age). Retention
бэкапов: 30 дней; audit-данные внутри БД — 6 лет (HIPAA).

---

## 3. Процедура восстановления (PostgreSQL)

```bash
# 1. Остановить пишущие сервисы
docker-compose stop api orchestrator

# 2. Восстановить из последнего дампа
docker-compose exec -T postgres psql -U emdr42 -c "DROP DATABASE emdr42;"
docker-compose exec -T postgres psql -U emdr42 -c "CREATE DATABASE emdr42;"
cat backup-YYYYMMDD.sql | docker-compose exec -T postgres psql -U emdr42 emdr42

# 3. Проверить целостность
docker-compose run --rm api npx prisma migrate status   # no drift
docker-compose exec postgres psql -U emdr42 -c "SELECT count(*) FROM \"User\";"

# 4. Запустить сервисы, smoke-check
docker-compose up -d
curl -fsS http://localhost:8000/readyz
```

PITR (после #137): `pgbackrest restore --type=time --target="..."`.

---

## 4. Сценарии

| Сценарий | Действия |
|----------|----------|
| Потеря диска postgres | §3 восстановление из бэкапа; RPO = возраст бэкапа |
| Компрометация PHI_ENCRYPTION_KEY | Ротация через PHI_ENCRYPTION_KEYS registry (см. encryption.middleware), re-encrypt batch job, инцидент по INCIDENT_RESPONSE.md |
| Утечка JWT_SECRET | Сменить секрет → все access-токены инвалидируются (15 мин TTL), revoke всех refresh: `UPDATE "RefreshToken" SET "revokedAt"=now();` |
| Полная потеря сервера | Новый хост → git clone, vault secrets, §3 restore, DNS switch |
| Компрометация Stripe webhook secret | Ротация в Stripe dashboard + env; проверить ProcessedStripeEvent на аномалии |

---

## 5. Drill-расписание

- Ежеквартально: restore последнего бэкапа на staging, валидация (§3 шаг 3)
- После каждого drill: обновить этот документ фактическим временем восстановления
- Алерт (после #137): backup не выполнялся > 24 ч → P1

| Дата drill | RTO факт | Результат |
|------------|----------|-----------|
| — | — | drills не проводились |
