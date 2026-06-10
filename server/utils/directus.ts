import type { H3Event } from 'h3'

// Server-to-server calls to the Directus auth/user endpoints (BFF). The browser never
// talks to Directus directly; tokens stay on the server inside a sealed session cookie.
export interface DirectusTokens {
  access_token: string
  refresh_token: string
  expires: number
}

export function getDirectusUrl(event: H3Event): string {
  return useRuntimeConfig(event).directusUrl
}

export async function directusLogin(event: H3Event, email: string, password: string): Promise<DirectusTokens> {
  const res = await $fetch<{ data: DirectusTokens }>(`${getDirectusUrl(event)}/auth/login`, {
    method: 'POST',
    body: { email, password },
  })
  return res.data
}

export async function directusRefresh(event: H3Event, refreshToken: string): Promise<DirectusTokens> {
  const res = await $fetch<{ data: DirectusTokens }>(`${getDirectusUrl(event)}/auth/refresh`, {
    method: 'POST',
    body: { refresh_token: refreshToken, mode: 'json' },
  })
  return res.data
}

export async function directusLogout(event: H3Event, refreshToken: string): Promise<void> {
  await $fetch(`${getDirectusUrl(event)}/auth/logout`, {
    method: 'POST',
    body: { refresh_token: refreshToken, mode: 'json' },
  })
}

/**
 * True when the error is a definitive Directus auth rejection (invalid/expired/revoked
 * credentials), as opposed to a transient failure (network error, Directus 5xx) that
 * must not destroy the session.
 */
export function isDirectusAuthRejection(error: unknown): boolean {
  const e = error as { statusCode?: number, response?: { status?: number } } | null
  const status = e?.statusCode ?? e?.response?.status
  return status === 400 || status === 401 || status === 403
}

export async function directusMe(event: H3Event, accessToken: string): Promise<unknown> {
  const res = await $fetch<{ data: unknown }>(`${getDirectusUrl(event)}/users/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    query: { fields: 'id,email,first_name,last_name,avatar,status,role' },
  })
  return res.data
}
