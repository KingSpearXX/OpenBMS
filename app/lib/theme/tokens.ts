// Single source of truth for OpenBMS design tokens.
// Standalone (no `~`/`@` alias imports) so it can be imported both from the
// nuxt.config evaluation context (via the PrimeVue preset) and at app runtime.

export const slate = {
  50: '#f8fafc',
  100: '#f1f5f9',
  200: '#e2e8f0',
  300: '#cbd5e1',
  400: '#94a3b8',
  500: '#64748b',
  600: '#475569',
  700: '#334155',
  800: '#1e293b',
  900: '#0f172a',
  950: '#020617',
} as const

// Semantic roles — minimalist/corporate slate near-mono.
export const tokens = {
  color: {
    primary: slate[800],
    primaryHover: slate[900],
    primaryActive: slate[950],
    text: slate[900],
    muted: slate[500],
    border: slate[200],
    surface: '#ffffff',
    appBg: slate[50],
  },
  radius: {
    sm: '6px',
  },
  font: {
    sans: '\'Inter\', system-ui, -apple-system, \'Segoe UI\', Roboto, sans-serif',
  },
} as const

// Flat map of CSS custom properties derived from the tokens above.
export const cssVariables: Record<string, string> = {
  '--app-bg': tokens.color.appBg,
  '--surface': tokens.color.surface,
  '--text': tokens.color.text,
  '--muted': tokens.color.muted,
  '--border': tokens.color.border,
  '--primary': tokens.color.primary,
  '--radius-sm': tokens.radius.sm,
}

/** Renders the tokens as a `:root { … }` rule for injection into the document head. */
export function cssVariablesBlock(): string {
  const body = Object.entries(cssVariables)
    .map(([name, value]) => `${name}:${value}`)
    .join(';')
  return `:root{${body}}`
}
