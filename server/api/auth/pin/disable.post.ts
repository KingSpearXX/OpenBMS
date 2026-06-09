import { getAuthSession } from '../../../utils/session'
import { clearPin } from '../../../utils/pin'

export default defineEventHandler((event) => {
  const session = getAuthSession(event)
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })
  }
  clearPin(event)
  return { success: true }
})
