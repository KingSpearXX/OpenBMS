import { clearAuthSession } from '../../utils/session'

export default defineEventHandler((event) => {
  // Lock = drop the active session but KEEP the device PIN (and the Directus refresh
  // token it holds) so the user can unlock quickly via the PIN screen. No Directus revoke.
  // (Full sign-out is /api/auth/logout, which revokes and clears the PIN.)
  clearAuthSession(event)
  return { success: true }
})
