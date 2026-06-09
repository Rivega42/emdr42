# DEPLOYMENT — EMDR-AI

Процедуры деплоя, окружения, rollback и миграций. Обновлять при изменении пайплайна.

---

## 1. Окружения

| Окружение | Что | Как деплоится |
|-----------|-----|---------------|
| development | локальный docker-compose | `docker-compose up` |
| staging | self-hosted docker-compose | теги/main → `deploy-staging.yml` (требует GitHub Environment `staging`, см. #155) |
| production | self-hosted (бэкенд) + Vercel (фронтенд) | теги `v*` → `deploy-prod.yml` с manual approval |

Frontend дополнительно деплоится на Vercel (`vercel.json`: pnpm install/build, env через project secrets `@emdr42-api-url`, `@emdr42-ws-url`).

---

## 2. Предусловия

- Все секреты заполнены (см. `.env.example`); прод-секреты — в vault/K8s secrets, не в `.env`
- `POSTGRES_PASSWORD`, `JWT_SECRET`, `PHI_ENCRYPTION_KEY`, `LIVEKIT_API_SECRET` — `openssl rand -base64 48`
- CI зелёный на коммите: Lint & Test, Build Application, Security Scan, Gitleaks, 4 Docker build

---

## 3. Порядок деплоя (бэкенд, docker-compose)

```bash
# 1. Зафиксировать версию
git tag v0.X.Y && git push origin v0.X.Y

# 2. На сервере: получить образы / код
git fetch --tags && git checkout v0.X.Y

# 3. Прогнать миграции ДО рестарта API (см. §5)
docker-compose run --rm api npx prisma migrate deploy

# 4. Перезапуск с новыми образами
docker-compose pull && docker-compose up -d --build

# 5. Smoke-check
curl -fsS http://localhost:8000/healthz
curl -fsS http://localhost:8000/readyz
curl -fsS http://localhost:8002/health
```

Frontend (Vercel) деплоится автоматически из main; production-промоушен — через Vercel dashboard или `vercel promote`.

---

## 4. Rollback

```bash
# Код: вернуться на предыдущий тег
git checkout v0.X.(Y-1)
docker-compose up -d --build

# Vercel: instant rollback на предыдущий deployment в dashboard
```

**Миграции не откатываем** автоматически. Prisma не генерирует down-миграции;
все наши миграции — аддитивные (новые таблицы/колонки/индексы), старый код
работает поверх новой схемы. Если миграция ломает обратную совместимость —
она должна быть разбита на expand → migrate → contract (три релиза).

---

## 5. Миграции БД

- Каталог: `services/api/prisma/migrations/` (закоммичены, версионируются)
- Применение: `npx prisma migrate deploy` (идемпотентно, только вперёд)
- Проверка drift: `npx prisma migrate status`
- **Правило:** миграции запускаются ДО выкатки нового кода API; новый код
  не должен требовать колонок, которых миграция ещё не создала

---

## 6. Чеклист релиза

- [ ] CI зелёный (code-quality гейты)
- [ ] `pnpm -r test` локально
- [ ] Миграции применены на staging, `migrate status` чистый
- [ ] Smoke-тест staging: login → session start → emotion stream
- [ ] Тег `v*`, approval founders (production environment)
- [ ] Post-deploy: `/healthz`, `/readyz`, Grafana — error rate, latency
- [ ] Бэкап перед миграцией с DDL (см. DISASTER_RECOVERY.md)

---

## 7. Связанные документы

- `docs/RUNBOOK.md` — операции и траблшутинг
- `docs/DISASTER_RECOVERY.md` — RTO/RPO, восстановление
- `docs/INCIDENT_RESPONSE.md` — эскалация при инцидентах
- `.github/workflows/` — ci, docker, deploy-staging, deploy-prod
