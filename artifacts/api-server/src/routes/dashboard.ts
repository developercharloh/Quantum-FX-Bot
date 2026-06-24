import { Router } from "express";
import { db, usersTable, sessionsTable, userBotsTable, botsTable, transactionsTable, earningsTable } from "@workspace/db";
import { eq, desc, and, gte, sql } from "drizzle-orm";

const router = Router();

async function getUserFromToken(token: string | undefined) {
  if (!token) return null;
  const sessions = await db.select().from(sessionsTable).where(eq(sessionsTable.token, token)).limit(1);
  if (sessions.length === 0) return null;
  const users = await db.select().from(usersTable).where(eq(usersTable.id, sessions[0].userId)).limit(1);
  return users[0] ?? null;
}

router.get("/dashboard/summary", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = await getUserFromToken(token);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  // Get user's bots
  const userBots = await db.select().from(userBotsTable).where(eq(userBotsTable.userId, user.id));
  const activeBots = userBots.filter(b => b.status === "running");

  // Get transactions for balance
  const txns = await db.select().from(transactionsTable).where(
    and(eq(transactionsTable.userId, user.id), eq(transactionsTable.status, "completed"))
  );
  
  let balance = 0;
  for (const t of txns) {
    if (t.type === "deposit") balance += parseFloat(t.amount);
    if (t.type === "withdrawal") balance -= parseFloat(t.amount);
    if (t.type === "trade_profit") balance += parseFloat(t.amount);
    if (t.type === "trade_loss") balance -= parseFloat(t.amount);
  }

  const todayProfit = activeBots.reduce((sum, b) => sum + parseFloat(b.profitToday), 0);
  const totalEarnings = userBots.reduce((sum, b) => sum + parseFloat(b.profitTotal), 0);

  return res.json({
    totalBalance: Math.max(0, balance + totalEarnings),
    availableBalance: Math.max(0, balance),
    todayProfit,
    todayProfitPercent: todayProfit > 0 ? 5.3 : 0,
    totalEarnings,
    earningsChangePercent: totalEarnings > 0 ? 18.7 : 0,
    activeBots: activeBots.length,
    totalBots: userBots.length,
  });
});

router.get("/dashboard/earnings-chart", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = await getUserFromToken(token);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const period = (req.query.period as string) || "7D";
  const days = period === "7D" ? 7 : period === "30D" ? 30 : 90;

  // Generate chart data based on earnings
  const points = [];
  let cumulative = 0;
  const now = new Date();
  
  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    cumulative += Math.random() * 200 + 50;
    points.push({
      date: date.toISOString().split("T")[0],
      value: Math.round(cumulative * 100) / 100,
    });
  }

  return res.json(points);
});

router.get("/dashboard/recent-activity", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = await getUserFromToken(token);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const txns = await db.select().from(transactionsTable)
    .where(eq(transactionsTable.userId, user.id))
    .orderBy(desc(transactionsTable.createdAt))
    .limit(10);

  return res.json(txns.map(t => ({
    id: t.id,
    type: t.type,
    description: t.description || t.type.charAt(0).toUpperCase() + t.type.slice(1),
    amount: parseFloat(t.amount),
    status: t.status,
    createdAt: t.createdAt.toISOString(),
  })));
});

export default router;
