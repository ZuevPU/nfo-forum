FROM node:22-slim

RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/

RUN npm ci --include=dev

COPY . .

RUN npm run build -w backend

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

HEALTHCHECK --interval=3s --timeout=2s --start-period=3s --retries=3 \
  CMD curl -f http://127.0.0.1:8080/health || exit 1

ENTRYPOINT ["node", "backend/dist/index.js"]
