import { runMigrations } from "@workspace/db/migrate";
import app from "./app";
import { logger } from "./lib/logger";
import { seedBots, seedDemoAndFaq, ensureAdminEmail, purgeTestUsers } from "./lib/seed";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function start() {
  try {
    const migrationsFolder = await runMigrations();
    logger.info({ migrationsFolder }, "Database migrations applied");
  } catch (err) {
    // Log and continue — schema is already applied by preDeployCommand (drizzle push).
    // Crashing here on a transient DB connection failure (e.g. free-tier DB sleeping)
    // would take the entire service down unnecessarily.
    logger.warn({ err }, "Database migration skipped (non-fatal) — schema may already be current");
  }

  try {
    await purgeTestUsers();
  } catch (err) {
    logger.error({ err }, "Test user purge failed");
  }

  try {
    await seedBots();
  } catch (err) {
    logger.error({ err }, "Bot seeding failed");
  }

  try {
    await seedDemoAndFaq();
  } catch (err) {
    logger.error({ err }, "Demo/FAQ seeding failed");
  }

  try {
    await ensureAdminEmail();
  } catch (err) {
    logger.error({ err }, "Admin email promotion failed");
  }

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
  });
}

start();
