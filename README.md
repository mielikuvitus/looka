# Looka

Managing a swarm of AI agents on a flat screen is a UX problem, not a mind
problem. **Looka gives each agent a rectangle and spreads them out in space** so
you can actually keep an overview. It's a WebSpatial app: agents live as
draggable floating panels in a room, built for the XRCC PICO hackathon.

## Quick start

```bash
pnpm install
pnpm dev
```

`pnpm dev` runs the frontend and backend together. Open the app in your browser
(the frontend prints its URL). In dev, the frontend proxies `/api` to the
backend, so everything is one origin — no CORS to fight.

Copy `.env.example` to `.env` and fill in your keys before using the agents:

```bash
cp .env.example .env
```

## Structure

```
looka/
├── frontend/   the room — React + TypeScript + Vite + WebSpatial (SPA)
├── backend/    a thin TypeScript API + SQLite (Drizzle ORM)
└── misc/       the vision doc, references, and helper scripts
```

This is a pnpm workspace with two packages: `frontend` and `backend`.

**Who owns what** is a gentle default, not a rule. Four people build here —
frank, juan, suvi, joe — and each has a natural home under
`frontend/src/features/<name>/` and `backend/src/api/<name>/`. But `app/` and
`shared/` are common ground, and anyone can touch anything. See
[AGENTS.md](./AGENTS.md) for the full guide.

## Common commands

| Command | What it does |
| --- | --- |
| `pnpm dev` | Run frontend + backend together |
| `pnpm build` | Build every package |
| `pnpm lint` | `eslint . --fix` (antfu config; formats too, no Prettier) |
| `pnpm db:generate` | Generate SQLite migrations from the schema |
| `pnpm db:migrate` | Apply migrations (also runs on backend boot) |
| `pnpm seed` | Seed the database |
| `pnpm gen:types` | Regenerate shared frontend API types |
| `pnpm refs:pull` | Clone external reference repos into `misc/` |

## Deploy

One origin, one container. `docker-compose up` builds the frontend, then the
backend serves that static build **and** `/api` on a single port, with SQLite on
a mounted volume. There's no auth yet — that comes later. Panels don't persist;
a reload is a fresh start.

## Learn more

- [AGENTS.md](./AGENTS.md) — the canonical guide for working in this repo
- [misc/reference/vision.html](./misc/reference/vision.html) — the full pitch
- [misc/README.md](./misc/README.md) — what's in the references folder
