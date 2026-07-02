import { eq } from 'drizzle-orm'
import { db } from '~~/server/db/client'
import { claims, user } from '~~/server/db/schema'

// The reusable CRUD-with-auto-event pattern: board drags, status dropdowns and
// money edits all land here; history writes itself.
export default defineEventHandler(async (event) => {
  const me = await requireSession(event)
  const prev = await getClaimOr404(getRouterParam(event, 'id'))
  const body = await readValidatedBody(event, ClaimPatch.parse)

  const [row] = await db.update(claims)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(claims.id, prev.id))
    .returning()
  if (!row)
    throw createError({ statusCode: 500, statusMessage: 'Claim update failed' })

  if (body.status && body.status !== prev.status)
    await appendEvent(prev.id, 'status_change', me.id, null, { from: prev.status, to: body.status })

  if (body.paidCents !== undefined && body.paidCents !== prev.paidCents)
    await appendEvent(prev.id, 'payment', me.id, null, { cents: body.paidCents - prev.paidCents })

  if (body.assigneeId !== undefined && body.assigneeId !== prev.assigneeId) {
    if (body.assigneeId) {
      const [assignee] = await db.select({ name: user.name }).from(user).where(eq(user.id, body.assigneeId))
      await appendEvent(prev.id, 'assignment', me.id, `Assigned to ${assignee?.name ?? 'unknown'}`, { from: prev.assigneeId, to: body.assigneeId })
    }
    else {
      await appendEvent(prev.id, 'assignment', me.id, 'Unassigned', { from: prev.assigneeId, to: null })
    }
  }

  return row
})
