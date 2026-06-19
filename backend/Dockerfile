FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
COPY backend/package.json ./backend/
RUN npm ci -w backend
COPY backend ./backend
RUN npm run build -w backend

FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
COPY backend/package.json ./backend/
RUN npm ci -w backend --omit=dev
COPY --from=builder /app/backend/dist ./backend/dist
ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "backend/dist/index.js"]
