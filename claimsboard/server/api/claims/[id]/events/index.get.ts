import { desc, eq, sql } from 'drizzle-orm'
import { db } from '~~/server/db/client'
import { claimEvents, user } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  await requireSession(event)
  const claim = await getClaimOr404(getRouterParam(event, 'id'))
  return db.select({
    id: claimEvents.id,
    type: claimEvents.type,
    body: claimEvents.body,
    meta: claimEvents.meta,
    createdAt: claimEvents.createdAt,
    actorId: claimEvents.actorId,
    actorName: user.name,
  }).from(claimEvents).leftJoin(user, eq(claimEvents.actorId, user.id)).where(eq(claimEvents.claimId, claim.id)).orderBy(desc(claimEvents.createdAt), sql`claim_events.rowid desc`)
})
