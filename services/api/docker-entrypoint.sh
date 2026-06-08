#!/bin/sh
# Docker entrypoint.
#
# В мульти-репликной среде Prisma migrate в КАЖДОМ pod при старте — анти-паттерн:
# advisory lock спасает от двойного применения, но создаёт N RTT к БД и
# усложняет диагностику. В K8s используется отдельный pre-deploy Job
# (k8s/base/migrate-job.yaml). По умолчанию entrypoint мигрирует ТОЛЬКО при
# явном RUN_MIGRATIONS=1 (например, на dev-стенде без k8s).
set -e

if [ "${RUN_MIGRATIONS}" = "1" ]; then
  echo "[entrypoint] RUN_MIGRATIONS=1 — running prisma migrate deploy..."
  npx prisma migrate deploy
fi

echo "[entrypoint] Starting API server..."
exec node dist/main
