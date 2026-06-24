# Quantum FX Bot

A production-ready mobile-first fintech trading bot dashboard with dark navy + purple theme. Users register, deposit funds, purchase AI trading bots from the marketplace, monitor live P&L, manage withdrawals, and track referral earnings.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at `/api`)
- `pnpm --filter @workspace/quantum-fx-bot run dev` — run the frontend (port 18900, proxied at `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + shadcn/ui + wouter + TanStack Query
- Charts: Recharts (AreaChart, LineChart)
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — source of truth for all API contracts (40+ endpoints)
- `lib/db/src/schema/index.ts` — Drizzle ORM schema (11 tables)
- `lib/api-client-react/src/generated/api.ts` — generated React Query hooks
- `lib/api-zod/src/generated/` — generated Zod validators
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/quantum-fx-bot/src/pages/` — all 22 app pages
- `artifacts/quantum-fx-bot/src/contexts/AuthContext.tsx` — JWT auth context
- `artifacts/quantum-fx-bot/src/App.tsx` — routing + API base URL setup

## Architecture decisions

- **Contract-first API**: OpenAPI spec drives both server Zod validators and client React Query hooks via Orval codegen.
- **Bearer token auth**: Tokens stored in `sessions` table; `localStorage` key `qfx_token`; auth header set globally via `setAuthTokenGetter`.
- **API base URL**: `setBaseUrl("/api")` called at module load in `App.tsx` — the reverse proxy routes `/api` to the Express server on port 8080.
- **Password hashing**: SHA-256 + static salt (dev only, not production-safe).
- **Mobile-first**: `max-w-[430px] mx-auto` wrapper in `App.tsx`; bottom navigation for authenticated routes.

## Product

- **Auth flow**: Splash → Onboarding carousel → Register/Login → Dashboard
- **Dashboard**: Balance cards, earnings chart (7D/30D/90D), active bots summary, recent activity
- **Bots**: My bots list with status toggle, bot detail with P&L chart; Marketplace with 7 bots (filter by category/risk)
- **Cashier**: Deposit, Withdraw, Transaction history, Payment Methods (USDT TRC20/ERC20, BTC, Card)
- **Team**: Referral code + link, team member list, earnings overview chart
- **Profile**: Personal info, Security (password change, 2FA, active sessions), KYC upload, Notification settings
- **Support**: FAQ accordion (8 entries), ticket submission

## DB tables

`users`, `sessions`, `bots`, `user_bots`, `transactions`, `earnings`, `referrals`, `notifications`, `notification_settings`, `kyc`, `support_tickets`, `faq`, `user_profiles`

## Demo account

- Email: `demo@quantumfx.com`
- Password: `Demo1234!`

## Gotchas

- After changing `lib/db/src/schema/index.ts`, run `pnpm run typecheck:libs` then `pnpm --filter @workspace/db run push` (fast local dev). **For anything that must deploy, also run `pnpm --filter @workspace/db run generate` and commit the new `lib/db/migrations/*.sql`** — the API server applies migrations at startup (`runMigrations()` in `artifacts/api-server/src/index.ts`), which is what syncs the schema on Render's free plan (where `preDeployCommand` does not run).
- After changing `lib/api-spec/openapi.yaml`, run `pnpm --filter @workspace/api-spec run codegen` then `pnpm run typecheck:libs`.
- TanStack Query v5 `UseQueryOptions` requires `queryKey`, but Orval supplies it internally. Use `{ query: { enabled: ... } as any }` for conditional queries.
- Do NOT add Vite proxy — the shared reverse proxy already routes `/api` to the Express server.

## Deploy to Render

The repo includes `render.yaml` — a Blueprint that deploys the app as a **single web service** (Express serves both `/api` and the built React frontend) plus a managed Postgres database. Push to GitHub, then in Render: New > Blueprint, connect the repo.

- Single-service mode is gated behind `SERVE_CLIENT=true` (set in `render.yaml`). When unset (Replit), the frontend and API run separately behind the shared reverse proxy — Replit behavior is unchanged.
- Required env (all set by the blueprint): `SERVE_CLIENT=true`, `BASE_PATH=/`, `PORT=8080`, `NODE_ENV=production`, `NODE_VERSION`, and `DATABASE_URL` (injected from the managed DB's internal connection string — no SSL config needed for same-region internal connections).
- `BASE_PATH` and `PORT` are required at **build time** too (Vite config reads them), so both are declared as service env vars, not just runtime.
- The blueprint runs `pnpm --filter @workspace/db run push` as a pre-deploy step to apply the schema.
- Optional override: `CLIENT_DIST` sets the static dir Express serves (defaults to `artifacts/quantum-fx-bot/dist/public`).

## User preferences

- Be efficient: read only what's needed, batch all edits in one shot, minimize tool calls. Every task should be accurate and use as few operations as possible.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
