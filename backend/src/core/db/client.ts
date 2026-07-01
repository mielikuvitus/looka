// SQLite connection (better-sqlite3 + Drizzle).
//
// One process-wide handle. The file lives under `backend/data/` (gitignored,
// mounted as a volume in Docker). We do NOT create tables here — that is the
// migrator's job (see migrate.ts).

import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'

const here = dirname(fileURLToPath(import.meta.url))

// backend/src/core/db -> backend/data
export const DATA_DIR = resolve(here, '../../../data')
export const DB_PATH = process.env.DB_PATH ?? resolve(DATA_DIR, 'looka.sqlite')

// Where drizzle-kit writes generated migrations.
export const MIGRATIONS_DIR = resolve(here, 'migrations')

mkdirSync(DATA_DIR, { recursive: true })

export const sqlite = new Database(DB_PATH)
sqlite.pragma('journal_mode = WAL')

export const db = drizzle(sqlite, { schema })
