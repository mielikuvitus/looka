// Programmatic migration runner (drizzle-orm's better-sqlite3 migrator).
// Used by the seed; `pnpm db:migrate` (drizzle-kit) does the same from the CLI.
// Never run `better-auth migrate` — it does not support Drizzle.

import { resolve } from 'node:path'
import process from 'node:process'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { db } from './client'

export function runMigrations() {
  migrate(db, { migrationsFolder: resolve(process.cwd(), 'server/db/migrations') })
}
