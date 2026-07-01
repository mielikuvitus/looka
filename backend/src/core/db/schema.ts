// Drizzle schema.
//
// Panels do NOT persist yet — reload is a fresh start, no logins. This table
// exists only to wire up SQLite + Drizzle for future data. It carries the
// required explicit `example_column` so migrations have something real to make.

import { sql } from 'drizzle-orm'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const example = sqliteTable('example', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  // Explicit example column, per the project decision to keep a typed sample.
  exampleColumn: text('example_column').notNull(),
  createdAt: text('created_at').notNull().default(sql`(current_timestamp)`),
})

export type Example = typeof example.$inferSelect
export type NewExample = typeof example.$inferInsert
