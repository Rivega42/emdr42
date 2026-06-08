# RUNBOOK — EMDR-AI Operations

Руководство по операциям и траблшутингу. Обновлять при каждом изменении инфраструктуры.

---

## 1. Архитектура

```
           [Cloudflare/LB — TLS termination]
                     │
                     ▼
             [nginx gateway]
         ┌─────────┼──────────┐
         ▼         ▼          ▼
   [frontend]  [api]   [orchestrator]
                │           │
        ┌───────┼───────────┼─────────┐
        ▼       ▼           ▼         ▼
    [postgres] [redis] [livekit]  [ollama/whisper/piper/vosk]
        │           │
   [minio/S3]   [prometheus]
                    │
                [grafana + loki]
```

Ports (development):
- 80 (gateway), 3000 (frontend), 8000 (api), 8002 (orchestrator)
- 5432 (postgres), 6379 (redis), 7880 (livekit)
- 9090 (prometheus), 3001 (grafana), 9000/9001 (minio)
- 11434 (ollama), 8001 (whisper), 5000 (piper), 2700 (vosk)

---

## 2. Healthchecks

| Service | Endpoint |
|---------|----------|
| API liveness | `GET /healthz` |
| API readiness | `GET /readyz` (проверяет DB) |
| Orchestrator | `GET /health` |
| Gateway | `GET /gateway/health` |
| LiveKit | `GET /` |
| Frontend | `GET /` |

Все сервисы в `docker-compose.yml` имеют healthcheck — `docker compose ps` покажет `(healthy)`.

---

## 3. Деплой

### Production deploy

1. Мерж в `main` → GitHub Actions запускает `.github/workflows/docker.yml`
2. Docker images пушатся в registry
3. SSH на prod хост → `cd /opt/emdr42 && git pull && docker compose pull && docker compose up -d`
4. Миграции применяются автоматом через `docker-entrypoint.sh` в api контейнере
5. Проверить `/healthz` и `/readyz` вернули 200

### Rollback

```bash
# Откат commit
git log --oneline | head -5
git checkout <previous_commit>
docker compose pull && docker compose up -d

# Откат миграции (опасно, сначала проверить на staging)
npx prisma migrate resolve --rolled-back <migration_name>
```

**ВАЖНО:** миграции необратимы по умолчанию. Для каждой проверяем — можно ли откатить без data loss?

---

## 4. Часто встречающиеся инциденты

### 4.1 API возвращает 503 на `/readyz`

Причина: БД недоступна.

```bash
# Проверить postgres
docker compose ps postgres
docker compose logs postgres --tail 50

# Попробовать подключиться
docker exec -it <postgres_container> psql -U emdr42 -d emdr42

# Если упал — restart
docker compose restart postgres
# Убедиться что volume на месте
docker volume inspect emdr42_postgres_data
```

### 4.2 Orchestrator OOM / высокое потребление памяти

Ожидаемые sessions live в памяти + TTL eviction (`SessionRegistry`, #117).

```bash
# Проверить размер Maps
docker exec <orchestrator> node -e "process.report.writeReport()"

# Посмотреть метрику (если #82/#83 готово)
curl http://localhost:8002/metrics | grep orchestrator_active

# Перезапустить (graceful shutdown — все sessions: endSession() + drain)
docker compose restart orchestrator
```

Если утечка подтверждена — открыть issue, увеличить `idleTimeoutMs` в SessionRegistry не как решение, а как temporary bandaid.

### 4.3 LLM зависает / timeout

Circuit Breaker (#116) должен автоматически переключить на fallback через 30s.

```bash
# Проверить состояние
curl http://localhost:8002/ai/breaker-states  # TODO добавить endpoint в #82
# Или в логах orchestrator:
docker compose logs orchestrator | grep -i "circuit\|timeout\|fallback"
```

Если все провайдеры OPEN:
- Anthropic / OpenAI upstream инцидент — проверить status pages
- Локальный Ollama: `docker compose restart ollama`

### 4.4 Пользователи не могут логиниться (повсеместно)

1. Проверить `POST /auth/login`:
   ```bash
   curl -X POST https://api.emdr42.com/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@test.com","password":"..."}'
   ```

2. Если 503 — api не стартанул. Логи:
   ```bash
   docker compose logs api --tail 100
   ```

3. Частая причина: `JWT_SECRET` изменился → все существующие токены невалидны.
   Решение: все пользователи должны залогиниться заново. НЕ откатывать JWT_SECRET в middle-ground.

4. Если BCRYPT ошибки — проверить CPU (bcrypt cost 12 интенсивен).

### 4.5 Crisis alert не доходит до терапевта

Проверить:
1. SMTP настроен (`SMTP_HOST` env, #149)
2. `NotificationsService.notify({ type: 'therapist_crisis_alert' })` вызван — проверить AuditLog
3. Therapist email корректен
4. Проверить `crisisEvent` запись в БД:
   ```sql
   SELECT * FROM "CrisisEvent" ORDER BY "createdAt" DESC LIMIT 10;
   ```

### 4.6 Stripe webhook не приходит / не обрабатывается

1. Stripe Dashboard → Webhooks → проверить endpoint status
2. Logs:
   ```bash
   docker compose logs api | grep -i stripe
   ```
3. Signature mismatch: убедиться что `STRIPE_WEBHOOK_SECRET` совпадает с console
4. Raw body: убедиться что `NestFactory.create({ rawBody: true })` включён

### 4.7 Database disk full

```bash
docker exec <postgres> du -sh /var/lib/postgresql/data
```

Если >80%:
1. Запустить VACUUM: `psql -c "VACUUM FULL ANALYZE;"` (блокирующий!)
2. Проверить retention job: старые sessions должны soft-deleteиться (#121)
3. Удалить old audit logs > 6 лет (HIPAA retention)
4. Если growth через EmotionRecord — подумать о партиционировании по месяцам

---

## 5. Мониторинг / алерты

### 5.1 Prometheus queries (после #82/#83/#138)

```promql
# High error rate
rate(http_requests_total{status=~"5.."}[5m]) > 0.1

# Orchestrator sessions
orchestrator_active_sessions

# API p95 latency
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Redis memory
redis_memory_used_bytes / redis_memory_max_bytes > 0.8
```

### 5.2 Alertmanager rules (TODO #138)

- API error rate > 5% в течение 5 мин → page on-call
- Disk usage > 85% → warning
- БД connections > 80% pool → warning
- Crisis event severity=CRITICAL → **page on-call + email**

---

## 6. Backup / Restore

См. `docs/DATA_RETENTION.md` + `scripts/backup-postgres.sh` (#137).

Quick commands:
```bash
# Manual backup
docker exec <postgres> pg_dump -U emdr42 emdr42 | gzip > backup-$(date +%F).sql.gz

# Restore (destructive!)
gunzip -c backup.sql.gz | docker exec -i <postgres> psql -U emdr42 emdr42
```

---

## 7. Secrets rotation

Когда ротировать:
- JWT_SECRET — раз в 90 дней или при подозрении на утечку (все пользователи выйдут из системы)
- PHI_ENCRYPTION_KEY — **ОСТОРОЖНО**: требует re-encrypt всех existing PHI данных; только с миграцией
- POSTGRES_PASSWORD — не в проде без связки с vault
- LIVEKIT_API_SECRET — раз в 90 дней; нужно обновить в обоих api + orchestrator
- STRIPE_SECRET_KEY — в Stripe Dashboard → rotate

---

## 8. On-call responsibilities

- Мониторить pager 24/7
- Reagировать в течение 15 мин на CRITICAL alerts
- Документировать каждый инцидент в `INCIDENT_LOG.md`
- Writing postmortems для инцидентов severity HIGH+ в течение 48 часов

## 9. Полезные команды

```bash
# Посмотреть активные sessions в orchestrator
curl http://localhost:8002/debug/registry  # TODO добавить

# Audit log последних 100 записей
psql -c 'SELECT * FROM "AuditLog" ORDER BY timestamp DESC LIMIT 100;'

# Crisis events за 24h
psql -c 'SELECT * FROM "CrisisEvent" WHERE "createdAt" > NOW() - INTERVAL \'24 hours\';'

# Usage costs за 7d
psql -c 'SELECT SUM("costUsd") FROM "UsageLog" WHERE "timestamp" > NOW() - INTERVAL \'7 days\';'

# Active Stripe subscriptions
psql -c 'SELECT plan, status, COUNT(*) FROM "Subscription" GROUP BY plan, status;'
```
