import { getAuthSession, setAuthSession } from '../../utils/session'

export default defineEventHandler((event) => {
  // Lock = keep the session's tokens sealed in the cookie but flag it locked; data access
  // is refused until a PIN unlock flips the flag back. Nothing is revoked or dropped, so
  // unlocking never depends on resurrecting a single-use refresh token.
  // (Full sign-out is /api/auth/logout, which revokes and clears the PIN.)
  const session = getAuthSession(event)
  if (session) {
    setAuthSession(event, { ...session, locked: true })
  }
  return { success: true }
})
