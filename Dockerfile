# Build stage
FROM oven/bun:1 AS builder

WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build arg for domain (baked into frontend at build time)
ARG ECHO_DOMAIN=echo.example.com
ENV ECHO_DOMAIN=$ECHO_DOMAIN

# Build frontend
RUN bun run build

# Production stage
FROM oven/bun:1-slim AS runner

WORKDIR /app

# Copy package files and install production deps
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile --production

# Copy built frontend
COPY --from=builder /app/dist ./dist

# Copy server source (Bun runs TS directly)
COPY --from=builder /app/src ./src

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Run the server
CMD ["bun", "run", "src/server/index.ts"]
