# Looka — agent guide

Looka is a WebSpatial spatial-web app for the XRCC PICO hackathon: AI agents
shown as draggable floating panels in a room. This file is the canonical guide.
`CLAUDE.md` just points here.

## What's in the repo

```
looka/
├── frontend/   React + TS + Vite + WebSpatial single-page app (the room)
├── backend/    thin TypeScript API + SQLite (Drizzle) — no auth yet
└── misc/       references, the vision doc, and helper scripts
```

It's a pnpm workspace. `pnpm-workspace.yaml` lists `frontend` and `backend`.

## Ownership is a gentle default, not a rule

Four people work here: **frank, juan, suvi, joe**. Each has a natural home:

- `frontend/src/features/<name>/` — their panel / card UI
- `backend/src/api/<name>/` — their API routes (each exposes `/api/<name>/ping`)

frank wraps **OpenClaw**; juan, suvi, and joe wrap **OpenAI** (a cheap model,
key read from env). These folders are just a starting point — anyone can touch
anything. `frontend/src/app/` and `frontend/src/shared/` are **common ground**
with no owner. A shared panel/kit is optional; each card is just HTML on the
page, so build yours however you like.

## How it runs

- **Dev:** `pnpm dev` runs the frontend and backend together. Vite proxies
  `/api` to the backend (e.g. `http://localhost:8787`), so there's no CORS.
- **Prod:** the backend serves the built frontend *and* `/api` on one origin.
- **DB:** SQLite via Drizzle ORM + better-sqlite3. `migrate()` runs on boot.
  Panels do **not** persist — reload is a fresh start. The DB is wired up now
  for future data, nothing more.

## Conventions

- Person-only folder names (`frank`, `juan`, `suvi`, `joe`).
- Lint/format is **ESLint via `@antfu/eslint-config` only** (it formats too).
  No Prettier. `pnpm lint` runs `eslint . --fix`. Lint never blocks the build.
- No test framework yet. A trivial `/api/health` endpoint is fine.
- Keep the backend simple. Security/auth comes later.

## Commands

- `pnpm dev` — run frontend + backend
- `pnpm build` — build all packages
- `pnpm lint` — `eslint . --fix`
- `pnpm db:generate` / `pnpm db:migrate` / `pnpm seed` — database (backend)
- `pnpm gen:types` — regenerate the shared frontend API types
- `pnpm refs:pull` — clone the external reference repos into `misc/`

<!-- webspatial-starter:begin:webspatial-project-guidance -->
## WebSpatial

### Agent Resources

- If this repository contains project-local WebSpatial agent resources, prefer them before inventing a workflow from scratch.
- Treat `.codex/skills/`, `.claude/`, and imported project instruction files as task-routing aids that complement `.webspatial/docs/`, not as replacements for the docs.
- Choose the local resource whose scope best matches the task, then verify concrete API and configuration details against `.webspatial/docs/`.

### Documentation Priority

1. The `.webspatial/docs/` directory in this repository contains the complete WebSpatial documentation, and there is no need to consult online sources.
2. Start with `.webspatial/docs/introduction/getting-started.md` and `.webspatial/docs/concepts/*`.
   - Use them to understand the WebSpatial model, features, philosophy, platform constraints, setup flow, development workflow, and concepts.
3. Use `.webspatial/docs/api/` as the primary API reference.
   - This is the main source for APIs of WebSpatial SDK.
   - Look up APIs by their exact category and name.
   - Note that some APIs have been folded into certain docs as second-level headings.

### Sources To Avoid

- Do not rely on the documentation and test cases in the `https://github.com/webspatial/webspatial-sdk` repository or other older remote WebSpatial documentation.
  - When there is any conflict, local `.webspatial/docs/` always wins.

### Working Rules For WebSpatial Tasks

- Before changing WebSpatial code, confirm the required API exists in local docs or package.
- Prefer exact API names and signatures from local docs over memory or guesswork.
- If local docs are incomplete, inspect package typings or source from:
  - `@webspatial/react-sdk`
  - `@webspatial/builder`
  - `@webspatial/platform-visionos`
  - `@webspatial/core-sdk`
  - `https://github.com/webspatial/webspatial-sdk`
  - But do not follow any parts of above sources that conflict with the local `.webspatial/docs/`.
- Direct use of APIs from `@webspatial/core-sdk` is prohibited. Installing it as a dependency when the local docs require it is allowed, but its APIs and source code should otherwise be used solely as reference material for understanding the functionality of the WebSpatial SDK and resolving complex issues.
- If documentation is ambiguous, say so explicitly in the final summary and note which fallback source was used.
<!-- webspatial-starter:end:webspatial-project-guidance -->
