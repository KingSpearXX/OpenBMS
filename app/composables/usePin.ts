import type { User } from '~/types/auth'

/**
 * Device PIN quick-login client API. `obms_pin_enabled` is a non-httpOnly flag cookie
 * so the UI can know whether to offer PIN entry; the sealed PIN payload itself is httpOnly.
 */
export function usePin() {
  const enabledCookie = useCookie<string | null>('obms_pin_enabled', { default: () => null })
  const isEnabled = computed(() => enabledCookie.value === '1')

  async function loginWithPin(pin: string): Promise<User> {
    const res = await $fetch<{ user: User }>('/api/auth/pin/login', { method: 'POST', body: { pin } })
    return res.user
  }

  async function enablePin(pin: string): Promise<void> {
    await $fetch('/api/auth/pin/enable', { method: 'POST', body: { pin } })
    enabledCookie.value = '1'
  }

  async function disablePin(): Promise<void> {
    await $fetch('/api/auth/pin/disable', { method: 'POST' })
    enabledCookie.value = null
  }

  return { isEnabled, loginWithPin, enablePin, disablePin }
}
