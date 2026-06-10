import { directusLogin, directusMe } from '../../utils/directus'
import { setAuthSession } from '../../utils/session'
import { refreshPinToken } from '../../utils/pin'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ email?: string, password?: string, remember?: boolean }>(event)
  const email = body?.email?.trim()
  const password = body?.password

  if (!email || !password) {
    throw createError({ statusCode: 400, statusMessage: 'Email and password are required' })
  }

  let tokens
  try {
    tokens = await directusLogin(event, email, password)
  }
  catch {
    // Don't leak which part was wrong.
    throw createError({ statusCode: 401, statusMessage: 'Invalid email or password' })
  }

  setAuthSession(event, {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: Date.now() + tokens.expires,
    remember: Boolean(body?.remember),
  })
  // Re-point an existing device PIN at the new session's token chain so a later PIN
  // unlock doesn't depend on the old (expiring) chain.
  refreshPinToken(event, tokens.refresh_token)

  const user = await directusMe(event, tokens.access_token)
  return { user }
})
