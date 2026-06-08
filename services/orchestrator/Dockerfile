# syntax=docker/dockerfile:1.6
# Orchestrator (Socket.io WS) service. Контекст билда — корень монорепо.

FROM node:20-alpine AS deps
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

FROM node:20-alpine AS build
WORKDIR /repo
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/packages ./packages
COPY --from=deps /repo/services ./services
COPY . .

RUN pnpm --filter @emdr42/orchestrator build

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production PORT=8002

RUN apk add --no-cache tini wget

COPY --from=build /repo/services/orchestrator/dist ./dist
COPY --from=build /repo/services/orchestrator/package.json ./package.json
COPY --from=build /repo/node_modules /repo/node_modules
COPY --from=build /repo/packages /repo/packages
COPY --from=build /repo/services/orchestrator/node_modules ./node_modules

RUN chown -R node:node /app /repo

USER node
EXPOSE 8002
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8002/health || exit 1
ENTRYPOINT ["tini", "--", "node", "dist/server.js"]
