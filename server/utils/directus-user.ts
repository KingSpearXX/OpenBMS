import type { H3Event } from 'h3'
import { getDirectusUrl } from './directus'
import { getAccessToken } from './session'

// Authenticated data layer: calls Directus as the signed-in user (token from the sealed
// session, auto-refreshed). The browser never sees the token. Returns Directus's `data`.

interface DirectusUserOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  query?: Record<string, unknown>
  body?: Record<string, unknown> | unknown[]
}

export async function requireAccessToken(event: H3Event): Promise<string> {
  const token = await getAccessToken(event)
  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })
  }
  return token
}

export async function directusUser<T = unknown>(
  event: H3Event,
  path: string,
  options: DirectusUserOptions = {},
): Promise<T> {
  const token = await requireAccessToken(event)
  // DELETE (and some PATCH) return 204 No Content — no body to read `data` from.
  const res = await $fetch<{ data: T } | null | ''>(`${getDirectusUrl(event)}${path}`, {
    method: options.method ?? 'GET',
    query: options.query,
    body: options.body,
    headers: { Authorization: `Bearer ${token}` },
  })
  return (res ? res.data : undefined) as T
}
