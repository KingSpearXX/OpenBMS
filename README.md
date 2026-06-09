# OpenBMS

A Business Management System — a **Nuxt 4 + PrimeVue** frontend over an existing, self-hosted **Directus** backend. Minimalist, corporate, mobile-first.

> The Directus backend is a **live system with real data**. Treat it as **read-only** during development and **never destroy it**. See `CLAUDE.md` and `AGENTS.md`.

## Stack
Nuxt 4 · PrimeVue v4 (slate near-mono theme) · Tailwind (mobile-first) · Inter · `@directus/sdk`.

## Prerequisites
- Node 22+ and npm
- Access to the Directus instance (`https://directus.rxedev.online`, v11.12+)

## App setup
```bash
npm install
cp .env.example .env   # then set NUXT_PUBLIC_DIRECTUS_URL
npm run dev            # http://localhost:3000
```

Other commands: `npm run build`, `npm run preview`, `npm run typecheck`, `npm run lint`.

## Directus MCP (dev tooling only)
Claude Code reads the backend through the official Directus MCP server (built into Directus v11.12+), configured in `.mcp.json` at the repo root. To use it:

1. In Directus, create a dedicated **least-privilege** user for the MCP service — **Admin Access OFF, Delete disabled** (read-only is preferred). Generate a static token on that user.
2. Export the token in the shell that launches Claude Code:
   ```bash
   export DIRECTUS_TOKEN='your-token'
   ```
3. Verify: `claude mcp list` → `directus` shows **connected**.

The MCP server is for development tooling only — the app itself reads Directus via `@directus/sdk` (`app/lib/directus/client.ts`).

## Project layout
```
app/                  # Nuxt 4 app code
  components/app/      # shell (topbar, sidebar)
  composables/         # useDirectus, …
  layouts/default.vue  # responsive shell (sidebar / mobile drawer)
  lib/                 # primevue preset, directus client
  pages/               # routes
  utils/               # general helpers
plans/                # planning docs (see AGENTS.md §5)
```

See `CLAUDE.md` for architecture and working rules.
