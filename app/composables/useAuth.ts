import type { User } from '~/types/auth'

/**
 * Client-side auth API backed by the BFF (`/api/auth/*`). The user object is shared
 * app-wide via useState; tokens live only in the server-set httpOnly session cookie.
 */
export function useAuth() {
  const user = useState<User | null>('auth.user', () => null)

  async function fetchUser(): Promise<void> {
    // useRequestFetch forwards the incoming cookies during SSR.
    const request = useRequestFetch()
    try {
      const res = await request<{ user: User }>('/api/auth/me')
      user.value = res.user
    }
    catch {
      user.value = null
    }
  }

  async function login(email: string, password: string, remember: boolean): Promise<void> {
    const res = await $fetch<{ user: User }>('/api/auth/login', {
      method: 'POST',
      body: { email, password, remember },
    })
    user.value = res.user
  }

  async function logout(): Promise<void> {
    try {
      await $fetch('/api/auth/logout', { method: 'POST' })
    }
    finally {
      user.value = null
      await navigateTo('/login')
    }
  }

  // Lock: end the session locally but keep the device PIN for a quick unlock.
  async function lock(): Promise<void> {
    try {
      await $fetch('/api/auth/lock', { method: 'POST' })
    }
    finally {
      user.value = null
      await navigateTo('/login')
    }
  }

  const isAuthenticated = computed(() => Boolean(user.value))

  return { user, isAuthenticated, fetchUser, login, logout, lock }
}
