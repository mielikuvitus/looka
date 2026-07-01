# Looka backend

A thin, boring TypeScript API. It does three jobs:

1. Serves the four agent **ping** routes (`/api/<member>/ping`).
2. Runs the **SQLite** database (Drizzle ORM) — wired up now, used later.
3. In production, serves the built frontend so the whole app is **one origin**
   (no CORS). In dev, Vite serves the UI and proxies `/api` here.

Stack: [Hono](https://hono.dev) · Drizzle ORM · better-sqlite3 · tsx · OpenAI SDK.

## Run it

```bash
pnpm --filter backend dev     # tsx watch, http://localhost:8787
pnpm --filter backend start   # NODE_ENV=production (also serves ../frontend/dist)
```

The port is `PORT` (default `8787`). From the repo root you can also use
`pnpm dev` (runs frontend + backend together).

## Endpoints

| Method | Path                 | What it does                                        |
| ------ | -------------------- | --------------------------------------------------- |
| GET    | `/api/health`        | Liveness probe → `{ ok, service }`                  |
| GET    | `/api/contract`      | OpenAPI-ish contract JSON (drives `gen:types`)      |
| POST   | `/api/frank/ping`    | frank's agent → **OpenClaw** (`core/llm/openclaw.ts`) |
| POST   | `/api/juan/ping`     | juan's agent → **OpenAI** (`core/llm/openai.ts`)    |
| POST   | `/api/suvi/ping`     | suvi's agent → **OpenAI**                           |
| POST   | `/api/joe/ping`      | joe's agent → **OpenAI**                            |

All `ping` routes return the shared `PingResponse`: `{ member, message, ok }`.

## How the LLM keys are read

Keys come from environment variables (copy `.env.example` → `.env` at the repo
root). **Nothing crashes when a key is missing — you get a clear placeholder.**

- **OpenAI** (`juan`, `suvi`, `joe`): reads `OPENAI_API_KEY`, optional
  `OPENAI_MODEL` (default `gpt-4o-mini`). Missing key → placeholder reply with
  `ok: false`.
- **OpenClaw** (`frank`): reads `OPENCLAW_TOKEN` and `OPENCLAW_GATEWAY_URL`.
  This is a clearly-marked **stub** — with both set it POSTs the prompt to the
  gateway; otherwise it returns a placeholder with `ok: false`. Wire the real
  gateway later.

## Database

SQLite via Drizzle + better-sqlite3. The file lives at `data/looka.sqlite`
(gitignored; a mounted volume in Docker). Panels do **not** persist yet —
reload is a fresh start. The DB is here so future data has a home.

```bash
pnpm --filter backend db:generate   # drizzle-kit: SQL from schema.ts
pnpm --filter backend db:migrate    # apply migrations
pnpm --filter backend seed          # insert demo rows
```

Migrations also run automatically on boot (guarded: a bad migration logs and
exits cleanly instead of crash-looping).

- `src/core/db/schema.ts` — typed schema (an `example` table with an explicit
  `example_column`).
- `src/core/db/migrations/` — generated SQL.
- `drizzle.config.ts` — drizzle-kit config.

## Types shared with the frontend

`src/contract.ts` is the source of truth. `pnpm gen:types` writes the
frontend's committed copy at `frontend/src/shared/api-types.ts` and a JSON
snapshot next to the contract. It is intentionally simple and never blocks the
build.

## Layout

```
src/
  server.ts            entry: migrate → mount /api → (prod) serve frontend
  contract.ts          canonical request/response types + OpenAPI-ish contract
  gen-types.ts         writes frontend types from the contract
  api/<member>/        one router each: frank, juan, suvi, joe
  core/db/             schema · client · migrate · seed · migrations
  core/llm/            openclaw.ts (stub) · openai.ts
```

Ownership (`api/<member>/`) is a **gentle default**, not a rule. `core/` is
common ground.
