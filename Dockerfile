# syntax=docker/dockerfile:1.6
# ============================================================
# Stage 1: Install dependencies (cache layer)
# ============================================================
FROM node:22-alpine AS deps
WORKDIR /app

# tsx perlu untuk npm scripts (db:init, db:seed)
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ============================================================
# Stage 2: Build aplikasi (Next.js standalone)
# ============================================================
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Telemetry off untuk image yang lebih bersih
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# ============================================================
# Stage 3: Runtime image (sangat ramping)
# ============================================================
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# DB di volume mount (lihat docker-compose.yml). Ubah bila perlu.
ENV DATABASE_PATH=/app/data/kwgn.db

# User non-root utk security
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# Folder data yang akan di-mount sebagai volume
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data

# Output standalone Next.js sudah memuat dependencies yang dibutuhkan saja
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Untuk db:init / db:seed perlu node_modules + scripts + tsx
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=builder --chown=nextjs:nodejs /app/src ./src
COPY --from=builder --chown=nextjs:nodejs /app/tsconfig.json ./tsconfig.json
COPY --from=deps     --chown=nextjs:nodejs /app/node_modules/tsx ./node_modules/tsx
COPY --from=deps     --chown=nextjs:nodejs /app/node_modules/@libsql ./node_modules/@libsql
COPY --from=deps     --chown=nextjs:nodejs /app/node_modules/libsql ./node_modules/libsql
COPY --from=deps     --chown=nextjs:nodejs /app/node_modules/dotenv ./node_modules/dotenv
COPY --from=deps     --chown=nextjs:nodejs /app/node_modules/bcryptjs ./node_modules/bcryptjs

# Skrip entrypoint: jalankan migrasi DB lalu start server
COPY --chown=nextjs:nodejs docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER nextjs
EXPOSE 3000

# Healthcheck Docker — cek /api/health.
# Pakai ${PORT:-3000} karena Railway/Render override env PORT (sering 8080/10000).
# Tanpa expansion ini, container ditandai unhealthy meski Next.js sehat.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-3000}/api/health" > /dev/null || exit 1

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server.js"]
