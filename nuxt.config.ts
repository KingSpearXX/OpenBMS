import { openbmsPreset } from './app/lib/primevue/preset'
import pkg from './package.json'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },

  modules: [
    '@primevue/nuxt-module',
    '@nuxtjs/tailwindcss',
    '@nuxt/fonts',
    '@nuxt/eslint',
    '@vite-pwa/nuxt',
  ],

  css: [
    '~/assets/css/main.css',
    'primeicons/primeicons.css',
  ],

  primevue: {
    options: {
      // Minimalist corporate look: light only, slate near-mono primary.
      theme: {
        preset: openbmsPreset,
        options: {
          // Never auto-enable dark mode; force light by keying on a class we never add.
          darkModeSelector: '.app-dark',
        },
      },
    },
  },

  fonts: {
    families: [
      { name: 'Inter', provider: 'google', weights: [400, 500, 600, 700] },
    ],
  },

  runtimeConfig: {
    // Server-only (never exposed to the client).
    directusUrl: process.env.NUXT_DIRECTUS_URL
      || process.env.NUXT_PUBLIC_DIRECTUS_URL
      || 'https://directus.rxedev.online',
    sessionSecret: process.env.NUXT_SESSION_SECRET || 'dev-insecure-session-secret-change-me',
    pinSecret: process.env.NUXT_PIN_SECRET
      || process.env.NUXT_SESSION_SECRET
      || 'dev-insecure-pin-secret-change-me',
    public: {
      // App's public Directus base URL (non-secret). Runtime reads go through @directus/sdk.
      directusUrl: process.env.NUXT_PUBLIC_DIRECTUS_URL || 'https://directus.rxedev.online',
      // Baked at build time from package.json; shown in the sidebar footer.
      appVersion: pkg.version,
    },
  },

  app: {
    head: {
      title: 'OpenBMS',
      htmlAttrs: { lang: 'en' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#1e293b' },
      ],
      // Inject the manifest link into SSR HTML so PWA detection doesn't depend on client
      // JS running (e.g. Cloudflare Rocket Loader can break the module's runtime injection).
      link: [
        { rel: 'manifest', href: '/manifest.webmanifest' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon-180x180.png' },
      ],
    },
  },

  pwa: {
    registerType: 'autoUpdate',
    // Icons are generated from public/logo.svg (gear + OpenBMS wordmark).
    pwaAssets: {
      image: 'public/logo.svg',
      preset: 'minimal-2023',
    },
    manifest: {
      name: 'OpenBMS',
      short_name: 'OpenBMS',
      description: 'OpenBMS — Business Management System',
      lang: 'en',
      display: 'standalone',
      start_url: '/',
      theme_color: '#1e293b',
      background_color: '#f8fafc',
    },
    workbox: {
      // Never serve the SPA shell or cache the BFF auth/API routes from the service worker.
      navigateFallbackDenylist: [/^\/api\//],
      globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
    },
    client: {
      installPrompt: true,
    },
  },
})
