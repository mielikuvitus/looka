// Looka backend — one entry point.
//
// - Listens on process.env.PORT || 8787.
// - Runs Drizzle migrations on boot (guarded: a bad migration logs and exits
//   cleanly rather than crash-looping silently).
// - Mounts /api (health + the four member agents).
// - In production, also serves the built frontend from ../frontend/dist so the
//   whole app is ONE origin (no CORS). In dev, Vite serves the UI and proxies
//   /api here.

import type { HealthResponse } from './contract'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, extname, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { frank } from './api/frank'
import { joe } from './api/joe'
import { juan } from './api/juan'
import { suvi } from './api/suvi'
import { apiContract } from './contract'
import { runMigrations } from './core/db/migrate'

const here = dirname(fileURLToPath(import.meta.url))

// Load repo-root .env into process.env for local dev (docker-compose reads it
// directly, so this only matters for `pnpm dev`). Missing file is fine — env
// vars from the shell/compose still work either way.
try {
  process.loadEnvFile(resolve(here, '../../.env'))
}
catch {}

const PORT = Number(process.env.PORT) || 8787
const isProd = process.env.NODE_ENV === 'production'

// backend/src -> frontend/dist
const FRONTEND_DIST = process.env.FRONTEND_DIST ?? resolve(here, '../../frontend/dist')

// --- Migrations (guarded) ---------------------------------------------------
try {
  runMigrations()
  // eslint-disable-next-line no-console
  console.log('[db] migrations up to date')
}
catch (err) {
  console.error('[db] migration failed on boot — exiting:', err)
  process.exit(1)
}

// --- API --------------------------------------------------------------------
const api = new Hono()

api.get('/health', (c) => {
  const body: HealthResponse = { ok: true, service: 'looka-backend' }
  return c.json(body)
})

// OpenAPI-ish contract, handy for humans and for `gen:types`.
api.get('/contract', c => c.json(apiContract))

api.route('/frank', frank)
api.route('/juan', juan)
api.route('/suvi', suvi)
api.route('/joe', joe)

// --- App --------------------------------------------------------------------
const app = new Hono()
app.route('/api', api)

// In production serve the built SPA on the same origin (no CORS). Static files
// are read straight from FRONTEND_DIST; unknown non-/api paths fall back to
// index.html so the WebSpatial SPA can route client-side.
if (isProd) {
  const indexPath = resolve(FRONTEND_DIST, 'index.html')

  app.get('/*', (c) => {
    const reqPath = c.req.path
    if (reqPath.startsWith('/api/'))
      return c.notFound()

    // Try the requested file, then fall back to index.html.
    const filePath = resolveWithinDist(FRONTEND_DIST, reqPath)
    if (filePath && isFile(filePath))
      return sendFile(filePath)

    if (isFile(indexPath))
      return sendFile(indexPath)

    return c.text('Frontend build not found. Run `pnpm --filter frontend build`.', 404)
  })
}

// Resolve a request path inside dist, refusing anything that escapes the root.
function resolveWithinDist(root: string, reqPath: string): string | null {
  const clean = reqPath.replace(/^\/+/, '')
  const full = resolve(root, clean)
  return full === root || full.startsWith(`${root}/`) ? full : null
}

function isFile(path: string): boolean {
  return existsSync(path) && statSync(path).isFile()
}

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.usdz': 'model/vnd.usdz+zip',
  '.glb': 'model/gltf-binary',
  '.wasm': 'application/wasm',
}

function sendFile(path: string): Response {
  const body = new Uint8Array(readFileSync(path))
  const type = MIME[extname(path).toLowerCase()] ?? 'application/octet-stream'
  return new Response(body, { status: 200, headers: { 'Content-Type': type } })
}

serve({ fetch: app.fetch, port: PORT }, (info) => {
  // eslint-disable-next-line no-console
  console.log(`[looka] backend listening on http://localhost:${info.port} (${isProd ? 'prod' : 'dev'})`)
})
