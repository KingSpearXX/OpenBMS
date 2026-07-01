# openbms-mcp

An MCP (Model Context Protocol) server that wraps OpenBMS's own BFF (`server/api/**`)
as tools, so any MCP-compatible AI client (Claude Code, Claude Desktop, etc.) can drive
real OpenBMS actions — list/create/update/delete Customers, Contacts, Orders, Order
lines, Products, Stock items, Inventory usage, Categories, Branches, POS sales, and
Quotes/Quote-lines — through the same business logic the web UI uses (order total
recalculation, stock adjustments, etc.), instead of talking to Directus directly.

This is a **thin HTTP client of the running OpenBMS app**, not a standalone service —
it does nothing useful unless the main Nuxt app is already running and reachable.

> Currently covers Customers/Contacts, Orders/Order-lines, Inventory, POS sales, and
> Quotes/Quote-lines. Procurement, Ledger, Expenses, and Documents (PDF export) are out
> of scope for this pass — see `/plans/2026-07-01-implementation-mcp-server-foundation.md`
> and `/plans/2026-07-01-implementation-mcp-server-pos-quotes.md`. Note: unlike Orders,
> Quote totals are **not** recalculated server-side — the quote tools' descriptions call
> this out explicitly.

## Setup

1. **Create a dedicated OpenBMS user for this server.** Don't reuse a personal login —
   create a least-privilege account the same way the root README recommends a
   dedicated user for the Directus MCP token.
2. Copy the env file and fill it in:
   ```bash
   cd mcp-server
   cp .env.example .env
   # set OBMS_BASE_URL, OBMS_MCP_EMAIL, OBMS_MCP_PASSWORD
   ```
3. Install and build:
   ```bash
   npm install
   npm run build
   ```
4. Make sure the main OpenBMS app is running at `OBMS_BASE_URL` (from the repo root):
   ```bash
   npm run dev      # or: npm run build && npm run preview
   ```

## Wiring into an MCP client

Add an entry to the repo-root `.mcp.json` (gitignored, machine-specific) alongside the
existing `directus` entry:

```json
{
  "mcpServers": {
    "openbms": {
      "command": "node",
      "args": ["mcp-server/dist/index.js"],
      "env": {
        "OBMS_BASE_URL": "http://localhost:3000"
      }
    }
  }
}
```

`OBMS_MCP_EMAIL`/`OBMS_MCP_PASSWORD` are read from `mcp-server/.env` by the process
itself (via `dotenv`), so they don't need to be duplicated into `.mcp.json`.

Verify with:
```bash
claude mcp list   # should show "openbms" connected
```

## How auth works

Every OpenBMS `/api/**` route is gated by a sealed, httpOnly `obms_session` cookie —
there's no bearer-token/API-key path. This server logs in once via
`POST /api/auth/login` with the configured credentials, keeps the resulting cookie in
memory, and resends it on every request. Because the app silently rotates that cookie
(access-token refresh reseals it, and Directus refresh tokens are single-use), every
response is inspected for a fresh `Set-Cookie` — not just the login response — and a
`401` triggers one transparent re-login-and-retry. See `src/client.ts`.

## Development

```bash
npm run dev         # run directly with tsx, no build step
npm run typecheck    # tsc --noEmit
```

## Safety note

Write tools (`create_*`/`update_*`/`delete_*`) act on the live OpenBMS backend
immediately — there is no dry-run or confirmation layer in this server itself.
`delete_*` tool descriptions say so explicitly so a calling AI treats them as
irreversible, but the calling client/user is responsible for confirming intent before
invoking them.
