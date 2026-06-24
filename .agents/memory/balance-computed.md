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
