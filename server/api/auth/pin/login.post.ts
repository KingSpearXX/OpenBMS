import { directusMe, directusRefresh } from '../../../utils/directus'
import { setAuthSession } from '../../../utils/session'
import { refreshPinToken, verifyPin } from '../../../utils/pin'

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

  let tokens
  try {
    tokens = await directusRefresh(event, result.refreshToken)
  }
  catch {
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
