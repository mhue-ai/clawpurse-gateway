FROM node:20-alpine

# better-sqlite3 requires build tools
RUN apk add --no-cache python3 make g++ curl

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build

# Non-root user
RUN addgroup -g 1001 -S gateway && \
    adduser -S gateway -u 1001 -G gateway
RUN mkdir -p /app/data && chown -R gateway:gateway /app
USER gateway

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${PORT:-4020}/health || exit 1

EXPOSE 4020

CMD ["node", "dist/index.js"]
