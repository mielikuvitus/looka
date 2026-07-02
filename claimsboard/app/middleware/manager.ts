// Stacks on top of `auth` for manager-only pages (Team). UX only —
// team.get.ts re-checks the role server-side.
export default defineNuxtRouteMiddleware(() => {
  const { isManager } = useAuth()
  if (!isManager.value)
    return navigateTo('/dashboard')
})
