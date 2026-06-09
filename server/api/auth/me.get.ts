import { directusMe } from '../../utils/directus'
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
  catch {
    clearAuthSession(event)
    throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })
  }
})
