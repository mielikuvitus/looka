// Apply any pending Drizzle migrations when Nitro boots.
//
// The container image ships a pre-seeded, already-migrated database, so on a
// normal boot this is a no-op. It exists so that future migrations apply
// automatically on redeploy against the persisted volume. Failures are logged
// but never crash the server — a migration hiccup must not take the demo down.
//
// Migrations resolve from cwd (`/app` in the image, package dir in dev); the
// SQL folder is copied next to the server output by the Dockerfile.

import { runMigrations } from '../db/migrate'

export default defineNitroPlugin(() => {
  try {
    runMigrations()
  }
  catch (err) {
    console.error('[migrate] skipped:', (err as Error).message)
  }
})
