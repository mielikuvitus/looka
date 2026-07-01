// Seed script (`pnpm seed`).
//
// Idempotent-ish demo data for the example table. Panels do not persist, so
// this is only here to prove the DB path works end to end.

import process from 'node:process'
import { db } from './client'
import { runMigrations } from './migrate'
import { example } from './schema'

function seed(): void {
  runMigrations()
  db.insert(example).values({ exampleColumn: 'hello from seed' }).run()
  const rows = db.select().from(example).all()
  // eslint-disable-next-line no-console
  console.log(`[db] seeded — example rows: ${rows.length}`)
}

try {
  seed()
  process.exit(0)
}
catch (err) {
  console.error('[db] seed failed:', err)
  process.exit(1)
}
