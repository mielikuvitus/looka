import type { NewClaimDoc } from '~~/server/db/schema'
import { randomUUID } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import process from 'node:process'
import { db } from '~~/server/db/client'
import { claimDocs } from '~~/server/db/schema'

// Multipart upload → ./uploads/<claimId>/<uuid>-<safeName> on disk, metadata in
// claim_docs, served back by routes/uploads/[...file].get.ts.
export default defineEventHandler(async (event) => {
  const me = await requireSession(event)
  const claim = await getClaimOr404(getRouterParam(event, 'id'))

  const parts = await readMultipartFormData(event)
  if (!parts || parts.length === 0)
    throw createError({ statusCode: 400, statusMessage: 'No files uploaded' })

  const explicitType = parts.find(p => p.name === 'type' && !p.filename)?.data.toString('utf8')

  const dir = resolve(process.cwd(), 'uploads', claim.id)
  mkdirSync(dir, { recursive: true })

  const created = []
  for (const part of parts) {
    if (!part.filename)
      continue
    // collapse dot runs too, so a name like `photo..jpg` can't smuggle a `..`
    // that the serve route would later reject as traversal
    const safe = part.filename.replace(/[^\w.-]+/g, '_').replace(/\.{2,}/g, '.')
    const stored = `${randomUUID().slice(0, 8)}-${safe}`
    writeFileSync(join(dir, stored), part.data)

    const type: NewClaimDoc['type']
      = explicitType && (DOC_TYPES as readonly string[]).includes(explicitType)
        ? explicitType as NewClaimDoc['type']
        : part.type?.startsWith('image/') ? 'photo' : 'other'

    const [row] = await db.insert(claimDocs).values({
      claimId: claim.id,
      type,
      filename: part.filename,
      url: `/uploads/${claim.id}/${stored}`,
      mimeType: part.type ?? null,
      sizeBytes: part.data.length,
      uploadedBy: me.id,
    }).returning()
    if (!row)
      throw createError({ statusCode: 500, statusMessage: 'Document insert failed' })
    await appendEvent(claim.id, 'document', me.id, `Uploaded ${part.filename}`, { docId: row.id })
    created.push(row)
  }

  if (created.length === 0)
    throw createError({ statusCode: 400, statusMessage: 'No files in upload' })
  return created
})
