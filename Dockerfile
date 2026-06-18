# Timeweb App Platform — use this Dockerfile (Settings → Deploy type: Dockerfile)
# Health check path in panel: /health  (NOT /api/health — that checks DB)
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
RUN npm ci -w backend
COPY backend ./backend
RUN npm run build -w backend

FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
RUN npm ci -w backend --omit=dev
COPY --from=builder /app/backend/dist ./backend/dist
ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001
HEALTHCHECK --interval=15s --timeout=5s --start-period=45s --retries=5 \
  CMD wget -qO- http://127.0.0.1:${PORT}/health || exit 1
CMD ["node", "backend/dist/index.js"]
