---
name: Quantum Vault rate is per-day, not annualized
description: Clarifies that the vault tier percentage field represents a daily rate applied directly per day times term length, not an annual rate divided by 365. Also documents the current principal-redemption business rule.
---

The Quantum Vault reward tier percentage (`dailyRate` on `vault_investments` / `VaultTier`) is a **daily rate**, applied as `amount * (dailyRate / 100) * termDays`.

**Why:** Originally implemented as an annualized rate (`amount * rate/100 * termDays/365`), which produced confusingly tiny daily payouts (e.g. $0.37/day on $3,000). User reported the displayed rate "didn't make sense," and a clarifying question confirmed the intended semantics were a true daily rate, not an annual one.

**How to apply:** If touching vault reward math, tier definitions, or UI copy, always treat the stored/displayed percentage as per-day. Do not reintroduce `/365` annualization. Current tiers (as of this decision): 0.45%/0.6%/0.8%/1.2% daily.

## Principal redemption rule (superseded — see Vault Wallet separation below)

Principal IS redeemable at maturity, together with rewards, via the redeem button. As of 2026-07-05 this history is preserved for context, but see "Vault Wallet separation" below for the current (later) rule about *where* redeemed funds land.

**How to apply:** A `force: true` field on the redeem request bypasses the maturity check — this exists only as a developer/testing escape hatch (exposed in the UI as "Reset investment (testing only)"), not a real product feature. Similarly `testMode: true` on `/vault/invest` sets maturity to 60 seconds instead of the real term — also testing-only, remove or gate behind an admin flag before real launch.

## Vault Wallet separation (current, as of 2026-07-05)

Redeemed vault funds (principal + reward) are NOT usable for trading immediately — they land in a separate "Vault Wallet," not the main "Spot Wallet" (available balance). The user must explicitly tap "Transfer to Spot Wallet" to move them before they count toward available balance.

**Why:** Explicit user instruction, superseding the earlier rule where redeem credited the main balance directly. Rationale: vault funds should require a deliberate action before being tradeable, mirroring real fixed-income-to-spot transfers.

**How to apply:** `POST /vault/redeem` inserts `vault_unlock`/`vault_reward` transactions with `status="vault_hold"` (not `"completed"`) — `getAvailableBalance` in `balance.ts` deliberately excludes these statuses/types. `getVaultWalletBalance(userId)` sums `vault_hold` vault_unlock/vault_reward transactions to show the Vault Wallet balance. `POST /vault/transfer` marks all `vault_hold` rows as `status="transferred"` and inserts one new `vault_transfer` transaction with `status="completed"`, which IS counted by `getAvailableBalance`. If adding new vault-related transaction types, decide explicitly whether they should land in Spot Wallet (`completed`) or Vault Wallet (`vault_hold`) — do not default to `completed`. Pre-existing (grandfathered) `vault_unlock`/`vault_reward` rows with `status="completed"` from before this change are intentionally left as-is (no backfill).
