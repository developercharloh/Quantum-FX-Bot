import { Router } from "express";
import { db, usersTable, sessionsTable, userBotsTable, botsTable, transactionsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

async function getUserFromToken(token: string | undefined) {
  if (!token) return null;
  const sessions = await db.select().from(sessionsTable).where(eq(sessionsTable.token, token)).limit(1);
  if (sessions.length === 0) return null;
  const users = await db.select().from(usersTable).where(eq(usersTable.id, sessions[0].userId)).limit(1);
  return users[0] ?? null;
}

// List user's bots
router.get("/bots", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = await getUserFromToken(token);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const userBots = await db.select({
    ub: userBotsTable,
    bot: botsTable,
  }).from(userBotsTable)
    .innerJoin(botsTable, eq(userBotsTable.botId, botsTable.id))
    .where(eq(userBotsTable.userId, user.id));

  return res.json(userBots.map(({ ub, bot }) => ({
    id: ub.id,
    name: bot.name,
    status: ub.status,
    profitToday: parseFloat(ub.profitToday),
    winRate: parseFloat(bot.winRate),
    totalTrades: ub.totalTrades,
    iconUrl: bot.iconUrl,
    category: bot.category,
  })));
});

// Get bot detail
router.get("/bots/:id", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = await getUserFromToken(token);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const id = parseInt(req.params.id);
  const rows = await db.select({ ub: userBotsTable, bot: botsTable })
    .from(userBotsTable)
    .innerJoin(botsTable, eq(userBotsTable.botId, botsTable.id))
    .where(and(eq(userBotsTable.id, id), eq(userBotsTable.userId, user.id)))
    .limit(1);

  if (rows.length === 0) return res.status(404).json({ error: "Bot not found" });

  const { ub, bot } = rows[0];
  return res.json({
    id: ub.id,
    name: bot.name,
    status: ub.status,
    profitToday: parseFloat(ub.profitToday),
    profitTotal: parseFloat(ub.profitTotal),
    winRate: parseFloat(bot.winRate),
    totalTrades: ub.totalTrades,
    iconUrl: bot.iconUrl,
    category: bot.category,
    description: bot.description,
    performance: parseFloat(bot.winRate),
  });
});

// Toggle bot status
router.post("/bots/:id/toggle", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = await getUserFromToken(token);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const id = parseInt(req.params.id);
  const rows = await db.select({ ub: userBotsTable, bot: botsTable })
    .from(userBotsTable)
    .innerJoin(botsTable, eq(userBotsTable.botId, botsTable.id))
    .where(and(eq(userBotsTable.id, id), eq(userBotsTable.userId, user.id)))
    .limit(1);

  if (rows.length === 0) return res.status(404).json({ error: "Bot not found" });

  const { ub, bot } = rows[0];
  const newStatus = ub.status === "running" ? "paused" : "running";

  await db.update(userBotsTable).set({
    status: newStatus,
    startedAt: newStatus === "running" ? new Date() : undefined,
  }).where(eq(userBotsTable.id, id));

  return res.json({
    id: ub.id,
    name: bot.name,
    status: newStatus,
    profitToday: parseFloat(ub.profitToday),
    winRate: parseFloat(bot.winRate),
    totalTrades: ub.totalTrades,
    iconUrl: bot.iconUrl,
    category: bot.category,
  });
});

// Bot analytics chart
router.get("/bots/:id/analytics/:period", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = await getUserFromToken(token);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const period = req.params.period || "7D";
  const days = period === "7D" ? 7 : period === "30D" ? 30 : 90;

  const points = [];
  let value = 100;
  const now = new Date();

  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    value += (Math.random() - 0.3) * 20;
    points.push({
      date: date.toISOString().split("T")[0],
      value: Math.max(0, Math.round(value * 100) / 100),
    });
  }

  return res.json(points);
});

// Marketplace bots
router.get("/marketplace/bots", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = await getUserFromToken(token);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const marketplaceBots = await db.select().from(botsTable).where(eq(botsTable.isMarketplace, true));

  // Get user's purchased bot IDs
  const userBots = await db.select().from(userBotsTable).where(eq(userBotsTable.userId, user.id));
  const purchasedBotIds = new Set(userBots.map(ub => ub.botId));

  return res.json(marketplaceBots.map(bot => ({
    id: bot.id,
    name: bot.name,
    price: parseFloat(bot.price),
    winRate: parseFloat(bot.winRate),
    category: bot.category,
    riskLevel: bot.riskLevel,
    description: bot.description,
    iconUrl: bot.iconUrl,
    isPurchased: purchasedBotIds.has(bot.id),
  })));
});

// Purchase marketplace bot
router.post("/marketplace/bots/:id/purchase", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = await getUserFromToken(token);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const botId = parseInt(req.params.id);
  const bots = await db.select().from(botsTable).where(eq(botsTable.id, botId)).limit(1);
  if (bots.length === 0) return res.status(404).json({ error: "Bot not found" });

  // Check if already purchased
  const existing = await db.select().from(userBotsTable)
    .where(and(eq(userBotsTable.userId, user.id), eq(userBotsTable.botId, botId)))
    .limit(1);
  if (existing.length > 0) return res.status(400).json({ error: "Bot already purchased" });

  const bot = bots[0];

  await db.insert(userBotsTable).values({
    userId: user.id,
    botId,
    status: "paused",
    profitToday: "0",
    profitTotal: "0",
    totalTrades: 0,
  });

  await db.insert(transactionsTable).values({
    userId: user.id,
    type: "bot_purchase",
    amount: bot.price,
    status: "completed",
    paymentMethod: "balance",
    description: `Bot Purchase: ${bot.name}`,
  });

  return res.json({ message: "Bot purchased successfully" });
});

export default router;
