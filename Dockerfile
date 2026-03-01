# - STAGE 1: INSTALL ALL DEPS (INCLUDES DEVDEPS FOR BUILD TOOLS) - \\
FROM node:20-slim AS deps-dev
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci


# - STAGE 2: INSTALL PROD DEPS ONLY (FOR FINAL IMAGE) - \\
FROM node:20-slim AS deps-prod
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev


# - STAGE 3: BUILD TYPESCRIPT - \\
FROM node:20-slim AS builder
WORKDIR /app

COPY --from=deps-dev /app/node_modules ./node_modules
COPY . .

# - ENSURE OPTIONAL ASSET DIRS EXIST SO RUNNER COPY NEVER FAILS - \\
RUN mkdir -p /app/assets /app/staff-information

RUN npm run build:fast


# - STAGE 4: MINIMAL PRODUCTION IMAGE - \\
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

# - COPY PRODUCTION NODE_MODULES (NO DEVDEPS) - \\
COPY --from=deps-prod /app/node_modules ./node_modules

# - COPY COMPILED OUTPUT - \\
COPY --from=builder /app/dist ./dist

# - COPY STATIC ASSETS REQUIRED AT RUNTIME - \\
COPY --from=builder /app/assets ./assets
COPY --from=builder /app/staff-information ./staff-information

COPY package.json ./

EXPOSE 3001

CMD ["npm", "run", "start:all"]
