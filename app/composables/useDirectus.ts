import { createDirectusClient } from '~/lib/directus/client'

/**
 * Returns the shared read-only Directus client, configured from runtime config.
 * Wired but intentionally unused by pages until per-module plans land.
 */
export function useDirectus() {
  const nuxtApp = useNuxtApp()
  if (!nuxtApp._directus) {
    const { public: { directusUrl } } = useRuntimeConfig()
    nuxtApp._directus = createDirectusClient(directusUrl)
  }
  return nuxtApp._directus as ReturnType<typeof createDirectusClient>
}
