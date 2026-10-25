# Production image (built by OpenShip on the self-hosted box).
#
# Why a Dockerfile of our own: without one, OpenShip generates its own and writes
# EVERY env variable in clear into a RUN line. With this one, OpenShip passes them
# as --build-arg, and an undeclared build arg reaches neither the image nor the
# logs. Only NEXT_PUBLIC_SITE_URL is declared: `next build` inlines it.
# DATABASE_URL and CRON_SECRET only exist at runtime (container env).
#
#   docker build --build-arg NEXT_PUBLIC_SITE_URL=https://ots.example.com .

FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci --no-audit --no-fund
COPY . .
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_TELEMETRY_DISABLED=1
# lib/env.ts validates DATABASE_URL when routes are loaded at build: same placeholder as CI.
RUN DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder npm run build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
USER node
EXPOSE 3000
CMD ["node", "server.js"]
