# Multi-stage build for optimized image size
FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++ git

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY npm-wrapper/package*.json ./npm-wrapper/

# Install dependencies
RUN npm ci --only=production
RUN cd npm-wrapper && npm ci --only=production

# Copy source code
COPY . .

# Production stage
FROM node:20-alpine

# Install runtime dependencies
RUN apk add --no-cache \
    sqlite \
    tini

# Create non-root user
RUN addgroup -g 1001 -S flutter && \
    adduser -S flutter -u 1001

# Set working directory
WORKDIR /app

# Copy from builder
COPY --from=builder --chown=flutter:flutter /app /app

# Create cache directory
RUN mkdir -p /app/.cache && chown -R flutter:flutter /app/.cache

# Switch to non-root user
USER flutter

# Environment variables
ENV NODE_ENV=production \
    CACHE_DIR=/app/.cache \
    MCP_MODE=stdio

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('./src/tools/unifiedTools.js').flutterStatus().then(() => process.exit(0)).catch(() => process.exit(1))"

# Use tini for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Default command
CMD ["node", "src/index.js"]