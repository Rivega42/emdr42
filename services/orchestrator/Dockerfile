FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY packages/emdr-engine/package.json ./packages/emdr-engine/
COPY packages/ai-providers/package.json ./packages/ai-providers/
RUN npm install
COPY . .
RUN cd services/orchestrator && npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/services/orchestrator/dist ./dist
COPY --from=builder /app/services/orchestrator/package.json ./
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 8002
CMD ["node", "dist/server.js"]
