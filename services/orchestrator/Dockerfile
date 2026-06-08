# syntax=docker/dockerfile:1.6
# Orchestrator (Socket.io WS). Контекст билда — корень монорепо.
# esbuild bundle инлайнит workspace-пакеты @emdr42/* (которые экспортируют
# TS-source) в единый dist/server.js. Реальные npm-deps остаются external
# и ставятся в runner через pnpm --prod deploy.

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

# esbuild bundle (@emdr42/* инлайнены) + deploy с прод-зависимостями.
RUN pnpm --filter @emdr42/orchestrator build \
 && pnpm --filter @emdr42/orchestrator --prod deploy /app

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production PORT=8002

RUN apk add --no-cache tini wget

COPY --from=builder --chown=node:node /app /app

USER node
EXPOSE 8002
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8002/health || exit 1
ENTRYPOINT ["tini", "--", "node", "dist/server.js"]
