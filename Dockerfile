FROM node:22-alpine

# Install dependencies for better-sqlite3 and curl for health checks
RUN apk add --no-cache python3 make g++ curl

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source and build
COPY . .
RUN npm run build

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S gateway -u 1001 -G nodejs

# Set permissions
RUN chown -R gateway:nodejs /app
USER gateway

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:$GATEWAY_PORT/health || exit 1

# Expose port
EXPOSE 4020

CMD ["npm", "start"]