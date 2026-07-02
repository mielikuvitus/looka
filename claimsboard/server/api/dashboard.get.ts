import { and, asc, count, desc, eq, gte, lt, ne, notInArray, sql, sum } from 'drizzle-orm'
import { db } from '~~/server/db/client'
import { claimEvents, claims, user } from '~~/server/db/schema'

// One JSON object per load: { kpis, byStatus, myQueue, activity }.
// Everything is computed in SQL — this is also the natural surface a later
// OpenClaw skill will wrap.
export default defineEventHandler(async (event) => {
  const me = await requireSession(event)
  const now = Date.now()
  const weekAgo = new Date(now - 7 * 86_400_000)

  const [[openRow], [awaitingRow], [slaRow], [paidRow], byStatusRows, myQueue, activity] = await Promise.all([
    db.select({ n: count() }).from(claims).where(ne(claims.status, 'paid')),
    db.select({ n: count() }).from(claims).where(eq(claims.status, 'awaiting_docs')),
    db.select({ n: count() }).from(claims).where(and(
      notInArray(claims.status, ['paid', 'approved']),
      lt(claims.reportedAt, slaCutoff(now)),
    )),
    db.select({ total: sum(claims.paidCents) }).from(claims).where(and(
      eq(claims.status, 'paid'),
      gte(claims.updatedAt, weekAgo),
    )),
    db.select({ status: claims.status, n: count() }).from(claims).groupBy(claims.status),
    db.select().from(claims).where(and(eq(claims.assigneeId, me.id), ne(claims.status, 'paid'))).orderBy(asc(claims.reportedAt)).limit(6),
    db.select({
      id: claimEvents.id,
      type: claimEvents.type,
      body: claimEvents.body,
      meta: claimEvents.meta,
      createdAt: claimEvents.createdAt,
      actorName: user.name,
      claimId: claims.id,
      claimNo: claims.claimNo,
      customer: claims.customer,
    }).from(claimEvents).innerJoin(claims, eq(claimEvents.claimId, claims.id)).leftJoin(user, eq(claimEvents.actorId, user.id)).orderBy(desc(claimEvents.createdAt), sql`claim_events.rowid desc`).limit(15),
  ])

  return {
    kpis: {
      open: openRow?.n ?? 0,
      awaitingDocs: awaitingRow?.n ?? 0,
      pastSla: slaRow?.n ?? 0,
      paidThisWeekCents: Number(paidRow?.total ?? 0),
    },
    byStatus: STATUSES.map(status => ({
      status,
      count: byStatusRows.find(r => r.status === status)?.n ?? 0,
    })),
    myQueue,
    activity,
  }
})
