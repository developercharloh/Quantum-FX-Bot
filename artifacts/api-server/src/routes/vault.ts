import { Router } from "express";
import { db, usersTable, sessionsTable, transactionsTable, vaultInvestmentsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { getAvailableBalance } from "../utils/balance.js";

const router = Router();

const TIERS = [
  { min: 100, max: 9999, annualRate: 4.5 },
  { min: 10000, max: 49999, annualRate: 6 },
  { min: 50000, max: 99999, annualRate: 8 },
  { min: 100000, max: null as number | null, annualRate: 12 },
];

const TERMS = [7, 30, 90, 180, 365];
const MIN_AMOUNT = 100;

function rateForAmount(amount: number): number | null {
  const tier = TIERS.find((t) => amount >= t.min && (t.max === null || amount <= t.max));
  return tier ? tier.annualRate : null;
}

async function getUserFromToken(token: string | undefined) {
  if (!token) return null;
  const sessions = await db.select().from(sessionsTable).where(eq(sessionsTable.token, token)).limit(1);
  if (sessions.length === 0) return null;
  const users = await db.select().from(usersTable).where(eq(usersTable.id, sessions[0].userId)).limit(1);
  return users[0] ?? null;
}

function serializeInvestment(inv: typeof vaultInvestmentsTable.$inferSelect) {
  const now = Date.now();
  const started = inv.startedAt.getTime();
  const matures = inv.maturesAt.getTime();
  const totalMs = Math.max(matures - started, 1);
  const elapsedMs = Math.min(Math.max(now - started, 0), totalMs);
  const progressPercent = Math.round((elapsedMs / totalMs) * 10000) / 100;
  const daysElapsed = Math.min(inv.termDays, Math.floor(elapsedMs / (24 * 60 * 60 * 1000)));
  const daysRemaining = Math.max(inv.termDays - daysElapsed, 0);
  const rewardAmount = parseFloat(inv.rewardAmount);
  const isMatured = now >= matures;
  const accruedSoFar = inv.status === "redeemed"
    ? rewardAmount
    : parseFloat((rewardAmount * (elapsedMs / totalMs)).toFixed(2));

  return {
    id: inv.id,
    amount: parseFloat(inv.amount),
    termDays: inv.termDays,
    annualRate: parseFloat(inv.annualRate),
    rewardAmount,
    status: inv.status,
    startedAt: inv.startedAt.toISOString(),
    maturesAt: inv.maturesAt.toISOString(),
    redeemedAt: inv.redeemedAt ? inv.redeemedAt.toISOString() : null,
    isMatured,
    daysElapsed,
    daysRemaining,
    progressPercent,
    accruedSoFar,
  };
}

router.get("/vault/status", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = await getUserFromToken(token);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const investments = await db.select().from(vaultInvestmentsTable)
    .where(eq(vaultInvestmentsTable.userId, user.id))
    .orderBy(desc(vaultInvestmentsTable.createdAt));

  const active = investments.find((i) => i.status === "active");
  const history = investments.filter((i) => i.status !== "active");
  const availableBalance = await getAvailableBalance(user.id);

  return res.json({
    availableBalance,
    tiers: TIERS,
    terms: TERMS,
    minAmount: MIN_AMOUNT,
    active: active ? serializeInvestment(active) : null,
    history: history.map(serializeInvestment),
  });
});

router.post("/vault/invest", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = await getUserFromToken(token);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const amount = parseFloat(req.body?.amount);
  const termDays = parseInt(req.body?.termDays);

  if (!Number.isFinite(amount) || amount < MIN_AMOUNT) {
    return res.status(400).json({ error: `Minimum investment is $${MIN_AMOUNT}.` });
  }
  if (!TERMS.includes(termDays)) {
    return res.status(400).json({ error: "Invalid term selected." });
  }

  const existing = await db.select().from(vaultInvestmentsTable)
    .where(and(eq(vaultInvestmentsTable.userId, user.id), eq(vaultInvestmentsTable.status, "active")))
    .limit(1);
  if (existing.length > 0) {
    return res.status(400).json({ error: "You already have an active Quantum Vault investment. Redeem it before starting a new one." });
  }

  const annualRate = rateForAmount(amount);
  if (annualRate === null) {
    return res.status(400).json({ error: "Amount does not match any Quantum Vault tier." });
  }

  const available = await getAvailableBalance(user.id);
  if (available < amount) {
    return res.status(400).json({ error: `Insufficient balance. You need $${amount.toFixed(2)} but have $${available.toFixed(2)}.` });
  }

  const rewardAmount = parseFloat((amount * (annualRate / 100) * (termDays / 365)).toFixed(2));
  const startedAt = new Date();
  const maturesAt = new Date(startedAt.getTime() + termDays * 24 * 60 * 60 * 1000);

  await db.insert(vaultInvestmentsTable).values({
    userId: user.id,
    amount: amount.toFixed(2),
    termDays,
    annualRate: annualRate.toFixed(2),
    rewardAmount: rewardAmount.toFixed(2),
    status: "active",
    startedAt,
    maturesAt,
  });

  await db.insert(transactionsTable).values({
    userId: user.id,
    type: "vault_lock",
    amount: amount.toFixed(2),
    status: "completed",
    paymentMethod: "balance",
    description: `Quantum Vault: ${termDays}-day investment locked`,
  });

  return res.json({ message: "Quantum Vault investment started." });
});

router.post("/vault/redeem", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = await getUserFromToken(token);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const rows = await db.select().from(vaultInvestmentsTable)
    .where(and(eq(vaultInvestmentsTable.userId, user.id), eq(vaultInvestmentsTable.status, "active")))
    .limit(1);

  if (rows.length === 0) {
    return res.status(400).json({ error: "No active Quantum Vault investment found." });
  }

  const inv = rows[0];
  if (Date.now() < inv.maturesAt.getTime()) {
    return res.status(400).json({ error: "This investment has not matured yet." });
  }

  await db.update(vaultInvestmentsTable).set({
    status: "redeemed",
    redeemedAt: new Date(),
  }).where(eq(vaultInvestmentsTable.id, inv.id));

  await db.insert(transactionsTable).values({
    userId: user.id,
    type: "vault_reward",
    amount: inv.rewardAmount,
    status: "completed",
    paymentMethod: "balance",
    description: `Quantum Vault: ${inv.termDays}-day reward redeemed`,
  });

  return res.json({ message: "Rewards redeemed to your main balance." });
});

export default router;
