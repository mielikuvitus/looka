// Hydrate the session once during SSR; the client inherits it via the
// useState payload. Runs before route middleware, so guards see real state.
export default defineNuxtPlugin(async () => {
  if (import.meta.server)
    await useAuth().refresh()
})
