# Деплой EMDR42 на single-node сервер (docker compose)

Runbook для боевого сервера emdr42.ru (1 CPU, 8 GB RAM, без GPU).
Файлы: `docker-compose.production.yml`, `.env.production.example`,
`services/gateway/nginx.production.conf`, `livekit.production.yaml`,
`deploy/nginx-host-emdr42.ru.conf`.

## Архитектура

```
                    браузер
                       │ https / wss
                       ▼
        host nginx (TLS, certbot, emdr42.ru)
          │ /livekit/ ──► 127.0.0.1:7880  livekit (signaling)
          │ /*        ──► 127.0.0.1:8800  gateway (docker)
                                │ /api/*      ──► api:8000        (срез /api)
                                │ /socket.io/ ──► orchestrator:8002
                                │ /*          ──► frontend:3000
        браузер ──RTC──► :7881/tcp, :50000-50100/udp (LiveKit media)
```

- api / orchestrator / gateway — образы из ghcr (CI собирает из main).
- frontend собирается на сервере: `NEXT_PUBLIC_*` вшиваются в артефакт.
- ollama/whisper/vosk/piper НЕ разворачиваются (нет GPU). AI-диалоги — через
  cloud-провайдеров при наличии ключей в `.env`.
- prometheus/grafana/minio не разворачиваются (не подключены к приложению).

## Порты на хосте

| Порт | Сервис | Доступ |
|------|--------|--------|
| 8800 | gateway | 127.0.0.1 |
| 8801 | api | 127.0.0.1 (отладка) |
| 8802 | orchestrator | 127.0.0.1 (отладка) |
| 3801 | frontend | 127.0.0.1 (отладка) |
| 5436 | postgres | 127.0.0.1 |
| 7880 | livekit signaling | 127.0.0.1 |
| 7881, 50000-50100/udp | livekit RTC | публичный |

5432–5435, 6379, 3000–3700, 5000, 8000–8090, 9000–9091 заняты другими
проектами на этом сервере — не использовать.

## Первый запуск

```bash
cd /opt/emdr42-docker
cp .env.production.example .env
# заполнить CHANGE_ME: openssl rand -base64 32

P=emdr42-prod
F=docker-compose.production.yml
docker compose -f $F -p $P pull
docker compose -f $F -p $P build frontend     # ~15-30 мин на 1 CPU
docker compose -f $F -p $P up -d postgres redis
docker compose -f $F -p $P run --rm migrate   # prisma migrate deploy
docker compose -f $F -p $P up -d
docker compose -f $F -p $P ps                 # все healthy?
```

## Smoke-тесты

```bash
curl -fsS http://127.0.0.1:8801/healthz                  # api напрямую
curl -fsS http://127.0.0.1:8800/gateway/health           # gateway
curl -fsS http://127.0.0.1:8800/api/healthz              # gateway -> api (срез /api)
curl -fsS http://127.0.0.1:8802/health                   # orchestrator
curl -fsS -o /dev/null -w '%{http_code}' http://127.0.0.1:8800/   # frontend = 200
# регистрация через gateway:
curl -fsS -X POST http://127.0.0.1:8800/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"smoke@test.local","password":"Sm0ke!Test42","name":"Smoke"}'
```

## Переключение трафика (старая → новая)

Старая версия: PM2 `emdr42` (next start :3700) из /opt/emdr42, nginx vhost
`/etc/nginx/sites-available/emdr42.ru` проксирует на :3700.

```bash
cp /etc/nginx/sites-available/emdr42.ru /root/backups/nginx-emdr42.ru.$(date +%F)
cp /opt/emdr42-docker/deploy/nginx-host-emdr42.ru.conf /etc/nginx/sites-available/emdr42.ru
nginx -t && systemctl reload nginx
```

Откат (мгновенный):

```bash
cp /root/backups/nginx-emdr42.ru.<дата> /etc/nginx/sites-available/emdr42.ru
nginx -t && systemctl reload nginx
```

Старый PM2-процесс остаётся работать до подтверждения стабильности
(`pm2 stop emdr42` — только после; `pm2 delete emdr42` + `pm2 save` — когда
новая версия проверена в бою).

## Обновление версии

```bash
cd /opt/emdr42-docker && git pull
docker compose -f $F -p $P pull
docker compose -f $F -p $P build frontend   # если менялся фронт/NEXT_PUBLIC_*
docker compose -f $F -p $P run --rm migrate # если есть новые миграции
docker compose -f $F -p $P up -d
```

## Бэкапы БД

Дамп старой (PM2-эпоха, host postgres :5434, 9 users) сохранён:
`/root/backups/emdr42-host-pg5434-20260612.sql.gz`.

Новая БД:

```bash
docker exec emdr42-prod-postgres-1 pg_dump -U emdr42 emdr42 | gzip \
  > /root/backups/emdr42-docker-$(date +%F).sql.gz
```
