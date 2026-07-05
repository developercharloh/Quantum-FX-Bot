-- Investments created before the annual->daily rate fix stored the old annual-scale
-- rate (4.5, 6, 8, 12) in what is now the daily_rate column, and their reward_amount
-- was computed with the old annualized formula. For any still-active (unredeemed)
-- investment, correct the rate to its true daily-scale value (old value / 10, since
-- the new daily tiers were chosen as exactly 1/10th of the old annual tiers) and
-- recompute reward_amount with the correct formula: amount * (daily_rate/100) * term_days.
-- Already-redeemed investments are left untouched since money has already been paid out.
UPDATE vault_investments
SET
  daily_rate = (daily_rate / 10)::numeric(5,2),
  reward_amount = (amount * (daily_rate / 10 / 100) * term_days)::numeric(12,2)
WHERE status = 'active'
  AND daily_rate IN (4.5, 6, 8, 12);
