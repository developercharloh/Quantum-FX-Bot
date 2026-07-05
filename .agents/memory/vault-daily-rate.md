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

## Vault Wallet separation — two-way ledger (current, as of 2026-07-05)

The Vault Wallet is a fully separate two-way wallet from the Main (Spot) Wallet, not just a one-way redemption holding area:

1. Funds must be explicitly transferred Main→Vault (`POST /vault/fund`) before they can be invested/held in the Quantum Vault. Investing without enough Vault Wallet balance returns "Insufficient funds in your Vault Wallet... Transfer funds from your Main Wallet first."
2. Investing (`POST /vault/invest`) draws from the Vault Wallet balance, not the Main Wallet balance.
3. Redeeming (`POST /vault/redeem`) credits principal+reward back into the Vault Wallet (not Main).
4. To use funds for trading/withdrawal, the user must explicitly transfer Vault→Main (`POST /vault/transfer`, optional `amount` param, defaults to full balance).

**Why:** Explicit, repeated user instruction — vault funds should require deliberate action to move in *and* out, mirroring a real fixed-income sub-account rather than a one-way lockup.

**How to apply:** All vault ledger transaction types use `status="completed"` uniformly (no more special `"vault_hold"`/`"transferred"` statuses — that earlier design was superseded). In `balance.ts`: `getAvailableBalance` sums `deposit`/`trade_profit`/`vault_transfer` (+) and `withdrawal`/`trade_loss`/`bot_purchase`/`vault_fund` (-), all `status="completed"`. `getVaultWalletBalance` sums `vault_fund`/`vault_unlock`/`vault_reward` (+) and `vault_lock`/`vault_transfer` (-), all `status="completed"`. When adding any new vault-adjacent transaction type, register it explicitly in exactly one of these two ledger functions with `status="completed"` — do not invent new status values for wallet segregation; the wallets are segregated by transaction `type`, not `status`.
