---
name: Balance is computed
description: User balance is derived from transactionsTable, not stored as a column on usersTable.
---

## Rule
There is NO `balance` column on `usersTable`. Balance is always derived at runtime by `getAvailableBalance(userId)` in `artifacts/api-server/src/utils/balance.ts`, which sums completed deposits/profits minus completed withdrawals/losses/purchases, and also subtracts pending withdrawals.

## Why
Avoids dual-write consistency bugs. The transaction ledger is the single source of truth.

## How to apply
To credit a user, insert a `{ type: "deposit", status: "completed" }` row into `transactionsTable`. Do not attempt to read or write `user.balance`.

## Watch out: duplicated balance logic goes stale
Several route files (`trade.ts`, `dashboard.ts`, `admin.ts`) each grew their own hand-rolled copy of the balance-summing loop instead of importing `getAvailableBalance`. When new transaction types were added (`vault_fund`, `vault_transfer`, `bot_purchase`), only `balance.ts` was updated — the duplicates silently went stale (e.g. funding the Vault Wallet didn't reduce the Main Wallet balance used for trade stake checks, because `trade.ts`'s local copy didn't know about `vault_fund`). When adding/changing a transaction type, grep `artifacts/api-server/src/routes/` for local balance loops (`let balance = 0`, `txnDelta`, `compute*Balance`) — don't assume editing `balance.ts` alone is enough. Prefer importing the shared function everywhere; only keep an inline bulk reducer where it's genuinely needed for performance (e.g. admin all-users list), and keep it manually in sync.
