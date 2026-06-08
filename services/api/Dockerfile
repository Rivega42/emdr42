# syntax=docker/dockerfile:1.6
# NestJS API. Контекст билда — корень монорепо (pnpm workspace).
# `pnpm deploy` создаёт self-contained директорию (без symlinks в .pnpm),
# которую можно скопировать в минимальный runner.

FROM node:20-alpine AS builder
WORKDIR /repo
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/core/package.json ./packages/core/
COPY packages/emdr-engine/package.json ./packages/emdr-engine/
COPY packages/ai-providers/package.json ./packages/ai-providers/
COPY packages/events/package.json ./packages/events/
COPY packages/livekit-integration/package.json ./packages/livekit-integration/
COPY services/api/package.json ./services/api/
COPY services/orchestrator/package.json ./services/orchestrator/

RUN pnpm install --frozen-lockfile

COPY . .

# Prisma generate + build, затем deploy в self-contained директорию.
RUN pnpm --filter @emdr42/api exec prisma generate \
 && pnpm --filter @emdr42/api build \
 && pnpm --filter @emdr42/api --prod deploy /app

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache tini openssl

# Self-contained deploy: dist + prisma + node_modules (без symlinks).
COPY --from=builder --chown=node:node /app /app
RUN chmod +x /app/docker-entrypoint.sh

USER node
EXPOSE 8000
ENTRYPOINT ["tini", "--", "/app/docker-entrypoint.sh"]
