// Clients can only write NOTES — every other event type is auto-appended by
// the endpoint that caused it.
export default defineEventHandler(async (event) => {
  const me = await requireSession(event)
  const claim = await getClaimOr404(getRouterParam(event, 'id'))
  const body = await readValidatedBody(event, EventCreate.parse)
  return appendEvent(claim.id, 'note', me.id, body.body)
})
