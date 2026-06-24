---
name: Deposit session flow
description: Architecture of the 5-screen crypto deposit flow — separate table, status machine, admin approval credits via transaction insert.
---

## Rule
The full deposit flow uses a dedicated `deposit_sessions` table (not `transactions`). Crediting the user on approval means inserting a `completed` deposit row into `transactionsTable` — which is then picked up by `getAvailableBalance()`.

## Status machine
`created` → `waiting_payment` → `payment_detected` → `confirming` → `completed` | `failed` | `expired` | `cancelled`

## Key files
- `lib/db/src/schema/index.ts` — `depositSessionsTable` definition
- `lib/db/migrations/0004_deposit_sessions.sql` — migration
- `artifacts/api-server/src/routes/cashier.ts` — `POST /cashier/deposit/session`, `GET /cashier/deposit/session/:id`, `POST /cashier/deposit/session/:id/txid`
- `artifacts/api-server/src/routes/admin.ts` — `GET /admin/deposit-sessions`, `POST /admin/deposit-sessions/:id/review` (actions: detect, update_confirmations, approve, reject)
- `artifacts/quantum-fx-bot/src/pages/cashier/Deposit.tsx` — steps 0 (select) + 1 (review); on confirm navigates to `/cashier/deposit/:id`
- `artifacts/quantum-fx-bot/src/pages/cashier/DepositStatus.tsx` — steps 2-5: address+QR, pending timeline, confirmations, success
- `artifacts/admin-app/src/pages/Finance.tsx` — tabbed: Deposits (sessions) + Transactions

## Why
A separate session table lets the system track the blockchain confirmation lifecycle without polluting the flat transaction ledger. Transactions only represent finalized events.

## How to apply
When approving a deposit session in admin, insert a `completed` deposit row into `transactionsTable` (this is what credits the balance) and then mark the session `completed` with `transactionId` set.
