import { Router } from "express";
import { db, usersTable, sessionsTable, transactionsTable, vaultInvestmentsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { getAvailableBalance, getVaultWalletBalance } from "../utils/balance.js";

const router = Router();

const TIERS = [
  { min: 100, max: 9999, dailyRate: 0.45 },
  { min: 10000, max: 49999, dailyRate: 0.6 },
  { min: 50000, max: 99999, dailyRate: 0.8 },
  { min: 100000, max: null as number | null, dailyRate: 1.2 },
];

const TERMS = [7, 30, 90, 180, 365];
const MIN_AMOUNT = 100;
const TEST_DURATION_MS = 60 * 1000;

function rateForAmount(amount: number): number | null {
  const tier = TIERS.find((t) => amount >= t.min && (t.max === null || amount <= t.max));
  return tier ? tier.dailyRate : null;
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
    dailyRate: parseFloat(inv.dailyRate),
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
  const vaultWalletBalance = await getVaultWalletBalance(user.id);

  return res.json({
    availableBalance,
    vaultWalletBalance,
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
  const testMode = req.body?.testMode === true;

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

  const dailyRate = rateForAmount(amount);
  if (dailyRate === null) {
    return res.status(400).json({ error: "Amount does not match any Quantum Vault tier." });
  }

  const available = await getAvailableBalance(user.id);
  if (available < amount) {
    return res.status(400).json({ error: `Insufficient balance. You need $${amount.toFixed(2)} but have $${available.toFixed(2)}.` });
  }

  const rewardAmount = parseFloat((amount * (dailyRate / 100) * termDays).toFixed(2));
  const startedAt = new Date();
  const durationMs = testMode ? TEST_DURATION_MS : termDays * 24 * 60 * 60 * 1000;
  const maturesAt = new Date(startedAt.getTime() + durationMs);

  await db.insert(vaultInvestmentsTable).values({
    userId: user.id,
    amount: amount.toFixed(2),
    termDays,
    dailyRate: dailyRate.toFixed(2),
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

  const force = req.body?.force === true;

  const rows = await db.select().from(vaultInvestmentsTable)
    .where(and(eq(vaultInvestmentsTable.userId, user.id), eq(vaultInvestmentsTable.status, "active")))
    .limit(1);

  if (rows.length === 0) {
    return res.status(400).json({ error: "No active Quantum Vault investment found." });
  }

  const inv = rows[0];
  if (!force && Date.now() < inv.maturesAt.getTime()) {
    return res.status(400).json({ error: "This investment has not matured yet." });
  }

  await db.update(vaultInvestmentsTable).set({
    status: "redeemed",
    redeemedAt: new Date(),
  }).where(eq(vaultInvestmentsTable.id, inv.id));

  // Redeemed funds land in the Vault Wallet (status "vault_hold"), NOT the main
  // balance — they cannot be used for trading, withdrawals, or new investments
  // until the user explicitly transfers them via /vault/transfer.
  await db.insert(transactionsTable).values({
    userId: user.id,
    type: "vault_unlock",
    amount: inv.amount,
    status: "vault_hold",
    paymentMethod: "balance",
    description: `Quantum Vault: ${inv.termDays}-day principal returned to Vault Wallet`,
  });

  await db.insert(transactionsTable).values({
    userId: user.id,
    type: "vault_reward",
    amount: inv.rewardAmount,
    status: "vault_hold",
    paymentMethod: "balance",
    description: `Quantum Vault: ${inv.termDays}-day reward credited to Vault Wallet`,
  });

  const totalCredited = parseFloat(inv.amount) + parseFloat(inv.rewardAmount);

  return res.json({
    message: "Investment redeemed — principal and rewards added to your Vault Wallet. Transfer to your Spot Wallet to use them.",
    principalAmount: parseFloat(inv.amount),
    rewardAmount: parseFloat(inv.rewardAmount),
    totalCredited,
  });
});

router.post("/vault/transfer", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = await getUserFromToken(token);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const holdRows = await db.select().from(transactionsTable)
    .where(and(eq(transactionsTable.userId, user.id), eq(transactionsTable.status, "vault_hold")));

  const transferable = holdRows.filter((t) => t.type === "vault_unlock" || t.type === "vault_reward");
  const transferAmount = transferable.reduce((sum, t) => sum + parseFloat(t.amount), 0);

  if (transferable.length === 0 || transferAmount <= 0) {
    return res.status(400).json({ error: "No funds available in your Vault Wallet to transfer." });
  }

  for (const t of transferable) {
    await db.update(transactionsTable).set({ status: "transferred" }).where(eq(transactionsTable.id, t.id));
  }

  await db.insert(transactionsTable).values({
    userId: user.id,
    type: "vault_transfer",
    amount: transferAmount.toFixed(2),
    status: "completed",
    paymentMethod: "balance",
    description: "Vault Wallet: transferred to Spot Wallet",
  });

  const availableBalance = await getAvailableBalance(user.id);
  const vaultWalletBalance = await getVaultWalletBalance(user.id);

  return res.json({
    message: "Funds transferred to your Spot Wallet.",
    transferredAmount: parseFloat(transferAmount.toFixed(2)),
    availableBalance,
    vaultWalletBalance,
  });
});

export default router;
