import { getAuthSession } from '../../../utils/session'
import { setPin } from '../../../utils/pin'

export default defineEventHandler(async (event) => {
  const session = getAuthSession(event)
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'You must be signed in to set a PIN' })
  }

  const body = await readBody<{ pin?: string }>(event)
  const pin = body?.pin?.trim()
  if (!pin || !/^\d{4,8}$/.test(pin)) {
    throw createError({ statusCode: 400, statusMessage: 'PIN must be 4–8 digits' })
  }

  setPin(event, session.refreshToken, pin)
  return { success: true }
})
