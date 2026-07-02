import { eq } from 'drizzle-orm'
import { db } from '~~/server/db/client'
import { claims, user } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  const me = await requireSession(event)
  const body = await readValidatedBody(event, ClaimCreate.parse)

  let claimNo = body.claimNo
  if (claimNo) {
    const [dupe] = await db.select({ id: claims.id }).from(claims).where(eq(claims.claimNo, claimNo))
    if (dupe)
      throw createError({ statusCode: 409, statusMessage: `Claim #${claimNo} already exists` })
  }
  else {
    // next number after the highest numeric claim number (seed ends at 4459)
    const existing = await db.select({ claimNo: claims.claimNo }).from(claims)
    const max = existing.reduce((m, r) => Math.max(m, Number.parseInt(r.claimNo, 10) || 0), 4459)
    claimNo = String(max + 1)
  }

  const [row] = await db.insert(claims).values({
    ...body,
    claimNo,
    status: 'new',
    reportedAt: new Date(),
  }).returning()
  if (!row)
    throw createError({ statusCode: 500, statusMessage: 'Claim insert failed' })

  await appendEvent(row.id, 'created', me.id, `Claim #${claimNo} opened for ${row.customer}`)
  if (row.assigneeId) {
    const [assignee] = await db.select({ name: user.name }).from(user).where(eq(user.id, row.assigneeId))
    await appendEvent(row.id, 'assignment', me.id, `Assigned to ${assignee?.name ?? 'unknown'}`, { to: row.assigneeId })
  }
  return row
})
