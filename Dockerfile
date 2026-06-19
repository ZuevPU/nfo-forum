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

# Docker HEALTHCHECK lets Timeweb wait for the app to be ready
# instead of relying on its external probe timing out
HEALTHCHECK --interval=5s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:'+process.env.PORT+'/health',function(r){process.exit(r.statusCode===200?0:1)}).on('error',function(){process.exit(1)})"

CMD ["node", "backend/dist/index.js"]
