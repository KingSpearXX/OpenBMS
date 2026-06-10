import type { H3Event } from 'h3'
import { decryptJson, encryptJson } from './crypto'
import { directusRefresh } from './directus'
import { refreshPinToken } from './pin'

const SESSION_COOKIE = 'obms_session'
const REMEMBER_MAX_AGE = 60 * 60 * 24 * 30 // 30 days (real ceiling is Directus REFRESH_TOKEN_TTL)
const EXPIRY_SKEW_MS = 5000

export interface SessionData {
  accessToken: string
  refreshToken: string
  expiresAt: number
  remember: boolean
}

// Deduplicates concurrent token-refresh calls that arrive within the same expiry window.
// Directus refresh tokens are single-use; a second parallel refresh with the same token
// would fail, causing clearAuthSession and an unexpected logout.
interface RefreshResult { accessToken: string; refreshToken: string; expiresAt: number }
const refreshing = new Map<string, Promise<RefreshResult | null>>()

// Only mark the cookie Secure when the request actually arrived over HTTPS.
// Checking the protocol at runtime (rather than import.meta.dev) keeps the cookie
// functional on HTTP-only self-hosted setups while still being Secure on HTTPS.
function secureCookies(event: H3Event): boolean {
  if (import.meta.dev) return false
  const forwarded = getHeader(event, 'x-forwarded-proto')
  if (forwarded) return forwarded.split(',')[0]!.trim() === 'https'
  return getRequestURL(event).protocol === 'https:'
}

export function setAuthSession(event: H3Event, data: SessionData): void {
  const secret = useRuntimeConfig(event).sessionSecret
  setCookie(event, SESSION_COOKIE, encryptJson(data, secret), {
    httpOnly: true,
    secure: secureCookies(event),
    sameSite: 'lax',
    path: '/',
    ...(data.remember ? { maxAge: REMEMBER_MAX_AGE } : {}),
  })
}

export function getAuthSession(event: H3Event): SessionData | null {
  const value = getCookie(event, SESSION_COOKIE)
  if (!value) return null
  return decryptJson<SessionData>(value, useRuntimeConfig(event).sessionSecret)
}

export function clearAuthSession(event: H3Event): void {
  deleteCookie(event, SESSION_COOKIE, { path: '/' })
}

/**
 * Returns a valid Directus access token, transparently refreshing (and re-sealing the
 * session, rotating the refresh token) when the current one is expired. Clears the
 * session and returns null if refresh fails.
 */
export async function getAccessToken(event: H3Event): Promise<string | null> {
  const session = getAuthSession(event)
  if (!session) return null
  if (Date.now() < session.expiresAt - EXPIRY_SKEW_MS) return session.accessToken

  // Deduplicate: if another concurrent request is already refreshing this token, await it.
  const key = session.refreshToken
  let promise = refreshing.get(key)
  if (!promise) {
    promise = directusRefresh(event, session.refreshToken)
      .then(tokens => ({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: Date.now() + tokens.expires,
      }))
      .catch(() => null)
      .finally(() => refreshing.delete(key))
    refreshing.set(key, promise)
  }

  const result = await promise
  if (!result) {
    clearAuthSession(event)
    return null
  }

  // Each waiting request re-seals the new tokens into its own response cookie.
  setAuthSession(event, { ...result, remember: session.remember })
  // Keep a device PIN (if set) usable across token rotations.
  refreshPinToken(event, result.refreshToken)
  return result.accessToken
}
