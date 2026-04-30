#!/bin/sh
# Docker entrypoint: applies Prisma migrations before starting API
set -e

echo "[entrypoint] Running prisma migrate deploy..."
npx prisma migrate deploy

echo "[entrypoint] Starting API server..."
exec node dist/main
