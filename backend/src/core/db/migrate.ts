// Apply pending Drizzle migrations.
//
// Called on server boot (guarded) and runnable directly via `pnpm db:migrate`.
// Throws on failure so callers can decide how to react — the server logs and
// exits cleanly rather than crash-looping silently.

import process from 'node:process'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { db, MIGRATIONS_DIR } from './client'

export function runMigrations(): void {
  migrate(db, { migrationsFolder: MIGRATIONS_DIR })
}

// Allow `tsx src/core/db/migrate.ts` as a standalone command.
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    runMigrations()
    // eslint-disable-next-line no-console
    console.log('[db] migrations applied')
    process.exit(0)
  }
  catch (err) {
    console.error('[db] migration failed:', err)
    process.exit(1)
  }
}
