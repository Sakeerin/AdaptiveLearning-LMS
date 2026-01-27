# Build stage
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

WORKDIR /app

# Copy workspace and config files first
COPY pnpm-workspace.yaml package.json tsconfig.json ./
COPY packages/shared/package.json packages/shared/tsconfig.json ./packages/shared/
COPY packages/api/package.json packages/api/tsconfig.json ./packages/api/

# Copy lock file if it exists (optional)
COPY pnpm-lock.yam[l] ./

# Install dependencies
RUN pnpm install

# Copy source code
COPY packages/shared/src ./packages/shared/src
COPY packages/api/src ./packages/api/src

# Build shared package first, then API
RUN pnpm --filter @adaptive-lms/shared build
RUN pnpm --filter @adaptive-lms/api build

# Production stage
FROM node:20-alpine AS production

# Install pnpm
RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

WORKDIR /app

# Copy workspace files
COPY pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/api/package.json ./packages/api/

# Copy lock file if it exists (optional)
COPY pnpm-lock.yam[l] ./

# Install production dependencies only
RUN pnpm install --prod

# Copy built files
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/api/dist ./packages/api/dist

# Set environment
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Run API
CMD ["node", "packages/api/dist/index.js"]

# Development stage
FROM node:20-alpine AS development

# Install pnpm
RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

WORKDIR /app

# Copy workspace and config files first
COPY pnpm-workspace.yaml package.json tsconfig.json ./
COPY packages/shared/package.json packages/shared/tsconfig.json ./packages/shared/
COPY packages/api/package.json packages/api/tsconfig.json ./packages/api/

# Copy lock file if it exists (optional)
COPY pnpm-lock.yam[l] ./

# Install all dependencies
RUN pnpm install

# Copy source code (will be overridden by volume mount in development)
COPY packages/shared/src ./packages/shared/src
COPY packages/api/src ./packages/api/src

# Build shared package
RUN pnpm --filter @adaptive-lms/shared build

ENV NODE_ENV=development
ENV PORT=3001

EXPOSE 3001

# Run in development mode
CMD ["pnpm", "--filter", "@adaptive-lms/api", "dev"]
