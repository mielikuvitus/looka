// UX guard only — the real checks are requireSession() on the API.
export default defineNuxtRouteMiddleware((to) => {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated.value)
    return navigateTo({ path: '/auth', query: { next: to.fullPath } })
})
