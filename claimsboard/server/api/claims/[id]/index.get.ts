import { asc, desc, eq, sql } from 'drizzle-orm'
import { db } from '~~/server/db/client'
import { claimDocs, claimEvents, claimParties, user } from '~~/server/db/schema'

// The claim FILE, not a row: claim + parties + docs + events + assignee.
export default defineEventHandler(async (event) => {
  await requireSession(event)
  const claim = await getClaimOr404(getRouterParam(event, 'id'))

  const [parties, docs, events, assignee] = await Promise.all([
    db.select().from(claimParties).where(eq(claimParties.claimId, claim.id)).orderBy(asc(claimParties.createdAt)),
    db.select().from(claimDocs).where(eq(claimDocs.claimId, claim.id)).orderBy(desc(claimDocs.uploadedAt)),
    db.select({
      id: claimEvents.id,
      type: claimEvents.type,
      body: claimEvents.body,
      meta: claimEvents.meta,
      createdAt: claimEvents.createdAt,
      actorId: claimEvents.actorId,
      actorName: user.name,
    }).from(claimEvents).leftJoin(user, eq(claimEvents.actorId, user.id)).where(eq(claimEvents.claimId, claim.id)).orderBy(desc(claimEvents.createdAt), sql`claim_events.rowid desc`),
    claim.assigneeId
      ? db.select({ id: user.id, name: user.name }).from(user).where(eq(user.id, claim.assigneeId)).then(r => r[0] ?? null)
      : Promise.resolve(null),
  ])

  return { ...claim, parties, docs, events, assignee }
})
