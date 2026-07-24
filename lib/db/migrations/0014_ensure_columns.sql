-- Idempotent safety migration: ensures columns that may be missing on older
-- production databases are present. Uses IF NOT EXISTS throughout so it is
-- safe to run even when the columns already exist (i.e. on fresh databases
-- that ran all previous migrations successfully).

-- account_uid: originally added in 0005 without IF NOT EXISTS guard on the
-- NOT NULL step, which could cause that migration to fail silently on some
-- production databases leaving the column absent.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "account_uid" varchar(15);
UPDATE "users"
  SET "account_uid" = 'QFX' || upper(substring(md5(id::text || 'qfxuid'), 1, 8))
  WHERE "account_uid" IS NULL OR "account_uid" = '';

-- otp_bypass: originally added in 0013 without IF NOT EXISTS, causing that
-- migration to fail on databases that were schema-pushed with this column
-- already present. The failure left it absent on databases that had NOT been
-- schema-pushed (i.e. fresh installs that ran migrations sequentially but hit
-- the duplicate-column error on the push path).
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "otp_bypass" boolean NOT NULL DEFAULT false;

-- status: added in 0001 with IF NOT EXISTS (safe), included here for
-- completeness in case of very old database snapshots.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "status" varchar(20) NOT NULL DEFAULT 'active';
