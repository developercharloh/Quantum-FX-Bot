ALTER TABLE "users" ADD COLUMN "account_uid" varchar(15);
UPDATE "users" SET "account_uid" = 'QFX' || upper(substring(md5(id::text || 'qfxuid'), 1, 8)) WHERE "account_uid" IS NULL;
ALTER TABLE "users" ALTER COLUMN "account_uid" SET NOT NULL;
ALTER TABLE "users" ADD CONSTRAINT "users_account_uid_unique" UNIQUE("account_uid");
