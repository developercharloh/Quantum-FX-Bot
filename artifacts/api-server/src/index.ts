import { runMigrations } from "@workspace/db/migrate";
import app from "./app";
import { logger } from "./lib/logger";
import { seedBots } from "./lib/seed";

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
    // Schema must be in sync before serving. Fail loudly so the platform retries
    // rather than running against a stale/missing schema.
    logger.error({ err }, "Database migration failed");
    process.exit(1);
  }

  try {
    await seedBots();
  } catch (err) {
    // Seeding is best-effort: log and continue so the server still boots.
    logger.error({ err }, "Bot seeding failed");
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
