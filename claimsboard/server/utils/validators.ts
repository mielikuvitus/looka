// Zod schemas shared by all handlers via readValidatedBody/getValidatedQuery.
// h3 turns a throwing validator into a 400, so `.parse` is safe to pass.

import { z } from 'zod'

export const STATUSES = ['new', 'in_review', 'awaiting_docs', 'approved', 'paid'] as const
export const SUB_STATUSES = ['denied', 'reopened'] as const
export const LINES = ['auto', 'property', 'liability', 'health', 'travel'] as const
export const PARTY_ROLES = ['insured', 'claimant', 'adjuster', 'third_party', 'witness', 'repair_shop'] as const
export const DOC_TYPES = ['fnol', 'photo', 'police_report', 'estimate', 'invoice', 'proof_of_ownership', 'medical_bill', 'adjuster_report', 'correspondence', 'release', 'id_declaration', 'witness_statement', 'other'] as const

const cents = z.number().int().min(0)

export const ClaimCreate = z.object({
  claimNo: z.string().min(1).optional(), // omitted → server assigns the next number
  policyNo: z.string().min(1),
  line: z.enum(LINES),
  customer: z.string().min(1),
  lossType: z.string().min(1).optional(),
  lossDate: z.string().optional(),
  location: z.string().optional(),
  description: z.string().optional(),
  reserveCents: cents.optional(),
  deductibleCents: cents.optional(),
  assigneeId: z.string().nullable().optional(),
})

export const ClaimPatch = z.object({
  status: z.enum(STATUSES).optional(),
  subStatus: z.enum(SUB_STATUSES).nullable().optional(),
  policyNo: z.string().min(1).optional(),
  line: z.enum(LINES).optional(),
  customer: z.string().min(1).optional(),
  lossType: z.string().nullable().optional(),
  lossDate: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  reserveCents: cents.optional(),
  paidCents: cents.optional(),
  deductibleCents: cents.optional(),
  settlementCents: cents.optional(),
  assigneeId: z.string().nullable().optional(),
})

export const PartyCreate = z.object({
  role: z.enum(PARTY_ROLES),
  name: z.string().min(1),
  contact: z.string().optional(),
  org: z.string().optional(),
})

export const PartyPatch = PartyCreate.partial()

// Clients may only write notes; every other event type is appended server-side.
export const EventCreate = z.object({
  body: z.string().min(1),
})
