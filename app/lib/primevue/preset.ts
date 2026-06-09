import { definePreset } from '@primevue/themes'
import Aura from '@primevue/themes/aura'
import { slate } from '../theme/tokens'

// Slate near-mono preset: the primary ramp IS the slate scale, surfaces stay neutral.
// Minimalist/corporate — no vivid accent. Semantic colors keep Aura defaults (used sparingly).
// The slate scale is sourced from the shared design tokens (single source of truth).
export const openbmsPreset = definePreset(Aura, {
  semantic: {
    primary: slate,
    colorScheme: {
      light: {
        primary: {
          color: '{primary.800}',
          contrastColor: '#ffffff',
          hoverColor: '{primary.900}',
          activeColor: '{primary.950}',
        },
        surface: slate,
      },
    },
  },
})
