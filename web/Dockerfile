# - STAGE 1: INSTALL DEPENDENCIES - \\
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* .npmrc ./
RUN npm ci --legacy-peer-deps


# - STAGE 2: BUILD - \\
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build


# - STAGE 3: PRODUCTION RUNNER (MINIMAL IMAGE) - \\
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

# - COPY STATIC ASSETS - \\
COPY --from=builder /app/public ./public

# - COPY STANDALONE BUILD (OUTPUT: STANDALONE IN next.config.js) - \\
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
