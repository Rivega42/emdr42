FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json* ./
COPY packages/emdr-engine/package.json ./packages/emdr-engine/
COPY packages/ai-providers/package.json ./packages/ai-providers/
RUN npm ci

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN cd services/orchestrator && npm run build

FROM base AS production
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/services/orchestrator/dist ./dist
COPY --from=build /app/services/orchestrator/package.json ./
EXPOSE 8002
CMD ["node", "dist/server.js"]
