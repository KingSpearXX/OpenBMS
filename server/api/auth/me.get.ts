import { directusMe, isDirectusAuthRejection } from '../../utils/directus'
import { clearAuthSession, getAccessToken } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const accessToken = await getAccessToken(event)
  if (!accessToken) {
    throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })
  }

  try {
    const user = await directusMe(event, accessToken)
    return { user }
  }
  catch (error) {
    if (isDirectusAuthRejection(error)) {
      clearAuthSession(event)
      throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })
    }
    // Transient Directus failure: keep the session cookie so the next attempt can retry.
    throw createError({ statusCode: 503, statusMessage: 'Sign-in service is unreachable. Please try again.' })
  }
})
