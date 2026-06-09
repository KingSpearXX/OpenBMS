import { getDirectusUrl } from '../../../utils/directus'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ token?: string, password?: string }>(event)
  const token = body?.token
  const password = body?.password

  if (!token || !password) {
    throw createError({ statusCode: 400, statusMessage: 'Reset token and new password are required' })
  }

  try {
    await $fetch(`${getDirectusUrl(event)}/auth/password/reset`, {
      method: 'POST',
      body: { token, password },
    })
  }
  catch {
    throw createError({ statusCode: 400, statusMessage: 'This reset link is invalid or has expired' })
  }

  return { success: true }
})
