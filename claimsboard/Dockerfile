# claimsboard — Nuxt 4 + SQLite, deployed as its own Coolify app from the
# looka monorepo. The build context is the repo ROOT (Coolify: base directory
# "/", dockerfile location "/claimsboard/Dockerfile") so the pnpm workspace
# lockfile is available. COPY paths below are relative to the repo root.

# ---------- build ----------
FROM node:24-slim AS build

# better-sqlite3 compiles a native addon; give it the toolchain.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

ENV PNPM_HOME=/root/.local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

WORKDIR /app

# Workspace manifests first for layer caching. All members must be present so
# pnpm can validate the frozen lockfile, even though we only build claimsboard.
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY claimsboard/package.json ./claimsboard/
COPY frontend/package.json ./frontend/
COPY backend/package.json ./backend/
RUN pnpm install --frozen-lockfile --filter claimsboard...

# Build the Nitro server, then generate a pre-seeded demo database
# (3 users + 18 claims). The seed runs migrations itself before inserting.
COPY claimsboard ./claimsboard
RUN pnpm --filter claimsboard build \
  && cd claimsboard \
  && DB_PATH=/app/claimsboard/seed.sqlite pnpm db:seed \
  # Checkpoint the WAL back into the main file so we can ship a single .sqlite.
  && node -e "const D=require('better-sqlite3');const db=new D('/app/claimsboard/seed.sqlite');db.pragma('wal_checkpoint(TRUNCATE)');db.close()"

# ---------- runtime ----------
FROM node:24-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV DB_PATH=/app/data/claimsboard.sqlite

# Nitro output bundles its own node_modules, including the better-sqlite3 addon.
COPY --from=build /app/claimsboard/.output ./.output
# Migration SQL, resolved at runtime relative to cwd (/app) by the boot plugin.
COPY --from=build /app/claimsboard/server/db/migrations ./server/db/migrations
# Pre-seeded database, installed into the volume on first boot only.
COPY --from=build /app/claimsboard/seed.sqlite ./seed.sqlite
COPY claimsboard/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", ".output/server/index.mjs"]
