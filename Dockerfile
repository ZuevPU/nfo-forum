FROM node:22-slim

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/

RUN npm ci --include=dev

COPY . .

RUN npm run build -w backend

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

ENTRYPOINT ["node", "backend/dist/index.js"]
