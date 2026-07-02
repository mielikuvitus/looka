// The gridfin-style session singleton: one useState both SSR and client read,
// hydrated once by plugins/auth.ts — no logged-out flash, no per-navigation
// refetch.
import { authClient } from '~/lib/auth-client'

export interface SessionUser {
  id: string
  name: string
  email: string
  role: 'handler' | 'manager'
  image?: string | null
}

interface SessionPayload {
  user?: SessionUser | null
}

export function useAuth() {
  const user = useState<SessionUser | null>('cb-user', () => null)

  const isAuthenticated = computed(() => !!user.value)
  const isManager = computed(() => user.value?.role === 'manager')

  async function refresh() {
    if (import.meta.server) {
      // Direct internal call — forwards the request's cookie, no self-HTTP hop.
      const data = await useRequestFetch()<SessionPayload | null>('/api/auth/get-session')
      user.value = data?.user ?? null
    }
    else {
      const { data } = await authClient.getSession()
      user.value = (data?.user as SessionUser | undefined) ?? null
    }
  }

  async function signIn(email: string, password: string) {
    const res = await authClient.signIn.email({ email, password })
    if (res.error)
      throw new Error(res.error.message ?? 'Sign-in failed')
    await refresh()
  }

  async function signUp(name: string, email: string, password: string) {
    const res = await authClient.signUp.email({ name, email, password })
    if (res.error)
      throw new Error(res.error.message ?? 'Registration failed')
    await refresh()
  }

  async function signOut() {
    await authClient.signOut()
    user.value = null
    await navigateTo('/')
  }

  return { user, isAuthenticated, isManager, refresh, signIn, signUp, signOut }
}
