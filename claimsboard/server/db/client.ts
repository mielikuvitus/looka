// SQLite connection (better-sqlite3 + Drizzle) — one process-wide handle.
//
// Paths resolve from cwd so the same code works under Nitro (`pnpm dev`) and
// tsx (`pnpm db:seed`) — pnpm always runs package scripts with cwd = package
// dir. Tables are created by the migrator, never here.

import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'

export const DB_PATH = resolve(process.cwd(), process.env.DB_PATH ?? './data/claimsboard.sqlite')

mkdirSync(dirname(DB_PATH), { recursive: true })

export const sqlite = new Database(DB_PATH)
sqlite.pragma('journal_mode = WAL')

export const db = drizzle(sqlite, { schema })
