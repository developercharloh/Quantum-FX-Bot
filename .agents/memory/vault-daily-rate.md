---
name: Quantum Vault rate is per-day, not annualized
description: Clarifies that the vault tier percentage field represents a daily rate applied directly per day times term length, not an annual rate divided by 365. Also documents the current principal-redemption business rule.
---

The Quantum Vault reward tier percentage (`dailyRate` on `vault_investments` / `VaultTier`) is a **daily rate**, applied as `amount * (dailyRate / 100) * termDays`.

**Why:** Originally implemented as an annualized rate (`amount * rate/100 * termDays/365`), which produced confusingly tiny daily payouts (e.g. $0.37/day on $3,000). User reported the displayed rate "didn't make sense," and a clarifying question confirmed the intended semantics were a true daily rate, not an annual one.

**How to apply:** If touching vault reward math, tier definitions, or UI copy, always treat the stored/displayed percentage as per-day. Do not reintroduce `/365` annualization. Current tiers (as of this decision): 0.45%/0.6%/0.8%/1.2% daily.

## Principal redemption rule (current, as of 2026-07-05)

Principal IS redeemable at maturity, together with rewards, via the redeem button — both amounts are credited to the main wallet balance in one action, with a congratulations dialog summarizing principal/reward/total.

**Why:** The business rule was reversed by explicit user instruction after being implemented the opposite way ("principal locked forever") multiple times previously. Treat this as the current source of truth unless the user says otherwise again — if it conflicts with older copy/UI text found in the code, the code's actual redeem behavior (not old marketing copy) is authoritative.

**How to apply:** `POST /vault/redeem` inserts both a `vault_unlock` (principal) and `vault_reward` transaction on redemption; `balance.ts` must treat both as balance-adding types. A `force: true` field on the redeem request bypasses the maturity check — this exists only as a developer/testing escape hatch (exposed in the UI as "Reset investment (testing only)"), not a real product feature. Similarly `testMode: true` on `/vault/invest` sets maturity to 60 seconds instead of the real term — also testing-only, remove or gate behind an admin flag before real launch.
