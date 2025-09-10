# Multi-stage Docker build for DashStream API
# Stage 1: Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including dev dependencies for building)
RUN npm ci --only=production

# Stage 2: Production stage
FROM node:18-alpine AS production

# Set environment to production
ENV NODE_ENV=production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S dashstream -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY --chown=dashstream:nodejs . .

# Create necessary directories
RUN mkdir -p logs uploads public && \
    chown -R dashstream:nodejs /app

# Remove unnecessary files
RUN rm -rf .git .env.example README.md docs tests

# Switch to non-root user
USER dashstream

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node -e "require('http').get('http://localhost:5000/health', (res) => { \
        if (res.statusCode !== 200) process.exit(1); \
        res.on('data', () => {}); \
        res.on('end', () => process.exit(0)); \
    }).on('error', () => process.exit(1));"

# Start the application with dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]

# Metadata
LABEL maintainer="DashStream Team"
LABEL version="1.0.0"
LABEL description="DashStream API Server"