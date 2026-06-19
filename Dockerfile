FROM node:22-slim

WORKDIR /app

# Copy workspace manifests before npm ci (layer cache + workspace resolution)
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/

# Install all deps including devDependencies (tsc, @types/*)
RUN npm ci --include=dev

COPY . .

RUN npm run build -w backend

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["node", "backend/dist/index.js"]
