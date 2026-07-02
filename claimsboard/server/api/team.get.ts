import { asc, ne } from 'drizzle-orm'
import { db } from '~~/server/db/client'
import { claims, user } from '~~/server/db/schema'

// Manager-only: workload per handler + what needs attention. The route
// middleware hides the page; THIS check is the security boundary.
export default defineEventHandler(async (event) => {
  await requireManager(event)
  const cutoff = slaCutoff()

  const [users, open] = await Promise.all([
    db.select({ id: user.id, name: user.name, email: user.email, role: user.role })
      .from(user)
      .orderBy(asc(user.name)),
    db.select().from(claims).where(ne(claims.status, 'paid')).orderBy(asc(claims.reportedAt)),
  ])

  const names = new Map(users.map(u => [u.id, u.name]))
  const brief = (c: typeof open[number]) => ({
    id: c.id,
    claimNo: c.claimNo,
    customer: c.customer,
    line: c.line,
    status: c.status,
    subStatus: c.subStatus,
    reportedAt: c.reportedAt,
    reserveCents: c.reserveCents,
    assigneeId: c.assigneeId,
    assigneeName: c.assigneeId ? names.get(c.assigneeId) ?? null : null,
  })

  const isPastSla = (c: typeof open[number]) =>
    c.status !== 'approved' && c.reportedAt < cutoff

  const workload = users.filter(u => u.role === 'handler').map((u) => {
    const mine = open.filter(c => c.assigneeId === u.id)
    return {
      user: u,
      open: mine.length,
      pastSla: mine.filter(isPastSla).length,
      awaitingDocs: mine.filter(c => c.status === 'awaiting_docs').length,
      reserveCents: mine.reduce((s, c) => s + c.reserveCents, 0),
      oldestDays: mine.length
        ? Math.max(...mine.map(c => Math.floor((Date.now() - c.reportedAt.getTime()) / 86_400_000)))
        : 0,
      over: mine.length > HANDLER_SOFT_CAP,
    }
  })

  return {
    softCap: HANDLER_SOFT_CAP,
    slaDays: SLA_DAYS,
    workload,
    pastSla: open.filter(isPastSla).map(brief),
    unassigned: open.filter(c => !c.assigneeId).map(brief),
    overloaded: workload.filter(w => w.over).map(w => ({ user: w.user, open: w.open })),
  }
})
