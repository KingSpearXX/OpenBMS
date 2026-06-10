import type { SessionData } from '../../../utils/session'
import { directusMe, directusRefresh, isDirectusAuthRejection } from '../../../utils/directus'
import { getAccessTokenFromSession, getAuthSession, setAuthSession } from '../../../utils/session'
import { clearPin, refreshPinToken, verifyPin } from '../../../utils/pin'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ pin?: string }>(event)
  const pin = body?.pin?.trim()
  if (!pin) {
    throw createError({ statusCode: 400, statusMessage: 'PIN is required' })
  }

  const result = verifyPin(event, pin)
  if (!result.ok || !result.refreshToken) {
    if (result.lockedOut) {
      throw createError({ statusCode: 423, statusMessage: 'Too many attempts. Please sign in with your password.' })
    }
    const suffix = result.attemptsRemaining != null ? `. ${result.attemptsRemaining} attempts left` : ''
    throw createError({ statusCode: 401, statusMessage: `Incorrect PIN${suffix}` })
  }

  // Preferred path: a (locked) session cookie still holds its tokens — unlock it in
  // place. No single-use-token resurrection involved, so rotation can't break unlock.
  const session = getAuthSession(event)
  if (session) {
    const unlocked: SessionData = { ...session, locked: false }
    setAuthSession(event, unlocked)
    const accessToken = await getAccessTokenFromSession(event, unlocked)
    if (accessToken) {
      const user = await directusMe(event, accessToken)
      return { user }
    }
    // Session chain definitively rejected (cookie already cleared) — fall back to the
    // refresh token stored in the PIN cookie.
  }

  // Fallback (e.g. browser restarted and a non-remember session cookie evaporated):
  // start a new token chain from the refresh token sealed in the PIN cookie.
  let tokens
  try {
    tokens = await directusRefresh(event, result.refreshToken)
  }
  catch (error) {
    if (!isDirectusAuthRejection(error)) {
      throw createError({ statusCode: 503, statusMessage: 'Sign-in service is unreachable. Please try again.' })
    }
    // The stored token is dead (expired/consumed/revoked) — this PIN can never succeed
    // again, so forget it rather than letting retries burn through the attempt limit.
    clearPin(event)
    throw createError({ statusCode: 401, statusMessage: 'Session expired. Please sign in with your password.' })
  }

  setAuthSession(event, {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: Date.now() + tokens.expires,
    remember: true,
  })
  refreshPinToken(event, tokens.refresh_token)

  const user = await directusMe(event, tokens.access_token)
  return { user }
})
