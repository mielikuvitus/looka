# Claimsboard

**Shield · Board — the board, protected.** A small claims-management app that stands in
for the big closed systems (Guidewire, Duck Creek): a kanban board, a claim *file*
(documents, parties, money, activity), and a dashboard for the whole team.
Nuxt 4 · Nuxt UI v4 · SQLite (Drizzle) · Better Auth.

## Run it

```sh
pnpm install                      # from the monorepo root
cd claimsboard
pnpm db:generate && pnpm db:migrate
pnpm db:seed                      # users + ~18 sample claims
pnpm dev                          # http://localhost:3000
```

Sign in as `mara@claimsboard.test` (manager), `jana@claimsboard.test` or
`sami@claimsboard.test` (handlers) — password `claimsboard-dev` (or `DEV_PASSWORD`).

Every action is plain CRUD over `/api/claims…` on purpose: the endpoints are the
surface a later OpenClaw skill → claimsboard agent → kami will wrap. Docker/Coolify
deploy is deferred; for the demo it runs locally.

Note: `pnpm auth:generate` writes Better Auth's tables to a scratch file
(`server/db/auth-schema.ts`) for comparison only — the canonical schema lives in
`server/db/schema.ts`. Never run `better-auth migrate`; migrations go through
drizzle-kit.
