// drizzle-kit config — drives `pnpm db:generate` (SQL migration generation).
// Runtime migration + DB opening live in src/core/db (better-sqlite3).

import process from 'node:process'
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/core/db/schema.ts',
  out: './src/core/db/migrations',
  dbCredentials: {
    url: process.env.DB_PATH ?? './data/looka.sqlite',
  },
})
