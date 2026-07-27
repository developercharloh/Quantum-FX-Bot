import { Router, type IRouter } from "express";
import { db, settingsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  res.json({ status: "ok" });
});

// Public — no auth required. User app polls this to detect maintenance mode.
router.get("/status", async (_req, res) => {
  const rows = await db.select().from(settingsTable).limit(1);
  const maintenanceMode = rows[0]?.maintenanceMode ?? false;
  return res.json({ maintenanceMode });
});

export default router;
