import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto'

// Authenticated symmetric encryption used to seal cookie payloads (session + PIN blob).
// Layout of the serialized token: base64url( salt | iv | authTag | ciphertext ).
const ALGORITHM = 'aes-256-gcm'
const SALT_LEN = 16
const IV_LEN = 12
const TAG_LEN = 16
const KEY_LEN = 32

function deriveKey(secret: string, salt: Buffer): Buffer {
  return scryptSync(secret, salt, KEY_LEN)
}

export function encryptJson(data: unknown, secret: string): string {
  const salt = randomBytes(SALT_LEN)
  const iv = randomBytes(IV_LEN)
  const key = deriveKey(secret, salt)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const plaintext = Buffer.from(JSON.stringify(data), 'utf8')
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([salt, iv, tag, ciphertext]).toString('base64url')
}

/**
 * Decrypts a token produced by {@link encryptJson}. Returns null on any failure —
 * including a wrong secret/PIN, which fails the GCM auth-tag check.
 */
export function decryptJson<T>(token: string, secret: string): T | null {
  try {
    const buffer = Buffer.from(token, 'base64url')
    const salt = buffer.subarray(0, SALT_LEN)
    const iv = buffer.subarray(SALT_LEN, SALT_LEN + IV_LEN)
    const tag = buffer.subarray(SALT_LEN + IV_LEN, SALT_LEN + IV_LEN + TAG_LEN)
    const ciphertext = buffer.subarray(SALT_LEN + IV_LEN + TAG_LEN)
    const key = deriveKey(secret, salt)
    const decipher = createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(tag)
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()])
    return JSON.parse(plaintext.toString('utf8')) as T
  }
  catch {
    return null
  }
}
