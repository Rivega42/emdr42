# syntax=docker/dockerfile:1.6
# NestJS API service. Контекст билда — корень монорепо (pnpm workspace).
# Сборка через pnpm + corepack. Финальный stage с non-root user (uid 1000)
# совпадает с k8s runAsUser в pod securityContext.

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

# Prisma generate + build API
RUN pnpm --filter @emdr42/api exec prisma generate
RUN pnpm --filter @emdr42/api build

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache dumb-init wget tini

# Копируем только то что нужно runtime — node_modules + dist + prisma.
COPY --from=build /repo/services/api/dist ./dist
COPY --from=build /repo/services/api/prisma ./prisma
COPY --from=build /repo/services/api/package.json ./package.json
COPY --from=build /repo/services/api/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
# node_modules через pnpm symlinks — копируем resolved tree.
COPY --from=build /repo/node_modules /repo/node_modules
COPY --from=build /repo/packages /repo/packages

# pnpm создал symlinks в services/api/node_modules → /repo/node_modules
COPY --from=build /repo/services/api/node_modules ./node_modules

RUN chmod +x /usr/local/bin/docker-entrypoint.sh && \
    chown -R node:node /app /repo

USER node
EXPOSE 8000
ENTRYPOINT ["tini", "--", "/usr/local/bin/docker-entrypoint.sh"]
