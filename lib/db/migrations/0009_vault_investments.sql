CREATE TABLE IF NOT EXISTS vault_investments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  term_days INTEGER NOT NULL,
  annual_rate NUMERIC(5, 2) NOT NULL,
  reward_amount NUMERIC(12, 2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  matures_at TIMESTAMP NOT NULL,
  redeemed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
