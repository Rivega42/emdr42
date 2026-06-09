# syntax=docker/dockerfile:1.6
# NestJS API. Контекст билда — корень монорепо (pnpm workspace).
#
# #208 решён: workspace-пакеты @emdr42/* теперь собираются в dist/index.js
# (main: ./dist/index.js). NestJS читает их в runtime через require —
# нет TS-import-ошибок. Сначала собираем packages, потом api.

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

RUN pnpm --filter @emdr42/api exec prisma generate \
 && pnpm --filter "./packages/*" build \
 && pnpm --filter @emdr42/api build

FROM node:20-alpine AS production
WORKDIR /repo
ENV NODE_ENV=production

RUN apk add --no-cache tini openssl wget

# Копируем весь workspace-tree (node_modules + packages + built dist).
# Symlinks @emdr42/* резолвятся внутри /repo. Runtime-импорт TS-source — #208.
COPY --from=builder --chown=node:node /repo /repo

RUN chmod +x /repo/services/api/docker-entrypoint.sh

WORKDIR /repo/services/api
USER node
EXPOSE 8000
ENTRYPOINT ["tini", "--", "/repo/services/api/docker-entrypoint.sh"]
