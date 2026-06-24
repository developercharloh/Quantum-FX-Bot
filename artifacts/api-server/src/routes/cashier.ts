import { Router } from "express";
import { db, usersTable, sessionsTable, transactionsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { CreateDepositBody, CreateWithdrawalBody, ListTransactionsQueryParams } from "@workspace/api-zod";

const router = Router();

async function getUserFromToken(token: string | undefined) {
  if (!token) return null;
  const sessions = await db.select().from(sessionsTable).where(eq(sessionsTable.token, token)).limit(1);
  if (sessions.length === 0) return null;
  const users = await db.select().from(usersTable).where(eq(usersTable.id, sessions[0].userId)).limit(1);
  return users[0] ?? null;
}

const PAYMENT_METHODS = [
  { id: "usdt_trc20", name: "USDT (TRC20)", icon: "usdt", type: "crypto", network: "TRC20", depositAddress: "TRFX5YtttkLGynC9ujNvfqzF4w4xz7xHvB" },
  { id: "usdt_erc20", name: "USDT (ERC20)", icon: "usdt", type: "crypto", network: "ERC20", depositAddress: "0x7d7496c03b90d5df7670ec55c431af47903c2248" },
  { id: "bitcoin", name: "Bitcoin (BTC)", icon: "btc", type: "crypto", network: "Bitcoin", depositAddress: "bc1q6j499uy5wrghm4nz6sv7jxraq96h4jg443fpzz" },
];

router.post("/cashier/deposit", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = await getUserFromToken(token);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const parsed = CreateDepositBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const { amount, paymentMethod, walletAddress } = parsed.data;
  if (amount <= 0) return res.status(400).json({ error: "Amount must be greater than 0" });

  const [txn] = await db.insert(transactionsTable).values({
    userId: user.id,
    type: "deposit",
    amount: amount.toString(),
    status: "pending",
    paymentMethod,
    walletAddress: walletAddress ?? null,
    description: `Deposit via ${paymentMethod}`,
  }).returning();

  // Simulate processing - mark as completed
  await db.update(transactionsTable).set({ status: "completed" }).where(eq(transactionsTable.id, txn.id));

  return res.status(201).json({
    id: txn.id,
    type: txn.type,
    amount: parseFloat(txn.amount),
    status: "completed",
    paymentMethod: txn.paymentMethod,
    createdAt: txn.createdAt.toISOString(),
    walletAddress: txn.walletAddress,
  });
});

router.post("/cashier/withdraw", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = await getUserFromToken(token);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const parsed = CreateWithdrawalBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const { amount, paymentMethod, walletAddress } = parsed.data;
  if (amount <= 0) return res.status(400).json({ error: "Amount must be greater than 0" });

  const [txn] = await db.insert(transactionsTable).values({
    userId: user.id,
    type: "withdrawal",
    amount: amount.toString(),
    status: "pending",
    paymentMethod,
    walletAddress,
    description: `Withdrawal via ${paymentMethod}`,
  }).returning();

  return res.status(201).json({
    id: txn.id,
    type: txn.type,
    amount: parseFloat(txn.amount),
    status: txn.status,
    paymentMethod: txn.paymentMethod,
    createdAt: txn.createdAt.toISOString(),
    walletAddress: txn.walletAddress,
  });
});

router.get("/cashier/transactions", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const user = await getUserFromToken(token);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const type = req.query.type as string || "all";

  let query = db.select().from(transactionsTable).where(eq(transactionsTable.userId, user.id)).$dynamic();

  if (type === "deposit") {
    query = db.select().from(transactionsTable)
      .where(and(eq(transactionsTable.userId, user.id), eq(transactionsTable.type, "deposit")))
      .orderBy(desc(transactionsTable.createdAt)).$dynamic();
  } else if (type === "withdrawal") {
    query = db.select().from(transactionsTable)
      .where(and(eq(transactionsTable.userId, user.id), eq(transactionsTable.type, "withdrawal")))
      .orderBy(desc(transactionsTable.createdAt)).$dynamic();
  }

  const txns = await db.select().from(transactionsTable)
    .where(eq(transactionsTable.userId, user.id))
    .orderBy(desc(transactionsTable.createdAt));

  const filtered = type !== "all" ? txns.filter(t => t.type === type) : txns;

  return res.json(filtered.map(t => ({
    id: t.id,
    type: t.type,
    amount: parseFloat(t.amount),
    status: t.status,
    paymentMethod: t.paymentMethod,
    createdAt: t.createdAt.toISOString(),
    walletAddress: t.walletAddress,
  })));
});

router.get("/cashier/payment-methods", async (req, res) => {
  return res.json(PAYMENT_METHODS);
});

export default router;
