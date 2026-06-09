import { createDirectus, rest } from '@directus/sdk'

/**
 * Creates a Directus REST client for the app runtime.
 *
 * Read-only by design for now: no auth/token is attached, so it can only reach
 * publicly-readable data. Per-module plans add end-user auth where writes are needed.
 */
export function createDirectusClient(url: string) {
  return createDirectus(url).with(rest())
}
