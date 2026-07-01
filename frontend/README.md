# Looka frontend

The Looka room: a WebSpatial single-page app (React + TypeScript + Vite) where
AI agents live as draggable, floating panels.

## Run it

From the repo root:

```bash
pnpm install
pnpm dev          # starts frontend + backend together
```

Or just the frontend:

```bash
pnpm --filter frontend dev      # http://localhost:5173
pnpm --filter frontend build    # type-check + production build to dist/
```

In dev, Vite proxies `/api` to the backend at `http://localhost:8787`, so the
app talks to the API on the same origin with no CORS. In production the backend
serves this build and `/api` from one origin.

## Layout

```
src/
  main.tsx                     entry — mounts <Room />
  app/                         room shell (common ground, no owner)
    Room.tsx                   spatial scene: enable-xr surfaces, cards, 3D diorama
    Room.css                   scene + panel styles
  features/                    one folder per member (gentle default, not a rule)
    frank/  juan/  suvi/  joe/ each: a floating agent card
  shared/                      common ground, no owner
    components/AgentCard.tsx   optional reusable card + "Ping agent" button
    composables/useSpatialDrag.ts  Juan's spatial drag hook
    lib/api.ts                 same-origin API client
    api-types.ts               committed view of the backend contract
public/
  manifest.webmanifest, icons/, models/diorama.usdz
```

Ownership is a **gentle default**. `app/` and `shared/` belong to everyone, and
each agent card is just HTML on the page — build yours however you like.

## WebSpatial notes

- The JSX runtime is wired through `tsconfig.app.json`
  (`"jsx": "react-jsx"`, `"jsxImportSource": "@webspatial/react-sdk"`).
- Panels use `enable-xr` to lift into space; the 3D diorama uses `<Model>` from
  `@webspatial/react-sdk`.
- To preview spatial behavior in the visionOS simulator, run
  `pnpm --filter frontend dev:spatial` (wraps `webspatial-builder run`).
  Requires macOS with Xcode and the visionOS simulator installed.

Panels do not persist — reload for a fresh room.
