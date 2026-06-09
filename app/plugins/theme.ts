import { cssVariablesBlock } from '~/lib/theme/tokens'

// Injects the design tokens as :root CSS variables. Runs on server and client, so the
// variables are present in the initial SSR HTML (no flash of unstyled content).
export default defineNuxtPlugin(() => {
  useHead({
    style: [{ id: 'obms-tokens', innerHTML: cssVariablesBlock() }],
  })
})
