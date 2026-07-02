// The single place claim history gets written. Every mutating endpoint calls
// this on meaningful transitions, which keeps the dashboard feed and the claim
// file's Activity tab truthful with zero extra client work.

import type { ClaimEvent, NewClaimEvent } from '../db/schema'
import { db } from '../db/client'
import { claimEvents } from '../db/schema'

export async function appendEvent(
  claimId: string,
  type: NewClaimEvent['type'],
  actorId: string | null,
  body?: string | null,
  meta?: Record<string, unknown> | null,
): Promise<ClaimEvent> {
  const [row] = await db.insert(claimEvents).values({
    claimId,
    type,
    actorId,
    body: body ?? null,
    meta: meta ?? null,
  }).returning()
  if (!row)
    throw new Error('event insert returned no row')
  return row
}
