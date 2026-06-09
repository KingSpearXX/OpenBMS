import { directusLogout } from '../../utils/directus'
import { clearAuthSession, getAuthSession } from '../../utils/session'
import { clearPin } from '../../utils/pin'

export default defineEventHandler(async (event) => {
  const session = getAuthSession(event)
  if (session) {
    try {
      await directusLogout(event, session.refreshToken)
    }
    catch {
      // Best-effort: even if Directus rejects the refresh token, clear our cookie.
    }
  }
  clearAuthSession(event)
  // Full sign-out also forgets the device PIN (its stored refresh token is now revoked).
  clearPin(event)
  return { success: true }
})
