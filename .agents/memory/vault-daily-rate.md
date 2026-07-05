---
name: Quantum Vault rate is per-day, not annualized
description: Clarifies that the vault tier percentage field represents a daily rate applied directly per day times term length, not an annual rate divided by 365.
---

The Quantum Vault reward tier percentage (`dailyRate` on `vault_investments` / `VaultTier`) is a **daily rate**, applied as `amount * (dailyRate / 100) * termDays`.

**Why:** Originally implemented as an annualized rate (`amount * rate/100 * termDays/365`), which produced confusingly tiny daily payouts (e.g. $0.37/day on $3,000). User reported the displayed rate "didn't make sense," and a clarifying question confirmed the intended semantics were a true daily rate, not an annual one.

**How to apply:** If touching vault reward math, tier definitions, or UI copy, always treat the stored/displayed percentage as per-day. Do not reintroduce `/365` annualization. Current tiers (as of this decision): 0.45%/0.6%/0.8%/1.2% daily.
