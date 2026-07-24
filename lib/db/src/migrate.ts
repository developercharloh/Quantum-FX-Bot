import path from "node:path";
import fs from "node:fs";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool } from "./index";

// Locate the committed SQL migrations folder at runtime. We walk up from the
// current working directory to the workspace root (identified by
// pnpm-workspace.yaml) so this works whether the process was started from the
// repo root (Render: `node artifacts/api-server/dist/index.mjs`) or from a
// package directory (Replit: `pnpm --filter ... run dev`). An explicit
// MIGRATIONS_DIR env var overrides the lookup.
function resolveMigrationsFolder(): string {
  if (process.env.MIGRATIONS_DIR) return process.env.MIGRATIONS_DIR;
  let dir = process.cwd();
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(dir, "pnpm-workspace.yaml"))) {
      return path.join(dir, "lib", "db", "migrations");
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.join(process.cwd(), "lib", "db", "migrations");
}

// Apply any pending SQL migrations. Drizzle tracks applied migrations in its own
// `drizzle.__drizzle_migrations` table, so this is idempotent and safe to run on
// every boot. This is what keeps the production schema in sync on Render's free
// plan, where `preDeployCommand` does not run. Returns the resolved folder so the
// caller can log it. Throws loudly if the folder/journal is missing rather than
// silently applying zero migrations.
// Run critical DDL statements directly via the pool — no file-system or
// migration-journal dependency. Executed on every boot so the production DB
// always has the minimum schema required for auth to work, regardless of
// whether Drizzle's migration runner could locate its SQL files.
export async function ensureCriticalSchema(): Promise<void> {
  const stmts = [
    // Users table — columns added in migrations 0001, 0005, 0006, 0013
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "status" varchar(20) NOT NULL DEFAULT 'active'`,
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_admin" boolean NOT NULL DEFAULT false`,
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "account_uid" varchar(15)`,
    `UPDATE "users" SET "account_uid" = 'QFX' || upper(substring(md5(id::text || 'qfxuid'), 1, 8)) WHERE "account_uid" IS NULL OR "account_uid" = ''`,
    `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "otp_bypass" boolean NOT NULL DEFAULT false`,
    // email_otps table — migration 0012
    `CREATE TABLE IF NOT EXISTS "email_otps" (
      "id" serial PRIMARY KEY NOT NULL,
      "email" varchar(255) NOT NULL,
      "otp" varchar(6) NOT NULL,
      "user_id" integer,
      "expires_at" timestamp NOT NULL,
      "used_at" timestamp,
      "created_at" timestamp DEFAULT now() NOT NULL
    )`,
  ];
  for (const sql of stmts) {
    try {
      await pool.query(sql);
    } catch {
      // Non-fatal: column/table may already exist in the expected form
    }
  }
}

export async function runMigrations(): Promise<string> {
  const migrationsFolder = resolveMigrationsFolder();
  const journal = path.join(migrationsFolder, "meta", "_journal.json");
  if (!fs.existsSync(journal)) {
    throw new Error(
      `Migrations journal not found at ${journal} (resolved folder: ${migrationsFolder}). ` +
        "Ensure lib/db/migrations is present at runtime or set MIGRATIONS_DIR.",
    );
  }
  await migrate(db, { migrationsFolder });
  return migrationsFolder;
}
