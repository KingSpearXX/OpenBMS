import type { H3Event } from 'h3'
import { decryptJson, encryptJson } from './crypto'
import { directusRefresh, isDirectusAuthRejection } from './directus'
import { refreshPinToken } from './pin'

const SESSION_COOKIE = 'obms_session'
const REMEMBER_MAX_AGE = 60 * 60 * 24 * 30 // 30 days (real ceiling is Directus REFRESH_TOKEN_TTL)
const EXPIRY_SKEW_MS = 5000
// How long a settled refresh stays cached. Directus refresh tokens are single-use, and
// the browser keeps sending the old sealed cookie until a Set-Cookie with the rotated
// tokens lands — evicting immediately would make any request arriving just after the
// rotation fail its own refresh and (worse) clear the freshly rotated cookie.
const REFRESH_GRACE_MS = 60_000

export interface SessionData {
  accessToken: string
  refreshToken: string
  expiresAt: number
  remember: boolean
  /** Lock-screen state: tokens are kept sealed but data access is refused until PIN unlock. */
  locked?: boolean
}

// Deduplicates token-refresh calls per refresh token: concurrent requests share one
// in-flight refresh, and requests that race in shortly after it settles reuse the cached
// outcome (see REFRESH_GRACE_MS) instead of re-refreshing a consumed token.
type RefreshOutcome =
  | { ok: true, accessToken: string, refreshToken: string, expiresAt: number }
  | { ok: false, transient: boolean }
const refreshing = new Map<string, Promise<RefreshOutcome>>()

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

function refreshTokens(event: H3Event, refreshToken: string): Promise<RefreshOutcome> {
  let promise = refreshing.get(refreshToken)
  if (!promise) {
    promise = directusRefresh(event, refreshToken)
      .then(tokens => ({
        ok: true as const,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: Date.now() + tokens.expires,
      }))
      .catch((error: unknown) => ({ ok: false as const, transient: !isDirectusAuthRejection(error) }))
    refreshing.set(refreshToken, promise)
    void promise.then((outcome) => {
      if (!outcome.ok && outcome.transient) {
        // Transient (network/5xx): forget immediately so the next request can retry.
        refreshing.delete(refreshToken)
        return
      }
      const timer = setTimeout(() => refreshing.delete(refreshToken), REFRESH_GRACE_MS)
      ;(timer as unknown as { unref?: () => void }).unref?.()
    })
  }
  return promise
}

/**
 * Returns a valid Directus access token, transparently refreshing (and re-sealing the
 * session, rotating the refresh token) when the current one is expired. Returns null
 * when there is no session or it is locked.
 */
export async function getAccessToken(event: H3Event): Promise<string | null> {
  const session = getAuthSession(event)
  if (!session || session.locked) return null
  return getAccessTokenFromSession(event, session)
}

/**
 * Like {@link getAccessToken} but for an already-read (and possibly just-modified)
 * session — used by PIN unlock to refresh through the shared dedup path. Clears the
 * session and returns null only when Directus definitively rejects the refresh token;
 * a transient Directus failure throws 503 and leaves the session cookie intact so the
 * next request can retry.
 */
export async function getAccessTokenFromSession(event: H3Event, session: SessionData): Promise<string | null> {
  if (Date.now() < session.expiresAt - EXPIRY_SKEW_MS) return session.accessToken

  const outcome = await refreshTokens(event, session.refreshToken)
  if (!outcome.ok) {
    if (outcome.transient) {
      throw createError({ statusCode: 503, statusMessage: 'Sign-in service is unreachable. Please try again.' })
    }
    clearAuthSession(event)
    return null
  }

  // Each waiting request re-seals the new tokens into its own response cookie.
  setAuthSession(event, {
    ...session,
    accessToken: outcome.accessToken,
    refreshToken: outcome.refreshToken,
    expiresAt: outcome.expiresAt,
  })
  // Keep a device PIN (if set) usable across token rotations.
  refreshPinToken(event, outcome.refreshToken)
  return outcome.accessToken
}
