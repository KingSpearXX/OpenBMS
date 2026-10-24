# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Source of truth: AGENTS.md

**`AGENTS.md` is the authoritative reference for all conventions and AI workflow in this repo** — naming, programming logic, testing, git management, and AI planning. Read it and follow it. This file only surfaces the points that override Claude Code's defaults; it does not restate `AGENTS.md`.

## What OpenBMS is

A Business Management System built as a **Nuxt frontend over an existing, already-populated self-hosted Directus backend** (`https://directus.rxedev.online`, v11.12). It is **not greenfield** — the backend already holds real business data (customers, orders, products, inventory, employees, shop sales, etc.) and an existing n8n automation writes to it. Treat the backend as **read-only and never destroy it** (see Working rules below). Target modules: Inventory/Products, Sales/CRM, Purchasing, Accounting/Finance.

## Commands

- `npm run dev` — start the dev server (HMR)
- `npm run build` — production build (Nitro output in `.output/`)
- `npm run preview` — run the built server (`node .output/server/index.mjs`)
- `npm run generate` — static generation
- `npm run typecheck` — `nuxt typecheck` (vue-tsc); strict mode is on
- `npm run lint` — ESLint (`@nuxt/eslint` flat config)

No test runner is wired yet; add one (and document the single-test command) when the first tests land.

## Architecture

- **Stack:** Nuxt **4** (app code lives under `app/`), PrimeVue v4 (theme preset in `app/lib/primevue/preset.ts`), Tailwind (mobile-first, `tailwindcss-primeui` bridge), Inter via `@nuxt/fonts`. Minimalist/corporate **slate near-mono** palette — primary `#1E293B`; tokens in `app/assets/css/main.css`.
- **Layout:** `app/layouts/default.vue` is the responsive shell (persistent sidebar on desktop, `Drawer` on mobile) using `app/components/app/AppTopbar.vue` + `AppSidebar.vue`.
- **Two ways Directus is reached — do not conflate:** the **MCP server** (`.mcp.json`) is for Claude/dev tooling to *read* the backend; the **`@directus/sdk`** (`app/lib/directus/client.ts` + `useDirectus()` composable) is how the *app* reads at runtime. The SDK client is currently auth-less/read-only; per-module plans add end-user auth where writes are needed.
- **Modularity:** each business module is a grouping across the standard Nuxt dirs — `app/pages/<module>/**`, `app/components/<module>/**`, a `app/composables/use<Module>.ts`, `app/types/<module>.ts`, and authenticated BFF routes under `server/api/<module>/**` (reading/writing Directus as the signed-in user via `server/utils/directus-user.ts`). Shared code stays in `app/components/ui`, `app/composables`, `app/utils`, `app/lib`. **Implemented modules:** Inventory/Products (`/inventory`, collections `media_inventory`/`products`/`media_usage_log`; OpenBMS owns stock deduction in `server/utils/inventory.ts`) and Customers/Orders (collections `customers`/`contacts`/`orders`/`order_lines`; OpenBMS owns order totals in `server/utils/orders.ts`. **Orders are reached through a customer** — created/listed on `/customers/[id]`, detail at `/orders/[id]`; `/orders` redirects to `/customers`. Order lines link to orders via the **`orders_order_lines` m2m junction** — the `order_lines.order_id` FK is null in the live data, so the junction is canonical. Line items can be picked from the product catalog (snapshots name + price) or free-typed; an optional `order_lines.product` FK is written when that column exists). **POS** (`/pos` register + `/pos/history`) records per-line shop sales **into the existing `shop_sales`** collection (unified so sales analysis isn't forked) — one row per sale, `sales_total` = the entry amount (daily totals = `SUM(sales_total)` by day). The BFF (`server/utils/pos.ts` `mapSale`) maps app names ↔ shop_sales columns (`amount`→`sales_total`, `payment_method`→`sales_type`). Pilot adds columns `product_name`/`quantity`/`unit_price`/`sold_at` (DateTime, wall-clock — editable so back-encoded paper sales date correctly) + optional `product` m2o, and changes `sales_total` to `numeric(12,2)`. Catalog-pick-or-free-text entry; payment methods cash/deposit (= `sales_type`); history filters by date range/branch/method/product with totals. n8n does not write shop_sales. **POS auto-deducts stock:** when a sold product is linked to a stock item (`products.inventory_id`) and the `shop_sales.product` FK is stored, the sold qty is deducted 1:1 from `media_inventory.item_stock_value` (`posStockDelta` in `server/utils/pos.ts` → `adjustStock` in `inventory.ts`); edits reconcile (restore old, apply new), deletes restore. Negative allowed (a sale is never blocked); best-effort (stock failures don't fail the sale); free-text/unlinked items don't deduct. The deduction adjusts the stock value directly — it does not write a `media_usage_log` row, so POS consumption isn't in Stock-usage history. **Expenses** (`/expenses`) is CRUD over `shop_expenses` (amount/category/description/receipt), dated by `date_created`; category is a preset dropdown + free text; **receipt files** upload via a BFF proxy to Directus `/files` (`server/api/expenses/upload.post.ts`) and view via a token-authenticated asset proxy (`attachment/[id].get.ts`). Needs `directus_files` create + `/assets` read on the role.
- **Auth = server-side BFF.** `server/api/auth/*` proxy Directus auth (server-to-server) and store tokens in a sealed, httpOnly `obms_session` cookie (`server/utils/{crypto,session,directus,pin}.ts`). Client uses `useAuth()` / `usePin()`; `app/middleware/auth.global.ts` guards everything except `/login`, `/forgot-password`, `/reset-password`. No signup. Forgot-password uses Directus SMTP (reset URL must be in `PASSWORD_RESET_URL_ALLOW_LIST`). PIN quick-login is device-bound (refresh token sealed under a server-secret-peppered scrypt PIN hash, 5-attempt lockout) — a convenience feature, not a second factor. Secrets: `NUXT_SESSION_SECRET`, `NUXT_PIN_SECRET` (insecure dev fallbacks exist — set real values).
- **Design tokens:** single source of truth in `app/lib/theme/tokens.ts` → feeds the PrimeVue preset and is injected as `:root` CSS variables by `app/plugins/theme.ts`. Edit tokens there, not in CSS.
- **PWA:** `@vite-pwa/nuxt` (autoUpdate); icons generated from `public/logo.svg` at build; API routes excluded from the service worker. Test installability with `npm run build && npm run preview` over HTTPS.

## Working rules (project-specific, beyond AGENTS.md)

- **Backend is read-only; never destroy it.** Only read via Directus MCP — no create/update/delete — to avoid conflating live data. Surface any structural/destructive need to the user (the pilot). Enforced authoritatively by the MCP token's Directus role (Admin off, delete disabled).
- **Tiny, modular, individually-approved steps.** Each business module is its own plan that first **maps the existing Directus collections** before proposing changes.

## Rules that override Claude's defaults (read these first)

These differ from how Claude Code normally behaves — follow the repo's rules. See the cited `AGENTS.md` sections for the full text:

- **Git is delegated to Claude; golden rule: never commit or push sensitive data** (`AGENTS.md` §4 Git Management). Claude may branch, commit (writing the message per §4 standards), push and open PRs. Before each commit, review the staged diff for credentials, tokens, `.env`, DB files and personal data; if in doubt, leave it out and ask.
- **Plan before changing code, in `/plans`** (`AGENTS.md` §5 AI Planning Guidelines). Substantive changes start from a markdown plan at `/plans/YYYY-MM-DD-[review|implementation]-[short-description].md` with the structure defined there (Plan Details, Low Level Overview, File Manifest, Remarks). Set `Status: Planned` on creation; update to `Implemented` only after changes are complete and verified. **Do not modify files not listed in the plan's File Manifest.** Distinguish "plan created" from "implementation completed" when reporting.
