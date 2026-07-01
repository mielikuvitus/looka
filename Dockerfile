# Looka — one image, one origin.
#
# Builds the frontend, then runs the backend which serves that static build
# AND /api on a single port (no CORS). SQLite lives on a mounted volume at
# /app/backend/data (see docker-compose.yml).

FROM node:24-slim

# better-sqlite3 may compile a native addon; give it the toolchain to be safe.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

ENV PNPM_HOME=/root/.local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

WORKDIR /app

# Install deps first for better layer caching.
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY frontend/package.json ./frontend/
COPY backend/package.json ./backend/
RUN pnpm install --frozen-lockfile

# Copy the rest and build the frontend into frontend/dist.
COPY . .
RUN pnpm --filter frontend build

ENV NODE_ENV=production
ENV PORT=8787
EXPOSE 8787

# Backend runs migrations on boot, then serves ../frontend/dist + /api.
CMD ["pnpm", "--filter", "backend", "start"]
