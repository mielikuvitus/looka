// Claimsboard data model — one file, everything keys off it.
//
// Money is integer CENTS (never floats). Datetimes are integer timestamps;
// date-only values (lossDate) are ISO text. Text UUID primary keys so app rows
// join cleanly against Better Auth's text ids. SQLite has no enums — Drizzle
// `text(..., { enum })` gives us typed columns instead.

import { index, integer, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core'

// ---- Better Auth tables (singular names, managed alongside app tables) ----

export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
  image: text('image'),
  // additionalField; the seed sets it explicitly per user (adapter defaultValue
  // is unreliable, better-auth #2674)
  role: text('role', { enum: ['handler', 'manager'] }).notNull().default('handler'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

export const session = sqliteTable('session', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

export const account = sqliteTable('account', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp' }),
  refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp' }),
  scope: text('scope'),
  password: text('password'), // email+password hash lives here
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

export const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
})

// ---- App tables ----

export const claims = sqliteTable('claims', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  claimNo: text('claim_no').notNull(),
  policyNo: text('policy_no').notNull(),
  line: text('line', { enum: ['auto', 'property', 'liability', 'health', 'travel'] }).notNull(),
  status: text('status', {
    enum: ['new', 'in_review', 'awaiting_docs', 'approved', 'paid'],
  }).notNull().default('new'),
  // sub-states are filters, not board columns
  subStatus: text('sub_status', { enum: ['denied', 'reopened'] }),
  customer: text('customer').notNull(),
  lossType: text('loss_type'), // water, fire, theft, collision, ...
  lossDate: text('loss_date'), // ISO date (date-only)
  reportedAt: integer('reported_at', { mode: 'timestamp' }).notNull(),
  location: text('location'),
  description: text('description'),
  reserveCents: integer('reserve_cents').notNull().default(0),
  paidCents: integer('paid_cents').notNull().default(0),
  deductibleCents: integer('deductible_cents').notNull().default(0),
  settlementCents: integer('settlement_cents').notNull().default(0),
  assigneeId: text('assignee_id').references(() => user.id, { onDelete: 'set null' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, t => [
  unique('claim_no_uq').on(t.claimNo),
  index('claims_status_idx').on(t.status),
  index('claims_assignee_idx').on(t.assigneeId),
])

export const claimParties = sqliteTable('claim_parties', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  claimId: text('claim_id').notNull().references(() => claims.id, { onDelete: 'cascade' }),
  role: text('role', {
    enum: ['insured', 'claimant', 'adjuster', 'third_party', 'witness', 'repair_shop'],
  }).notNull(),
  name: text('name').notNull(),
  contact: text('contact'),
  org: text('org'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, t => [index('parties_claim_idx').on(t.claimId)])

export const claimDocs = sqliteTable('claim_docs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  claimId: text('claim_id').notNull().references(() => claims.id, { onDelete: 'cascade' }),
  type: text('type', {
    enum: ['fnol', 'photo', 'police_report', 'estimate', 'invoice', 'proof_of_ownership', 'medical_bill', 'adjuster_report', 'correspondence', 'release', 'id_declaration', 'witness_statement', 'other'],
  }).notNull().default('other'),
  filename: text('filename').notNull(),
  url: text('url').notNull(), // /uploads/<claimId>/<file> or /samples/<file>
  mimeType: text('mime_type'),
  sizeBytes: integer('size_bytes'),
  uploadedBy: text('uploaded_by').references(() => user.id, { onDelete: 'set null' }),
  uploadedAt: integer('uploaded_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, t => [index('docs_claim_idx').on(t.claimId)])

export const claimEvents = sqliteTable('claim_events', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  claimId: text('claim_id').notNull().references(() => claims.id, { onDelete: 'cascade' }),
  type: text('type', {
    enum: ['created', 'note', 'status_change', 'payment', 'document', 'party', 'assignment'],
  }).notNull(),
  actorId: text('actor_id').references(() => user.id, { onDelete: 'set null' }),
  body: text('body'),
  meta: text('meta', { mode: 'json' }).$type<Record<string, unknown>>(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, t => [
  index('events_claim_idx').on(t.claimId),
  index('events_created_idx').on(t.createdAt),
])

// ---- Inferred types ----

export type User = typeof user.$inferSelect
export type Claim = typeof claims.$inferSelect
export type NewClaim = typeof claims.$inferInsert
export type ClaimParty = typeof claimParties.$inferSelect
export type NewClaimParty = typeof claimParties.$inferInsert
export type ClaimDoc = typeof claimDocs.$inferSelect
export type NewClaimDoc = typeof claimDocs.$inferInsert
export type ClaimEvent = typeof claimEvents.$inferSelect
export type NewClaimEvent = typeof claimEvents.$inferInsert

export type ClaimStatus = Claim['status']
export type ClaimLine = Claim['line']
export type ClaimSubStatus = NonNullable<Claim['subStatus']>
