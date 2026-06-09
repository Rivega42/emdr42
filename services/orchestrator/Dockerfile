# syntax=docker/dockerfile:1.6
# Orchestrator (Socket.io WS). Контекст билда — корень монорепо.
# esbuild bundle инлайнит workspace-пакеты @emdr42/* в единый dist/server.js.
# Runner ставит только внешние runtime-зависимости (через npm, без workspace) —
# это надёжнее pnpm deploy (капризен в pnpm 10) и даёт минимальный образ.

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

# Сначала собираем packages в dist/ (новый main), потом orchestrator esbuild
# подхватывает их компилированные версии.
RUN pnpm --filter "./packages/*" build \
 && pnpm --filter @emdr42/orchestrator build

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production PORT=8002

RUN apk add --no-cache tini wget

# Bundle (self-contained кроме external npm-deps).
COPY --from=builder --chown=node:node /repo/services/orchestrator/dist ./dist

# Только внешние runtime-зависимости (esbuild оставил их external).
# Версии синхронны с services/orchestrator/package.json.
RUN npm install --no-save --omit=dev \
      ioredis@^5.3.2 \
      jsonwebtoken@^9.0.2 \
      prom-client@^15.1.3 \
      socket.io@^4.7.4 \
      ws@^8.16.0 \
 && chown -R node:node /app

USER node
EXPOSE 8002
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8002/health || exit 1
ENTRYPOINT ["tini", "--", "node", "dist/server.js"]
