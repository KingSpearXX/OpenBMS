import type { H3Event } from 'h3'
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { decryptJson, encryptJson } from './crypto'

// Device-bound PIN quick-login. The whole payload (the Directus refresh token + the PIN
// salt/hash) is sealed with the SERVER secret, so:
//  - the server can re-seal it when the refresh token rotates (the PIN isn't needed for that),
//  - the PIN is verified separately against a salted, secret-peppered scrypt hash,
//  - an attacker holding the cookie can't read or brute-force it without the server secret.
// This is a convenience feature on one device, not a second factor.

const PIN_COOKIE = 'obms_pin'
const PIN_ENABLED_COOKIE = 'obms_pin_enabled'
const PIN_ATTEMPTS_COOKIE = 'obms_pin_attempts'
const PIN_MAX_AGE = 60 * 60 * 24 * 90 // 90 days
export const MAX_PIN_ATTEMPTS = 5

interface PinPayload {
  refreshToken: string
  salt: string
  hash: string
}

function secureCookies(): boolean {
  return !import.meta.dev
}

function pinSecret(event: H3Event): string {
  return useRuntimeConfig(event).pinSecret
}

function baseCookieOptions() {
  return {
    httpOnly: true,
    secure: secureCookies(),
    sameSite: 'lax' as const,
    path: '/',
    maxAge: PIN_MAX_AGE,
  }
}

function hashPin(pin: string, secret: string, salt: Buffer): Buffer {
  // Secret is peppered in, so offline brute-force of a low-entropy PIN needs the server secret.
  return scryptSync(`${pin}:${secret}`, salt, 64)
}

function sealPayload(event: H3Event, payload: PinPayload): void {
  setCookie(event, PIN_COOKIE, encryptJson(payload, pinSecret(event)), baseCookieOptions())
}

function readPayload(event: H3Event): PinPayload | null {
  const value = getCookie(event, PIN_COOKIE)
  if (!value) return null
  return decryptJson<PinPayload>(value, pinSecret(event))
}

export function setPin(event: H3Event, refreshToken: string, pin: string): void {
  const salt = randomBytes(16)
  const hash = hashPin(pin, pinSecret(event), salt)
  sealPayload(event, { refreshToken, salt: salt.toString('hex'), hash: hash.toString('hex') })
  setCookie(event, PIN_ENABLED_COOKIE, '1', { ...baseCookieOptions(), httpOnly: false })
  setAttempts(event, 0)
}

export function clearPin(event: H3Event): void {
  deleteCookie(event, PIN_COOKIE, { path: '/' })
  deleteCookie(event, PIN_ENABLED_COOKIE, { path: '/' })
  deleteCookie(event, PIN_ATTEMPTS_COOKIE, { path: '/' })
}

function getAttempts(event: H3Event): number {
  const raw = getCookie(event, PIN_ATTEMPTS_COOKIE)
  const n = raw ? Number.parseInt(raw, 10) : 0
  return Number.isFinite(n) ? n : 0
}

function setAttempts(event: H3Event, n: number): void {
  setCookie(event, PIN_ATTEMPTS_COOKIE, String(n), baseCookieOptions())
}

export interface PinVerifyResult {
  ok: boolean
  refreshToken?: string
  lockedOut?: boolean
  attemptsRemaining?: number
}

export function verifyPin(event: H3Event, pin: string): PinVerifyResult {
  const payload = readPayload(event)
  if (!payload) return { ok: false }

  const salt = Buffer.from(payload.salt, 'hex')
  const expected = Buffer.from(payload.hash, 'hex')
  const actual = hashPin(pin, pinSecret(event), salt)
  const match = expected.length === actual.length && timingSafeEqual(expected, actual)

  if (match) {
    setAttempts(event, 0)
    return { ok: true, refreshToken: payload.refreshToken }
  }

  const attempts = getAttempts(event) + 1
  if (attempts >= MAX_PIN_ATTEMPTS) {
    clearPin(event)
    return { ok: false, lockedOut: true, attemptsRemaining: 0 }
  }
  setAttempts(event, attempts)
  return { ok: false, attemptsRemaining: MAX_PIN_ATTEMPTS - attempts }
}

/** Keeps the PIN-sealed refresh token in sync when the session's refresh token rotates. */
export function refreshPinToken(event: H3Event, newRefreshToken: string): void {
  const payload = readPayload(event)
  if (!payload) return
  sealPayload(event, { ...payload, refreshToken: newRefreshToken })
}
