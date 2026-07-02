// Better Auth catch-all — the client (better-auth/vue) talks only to this.
import { auth } from '~~/server/lib/auth'

export default defineEventHandler(event => auth.handler(toWebRequest(event)))
