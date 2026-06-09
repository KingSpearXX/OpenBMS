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

function secureCookies(): boolean {
  // Relax on localhost dev (http) so the cookie is actually stored.
  return !import.meta.dev
}

export function setAuthSession(event: H3Event, data: SessionData): void {
  const secret = useRuntimeConfig(event).sessionSecret
  setCookie(event, SESSION_COOKIE, encryptJson(data, secret), {
    httpOnly: true,
    secure: secureCookies(),
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

  try {
    const tokens = await directusRefresh(event, session.refreshToken)
    setAuthSession(event, {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + tokens.expires,
      remember: session.remember,
    })
    // Keep a device PIN (if set) usable across token rotations.
    refreshPinToken(event, tokens.refresh_token)
    return tokens.access_token
  }
  catch {
    clearAuthSession(event)
    return null
  }
}
