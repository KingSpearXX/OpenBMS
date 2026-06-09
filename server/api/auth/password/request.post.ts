import { getRequestURL } from 'h3'
import { getDirectusUrl } from '../../../utils/directus'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ email?: string }>(event)
  const email = body?.email?.trim()
  if (!email) {
    throw createError({ statusCode: 400, statusMessage: 'Email is required' })
  }

  // The reset link points back at this app's /reset-password page. The full URL must be
  // present in Directus PASSWORD_RESET_URL_ALLOW_LIST.
  const resetUrl = `${getRequestURL(event).origin}/reset-password`

  try {
    await $fetch(`${getDirectusUrl(event)}/auth/password/request`, {
      method: 'POST',
      body: { email, reset_url: resetUrl },
    })
  }
  catch (error) {
    // Never reveal to the CLIENT whether an account exists — but log server-side so
    // misconfiguration is diagnosable. The most common cause is `resetUrl` not being in
    // the Directus PASSWORD_RESET_URL_ALLOW_LIST.
    console.error('[auth] password reset request failed', {
      resetUrl,
      detail: (error as { data?: unknown })?.data ?? (error as Error)?.message,
    })
  }

  return { success: true }
})
