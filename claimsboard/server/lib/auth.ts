// Better Auth instance. The Drizzle adapter ships INSIDE better-auth —
// do NOT install @better-auth/drizzle-adapter (it does not exist).
//
// Relative imports on purpose: this file is also loaded by the tsx-run seed,
// where Nitro's `~~` alias does not resolve. Server-only — never import from
// app/ (better-sqlite3 is a native addon; the client talks to /api/auth/*).

import process from 'node:process'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '../db/client'
import * as schema from '../db/schema'

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'sqlite', schema }),
  emailAndPassword: { enabled: true },
  user: {
    additionalFields: {
      // defaultValue is unreliable on the Drizzle adapter (#2674); the seed
      // sets roles explicitly. The column itself defaults to 'handler'.
      role: { type: 'string', input: false, required: false, defaultValue: 'handler' },
    },
  },
  secret: process.env.BETTER_AUTH_SECRET ?? 'claimsboard-dev-secret-change-me-32-chars',
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
})
