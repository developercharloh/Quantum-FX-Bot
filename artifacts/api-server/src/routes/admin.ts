import { Router, type Request, type Response, type NextFunction } from "express";
import {
  db,
  usersTable,
  botsTable,
  userBotsTable,
  transactionsTable,
  referralsTable,
  notificationsTable,
  kycTable,
  supportTicketsTable,
  userProfilesTable,
  settingsTable,
  type PaymentMethod,
} from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import crypto from "crypto";
import {
  AdminSetUserStatusBody,
  AdminAdjustBalanceBody,
  AdminReviewKycBody,
  AdminCreateBotBody,
  AdminUpdateBotBody,
  AdminAssignBotBody,
  AdminReviewTransactionBody,
  AdminReplyTicketBody,
  AdminUpdateSettingsBody,
  AdminBroadcastBody,
} from "@workspace/api-zod";

const router = Router();

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "quantum_salt_2024").digest("hex");
}

// Admin auth: if ADMIN_API_KEY is set, require a matching bearer token. If unset (local dev), allow.
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const key = process.env.ADMIN_API_KEY;
  if (!key) return next();
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (token !== key) return res.status(401).json({ error: "Unauthorized" });
  next();
}

router.use("/admin", requireAdmin);

const KYC_PENDING = ["pending", "submitted", "under_review"];

function txnDelta(type: string, amount: number): number {
  if (type === "deposit" || type === "trade_profit") return amount;
  if (type === "withdrawal" || type === "trade_loss") return -amount;
  return 0;
}

// ---------------- Overview ----------------
router.get("/admin/overview", async (_req, res) => {
  const [users, bots, userBots, txns, kycs, tickets] = await Promise.all([
    db.select().from(usersTable),
    db.select().from(botsTable),
    db.select().from(userBotsTable),
    db.select().from(transactionsTable),
    db.select().from(kycTable),
    db.select().from(supportTicketsTable),
  ]);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  let totalDeposits = 0;
  let totalWithdrawals = 0;
  for (const t of txns) {
    if (t.status !== "completed") continue;
    const amt = parseFloat(t.amount);
    if (t.type === "deposit") totalDeposits += amt;
    if (t.type === "withdrawal") totalWithdrawals += amt;
  }

  // Revenue series: net deposits per day, last 14 days
  const series: { date: string; value: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(startOfToday);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    series.push({ date: key, value: 0 });
  }
  const seriesIndex = new Map(series.map((p, idx) => [p.date, idx]));
  for (const t of txns) {
    if (t.status !== "completed" || t.type !== "deposit") continue;
    const key = t.createdAt.toISOString().split("T")[0];
    const idx = seriesIndex.get(key);
    if (idx !== undefined) series[idx].value += parseFloat(t.amount);
  }

  const userMap = new Map(users.map((u) => [u.id, u]));
  const recent = [...txns]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 10)
    .map((t) => {
      const u = userMap.get(t.userId);
      return {
        id: t.id,
        userId: t.userId,
        userName: u?.fullName ?? "Unknown",
        userEmail: u?.email ?? "",
        type: t.type,
        amount: parseFloat(t.amount),
        status: t.status,
        paymentMethod: t.paymentMethod,
        walletAddress: t.walletAddress,
        description: t.description,
        createdAt: t.createdAt.toISOString(),
      };
    });

  return res.json({
    totalUsers: users.length,
    activeUsers: users.filter((u) => u.status === "active").length,
    suspendedUsers: users.filter((u) => u.status === "suspended").length,
    newUsersToday: users.filter((u) => u.createdAt >= startOfToday).length,
    totalBots: bots.length,
    activeBotInstances: userBots.filter((b) => b.status === "running").length,
    totalDeposits,
    totalWithdrawals,
    netRevenue: totalDeposits - totalWithdrawals,
    pendingDeposits: txns.filter((t) => t.type === "deposit" && t.status === "pending").length,
    pendingWithdrawals: txns.filter((t) => t.type === "withdrawal" && t.status === "pending").length,
    pendingKyc: kycs.filter((k) => KYC_PENDING.includes(k.status)).length,
    openTickets: tickets.filter((t) => t.status === "open").length,
    revenueSeries: series,
    recentTransactions: recent,
  });
});

// ---------------- Users ----------------
router.get("/admin/users", async (req, res) => {
  const search = (req.query.search as string | undefined)?.trim().toLowerCase();

  const [users, userBots, txns, profiles] = await Promise.all([
    db.select().from(usersTable).orderBy(desc(usersTable.createdAt)),
    db.select().from(userBotsTable),
    db.select().from(transactionsTable),
    db.select().from(userProfilesTable),
  ]);

  const profileMap = new Map(profiles.map((p) => [p.userId, p]));
  const botCount = new Map<number, number>();
  const profitByUser = new Map<number, number>();
  for (const b of userBots) {
    botCount.set(b.userId, (botCount.get(b.userId) ?? 0) + 1);
    profitByUser.set(b.userId, (profitByUser.get(b.userId) ?? 0) + parseFloat(b.profitTotal));
  }
  const txnByUser = new Map<number, number>();
  for (const t of txns) {
    if (t.status !== "completed") continue;
    txnByUser.set(t.userId, (txnByUser.get(t.userId) ?? 0) + txnDelta(t.type, parseFloat(t.amount)));
  }

  let result = users.map((u) => {
    const balance = (txnByUser.get(u.id) ?? 0) + (profitByUser.get(u.id) ?? 0);
    return {
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      status: u.status,
      kycStatus: u.kycStatus,
      balance: Math.max(0, Math.round(balance * 100) / 100),
      totalBots: botCount.get(u.id) ?? 0,
      avatarUrl: u.avatarUrl,
      country: profileMap.get(u.id)?.country ?? null,
      createdAt: u.createdAt.toISOString(),
    };
  });

  if (search) {
    result = result.filter(
      (u) => u.fullName.toLowerCase().includes(search) || u.email.toLowerCase().includes(search),
    );
  }

  return res.json(result);
});

router.get("/admin/users/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!user) return res.status(404).json({ error: "User not found" });

  const [profile] = await db.select().from(userProfilesTable).where(eq(userProfilesTable.userId, id)).limit(1);
  const userBots = await db
    .select({ ub: userBotsTable, bot: botsTable })
    .from(userBotsTable)
    .leftJoin(botsTable, eq(userBotsTable.botId, botsTable.id))
    .where(eq(userBotsTable.userId, id));
  const txns = await db
    .select()
    .from(transactionsTable)
    .where(eq(transactionsTable.userId, id))
    .orderBy(desc(transactionsTable.createdAt));
  const referrals = await db.select().from(referralsTable).where(eq(referralsTable.referrerId, id));

  let balance = 0;
  let totalDeposits = 0;
  let totalWithdrawals = 0;
  for (const t of txns) {
    if (t.status !== "completed") continue;
    const amt = parseFloat(t.amount);
    balance += txnDelta(t.type, amt);
    if (t.type === "deposit") totalDeposits += amt;
    if (t.type === "withdrawal") totalWithdrawals += amt;
  }
  const profitTotal = userBots.reduce((s, b) => s + parseFloat(b.ub.profitTotal), 0);
  balance += profitTotal;

  return res.json({
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    status: user.status,
    kycStatus: user.kycStatus,
    balance: Math.max(0, Math.round(balance * 100) / 100),
    totalBots: userBots.length,
    avatarUrl: user.avatarUrl,
    phone: profile?.phone ?? null,
    country: profile?.country ?? null,
    referralCode: user.referralCode,
    referralCount: referrals.length,
    totalDeposits: Math.round(totalDeposits * 100) / 100,
    totalWithdrawals: Math.round(totalWithdrawals * 100) / 100,
    createdAt: user.createdAt.toISOString(),
    bots: userBots.map((b) => ({
      id: b.ub.id,
      botId: b.ub.botId,
      name: b.bot?.name ?? "Unknown Bot",
      status: b.ub.status,
      profitTotal: parseFloat(b.ub.profitTotal),
      profitToday: parseFloat(b.ub.profitToday),
      createdAt: b.ub.createdAt.toISOString(),
    })),
    transactions: txns.map((t) => ({
      id: t.id,
      userId: t.userId,
      userName: user.fullName,
      userEmail: user.email,
      type: t.type,
      amount: parseFloat(t.amount),
      status: t.status,
      paymentMethod: t.paymentMethod,
      walletAddress: t.walletAddress,
      description: t.description,
      createdAt: t.createdAt.toISOString(),
    })),
  });
});

async function getAdminUser(id: number) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!user) return null;
  const [profile] = await db.select().from(userProfilesTable).where(eq(userProfilesTable.userId, id)).limit(1);
  const userBots = await db.select().from(userBotsTable).where(eq(userBotsTable.userId, id));
  const txns = await db.select().from(transactionsTable).where(eq(transactionsTable.userId, id));
  let balance = 0;
  for (const t of txns) {
    if (t.status === "completed") balance += txnDelta(t.type, parseFloat(t.amount));
  }
  balance += userBots.reduce((s, b) => s + parseFloat(b.profitTotal), 0);
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    status: user.status,
    kycStatus: user.kycStatus,
    balance: Math.max(0, Math.round(balance * 100) / 100),
    totalBots: userBots.length,
    avatarUrl: user.avatarUrl,
    country: profile?.country ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}

router.post("/admin/users/:id/status", async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const parsed = AdminSetUserStatusBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  await db.update(usersTable).set({ status: parsed.data.status }).where(eq(usersTable.id, id));
  const user = await getAdminUser(id);
  if (!user) return res.status(404).json({ error: "User not found" });
  return res.json(user);
});

router.post("/admin/users/:id/reset-password", async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!user) return res.status(404).json({ error: "User not found" });

  const tempPassword = "Qfx-" + crypto.randomBytes(4).toString("hex");
  await db.update(usersTable).set({ passwordHash: hashPassword(tempPassword) }).where(eq(usersTable.id, id));
  return res.json({ tempPassword });
});

router.post("/admin/users/:id/adjust-balance", async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const parsed = AdminAdjustBalanceBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!user) return res.status(404).json({ error: "User not found" });

  const amount = parsed.data.amount;
  if (amount === 0) return res.status(400).json({ error: "Amount cannot be zero" });
  const note = parsed.data.note?.trim() || "Admin balance adjustment";

  await db.insert(transactionsTable).values({
    userId: id,
    type: amount >= 0 ? "deposit" : "withdrawal",
    amount: Math.abs(amount).toString(),
    status: "completed",
    paymentMethod: "admin",
    description: note,
  });

  const updated = await getAdminUser(id);
  return res.json(updated);
});

// ---------------- KYC ----------------
router.get("/admin/kyc", async (req, res) => {
  const status = req.query.status as string | undefined;
  const rows = await db
    .select({ kyc: kycTable, user: usersTable })
    .from(kycTable)
    .innerJoin(usersTable, eq(kycTable.userId, usersTable.id))
    .orderBy(desc(kycTable.submittedAt));

  let result = rows.map((r) => ({
    userId: r.kyc.userId,
    fullName: r.user.fullName,
    email: r.user.email,
    status: r.kyc.status,
    documentType: r.kyc.documentType,
    documentFrontUrl: r.kyc.documentFrontUrl,
    selfieUrl: r.kyc.selfieUrl,
    submittedAt: r.kyc.submittedAt ? r.kyc.submittedAt.toISOString() : null,
  }));
  if (status && status !== "all") {
    result = status === "pending" ? result.filter((r) => KYC_PENDING.includes(r.status)) : result.filter((r) => r.status === status);
  }
  return res.json(result);
});

router.post("/admin/kyc/:userId/review", async (req, res) => {
  const userId = Number(req.params.userId);
  if (Number.isNaN(userId)) return res.status(400).json({ error: "Invalid id" });
  const parsed = AdminReviewKycBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const approve = parsed.data.action === "approve";
  const newStatus = approve ? "verified" : "rejected";
  await db
    .update(kycTable)
    .set({ status: newStatus, rejectionReason: approve ? null : parsed.data.reason ?? null, reviewedAt: new Date() })
    .where(eq(kycTable.userId, userId));
  await db.update(usersTable).set({ kycStatus: newStatus }).where(eq(usersTable.id, userId));

  const [row] = await db
    .select({ kyc: kycTable, user: usersTable })
    .from(kycTable)
    .innerJoin(usersTable, eq(kycTable.userId, usersTable.id))
    .where(eq(kycTable.userId, userId))
    .limit(1);
  if (!row) return res.status(404).json({ error: "KYC not found" });
  return res.json({
    userId: row.kyc.userId,
    fullName: row.user.fullName,
    email: row.user.email,
    status: row.kyc.status,
    documentType: row.kyc.documentType,
    documentFrontUrl: row.kyc.documentFrontUrl,
    selfieUrl: row.kyc.selfieUrl,
    submittedAt: row.kyc.submittedAt ? row.kyc.submittedAt.toISOString() : null,
  });
});

// ---------------- Bots ----------------
async function mapBots() {
  const [bots, userBots] = await Promise.all([
    db.select().from(botsTable).orderBy(desc(botsTable.createdAt)),
    db.select().from(userBotsTable),
  ]);
  const usersByBot = new Map<number, number>();
  const profitByBot = new Map<number, number>();
  for (const b of userBots) {
    usersByBot.set(b.botId, (usersByBot.get(b.botId) ?? 0) + 1);
    profitByBot.set(b.botId, (profitByBot.get(b.botId) ?? 0) + parseFloat(b.profitTotal));
  }
  return bots.map((b) => ({
    id: b.id,
    name: b.name,
    description: b.description,
    category: b.category,
    riskLevel: b.riskLevel,
    price: parseFloat(b.price),
    monthlyReturn: parseFloat(b.monthlyReturn),
    winRate: parseFloat(b.winRate),
    minInvestment: parseFloat(b.minInvestment),
    iconUrl: b.iconUrl,
    isActive: b.isMarketplace,
    activeUsers: usersByBot.get(b.id) ?? 0,
    totalProfit: Math.round((profitByBot.get(b.id) ?? 0) * 100) / 100,
    createdAt: b.createdAt.toISOString(),
  }));
}

async function mapOneBot(id: number) {
  const all = await mapBots();
  return all.find((b) => b.id === id) ?? null;
}

router.get("/admin/bots", async (_req, res) => {
  return res.json(await mapBots());
});

router.post("/admin/bots", async (req, res) => {
  const parsed = AdminCreateBotBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const d = parsed.data;
  const [bot] = await db
    .insert(botsTable)
    .values({
      name: d.name,
      description: d.description,
      category: d.category,
      riskLevel: d.riskLevel,
      price: d.price.toString(),
      winRate: d.winRate.toString(),
      monthlyReturn: (d.monthlyReturn ?? 0).toString(),
      minInvestment: (d.minInvestment ?? 0).toString(),
      iconUrl: d.iconUrl ?? null,
      isMarketplace: d.isActive ?? true,
    })
    .returning();
  const mapped = await mapOneBot(bot.id);
  return res.status(201).json(mapped);
});

router.patch("/admin/bots/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const parsed = AdminUpdateBotBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const d = parsed.data;

  const update: Record<string, unknown> = {};
  if (d.name !== undefined) update.name = d.name;
  if (d.description !== undefined) update.description = d.description;
  if (d.category !== undefined) update.category = d.category;
  if (d.riskLevel !== undefined) update.riskLevel = d.riskLevel;
  if (d.price !== undefined) update.price = d.price.toString();
  if (d.winRate !== undefined) update.winRate = d.winRate.toString();
  if (d.monthlyReturn !== undefined) update.monthlyReturn = d.monthlyReturn.toString();
  if (d.minInvestment !== undefined) update.minInvestment = d.minInvestment.toString();
  if (d.iconUrl !== undefined) update.iconUrl = d.iconUrl;
  if (d.isActive !== undefined) update.isMarketplace = d.isActive;

  if (Object.keys(update).length > 0) {
    await db.update(botsTable).set(update).where(eq(botsTable.id, id));
  }
  const mapped = await mapOneBot(id);
  if (!mapped) return res.status(404).json({ error: "Bot not found" });
  return res.json(mapped);
});

router.delete("/admin/bots/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  await db.delete(userBotsTable).where(eq(userBotsTable.botId, id));
  await db.delete(botsTable).where(eq(botsTable.id, id));
  return res.json({ message: "Bot deleted" });
});

router.post("/admin/bots/:id/toggle", async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const [bot] = await db.select().from(botsTable).where(eq(botsTable.id, id)).limit(1);
  if (!bot) return res.status(404).json({ error: "Bot not found" });
  await db.update(botsTable).set({ isMarketplace: !bot.isMarketplace }).where(eq(botsTable.id, id));
  const mapped = await mapOneBot(id);
  return res.json(mapped);
});

router.post("/admin/bots/:id/assign", async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const parsed = AdminAssignBotBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const [bot] = await db.select().from(botsTable).where(eq(botsTable.id, id)).limit(1);
  if (!bot) return res.status(404).json({ error: "Bot not found" });
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, parsed.data.userId)).limit(1);
  if (!user) return res.status(404).json({ error: "User not found" });

  await db.insert(userBotsTable).values({
    userId: parsed.data.userId,
    botId: id,
    status: "running",
    startedAt: new Date(),
  });
  return res.json({ message: "Bot assigned" });
});

// ---------------- Transactions ----------------
function mapTxnRow(t: typeof transactionsTable.$inferSelect, u: typeof usersTable.$inferSelect | null) {
  // Derive network from payment method name, e.g. "USDT (TRC20)" → "TRC20"
  const network = t.paymentMethod?.match(/\(([^)]+)\)/)?.[1] ?? null;
  return {
    id: t.id,
    userId: t.userId,
    userName: u?.fullName ?? "Unknown",
    userEmail: u?.email ?? "",
    type: t.type,
    amount: parseFloat(t.amount),
    status: t.status,
    paymentMethod: t.paymentMethod,
    network,
    walletAddress: t.walletAddress,
    description: t.description,
    createdAt: t.createdAt.toISOString(),
  };
}

router.get("/admin/transactions", async (req, res) => {
  const type = req.query.type as string | undefined;
  const status = req.query.status as string | undefined;
  const rows = await db
    .select({ txn: transactionsTable, user: usersTable })
    .from(transactionsTable)
    .leftJoin(usersTable, eq(transactionsTable.userId, usersTable.id))
    .orderBy(desc(transactionsTable.createdAt));

  let result = rows.map((r) => mapTxnRow(r.txn, r.user));
  if (type && type !== "all") result = result.filter((t) => t.type === type);
  if (status && status !== "all") result = result.filter((t) => t.status === status);
  return res.json(result);
});

router.post("/admin/transactions/:id/review", async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const parsed = AdminReviewTransactionBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const newStatus = parsed.data.action === "approve" ? "completed" : "rejected";
  await db.update(transactionsTable).set({ status: newStatus }).where(eq(transactionsTable.id, id));

  const [row] = await db
    .select({ txn: transactionsTable, user: usersTable })
    .from(transactionsTable)
    .leftJoin(usersTable, eq(transactionsTable.userId, usersTable.id))
    .where(eq(transactionsTable.id, id))
    .limit(1);
  if (!row) return res.status(404).json({ error: "Transaction not found" });
  return res.json(mapTxnRow(row.txn, row.user));
});

// ---------------- Tickets ----------------
function mapTicketRow(t: typeof supportTicketsTable.$inferSelect, u: typeof usersTable.$inferSelect | null) {
  return {
    id: t.id,
    userId: t.userId,
    userName: u?.fullName ?? "Unknown",
    userEmail: u?.email ?? "",
    subject: t.subject,
    message: t.message,
    category: t.category,
    status: t.status,
    adminReply: t.adminReply,
    createdAt: t.createdAt.toISOString(),
    repliedAt: t.repliedAt ? t.repliedAt.toISOString() : null,
  };
}

router.get("/admin/tickets", async (req, res) => {
  const status = req.query.status as string | undefined;
  const rows = await db
    .select({ ticket: supportTicketsTable, user: usersTable })
    .from(supportTicketsTable)
    .leftJoin(usersTable, eq(supportTicketsTable.userId, usersTable.id))
    .orderBy(desc(supportTicketsTable.createdAt));

  let result = rows.map((r) => mapTicketRow(r.ticket, r.user));
  if (status && status !== "all") result = result.filter((t) => t.status === status);
  return res.json(result);
});

router.post("/admin/tickets/:id/reply", async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const parsed = AdminReplyTicketBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const [ticket] = await db.select().from(supportTicketsTable).where(eq(supportTicketsTable.id, id)).limit(1);
  if (!ticket) return res.status(404).json({ error: "Ticket not found" });

  await db
    .update(supportTicketsTable)
    .set({ adminReply: parsed.data.reply, repliedAt: new Date(), status: "answered", updatedAt: new Date() })
    .where(eq(supportTicketsTable.id, id));

  // Notify the user of the reply
  await db.insert(notificationsTable).values({
    userId: ticket.userId,
    type: "support",
    title: `Reply to: ${ticket.subject}`,
    message: parsed.data.reply,
  });

  const [row] = await db
    .select({ ticket: supportTicketsTable, user: usersTable })
    .from(supportTicketsTable)
    .leftJoin(usersTable, eq(supportTicketsTable.userId, usersTable.id))
    .where(eq(supportTicketsTable.id, id))
    .limit(1);
  return res.json(mapTicketRow(row!.ticket, row!.user));
});

router.post("/admin/tickets/:id/close", async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  await db
    .update(supportTicketsTable)
    .set({ status: "closed", updatedAt: new Date() })
    .where(eq(supportTicketsTable.id, id));
  const [row] = await db
    .select({ ticket: supportTicketsTable, user: usersTable })
    .from(supportTicketsTable)
    .leftJoin(usersTable, eq(supportTicketsTable.userId, usersTable.id))
    .where(eq(supportTicketsTable.id, id))
    .limit(1);
  if (!row) return res.status(404).json({ error: "Ticket not found" });
  return res.json(mapTicketRow(row.ticket, row.user));
});

// ---------------- Settings ----------------
async function getOrCreateSettings() {
  const rows = await db.select().from(settingsTable).limit(1);
  if (rows.length > 0) return rows[0];
  const [created] = await db.insert(settingsTable).values({}).returning();
  return created;
}

function mapSettings(s: typeof settingsTable.$inferSelect) {
  return {
    appName: s.appName,
    supportEmail: s.supportEmail,
    logoUrl: s.logoUrl,
    maintenanceMode: s.maintenanceMode,
    withdrawalsEnabled: s.withdrawalsEnabled,
    depositsEnabled: s.depositsEnabled,
    minDeposit: parseFloat(s.minDeposit),
    minWithdrawal: parseFloat(s.minWithdrawal),
    referralCommission: parseFloat(s.referralCommission),
    paymentMethods: s.paymentMethods ?? [],
  };
}

router.get("/admin/settings", async (_req, res) => {
  const s = await getOrCreateSettings();
  return res.json(mapSettings(s));
});

router.put("/admin/settings", async (req, res) => {
  const parsed = AdminUpdateSettingsBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const d = parsed.data;
  const current = await getOrCreateSettings();

  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (d.appName !== undefined) update.appName = d.appName;
  if (d.supportEmail !== undefined) update.supportEmail = d.supportEmail;
  if (d.logoUrl !== undefined) update.logoUrl = d.logoUrl;
  if (d.maintenanceMode !== undefined) update.maintenanceMode = d.maintenanceMode;
  if (d.withdrawalsEnabled !== undefined) update.withdrawalsEnabled = d.withdrawalsEnabled;
  if (d.depositsEnabled !== undefined) update.depositsEnabled = d.depositsEnabled;
  if (d.minDeposit !== undefined) update.minDeposit = d.minDeposit.toString();
  if (d.minWithdrawal !== undefined) update.minWithdrawal = d.minWithdrawal.toString();
  if (d.referralCommission !== undefined) update.referralCommission = d.referralCommission.toString();
  if (d.paymentMethods !== undefined) {
    update.paymentMethods = d.paymentMethods.map((p): PaymentMethod => ({
      id: p.id,
      name: p.name,
      network: p.network ?? null,
      address: p.address,
      enabled: p.enabled,
    }));
  }

  await db.update(settingsTable).set(update).where(eq(settingsTable.id, current.id));
  const s = await getOrCreateSettings();
  return res.json(mapSettings(s));
});

// ---------------- Broadcast ----------------
router.post("/admin/broadcast", async (req, res) => {
  const parsed = AdminBroadcastBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const users = await db.select({ id: usersTable.id }).from(usersTable);
  if (users.length > 0) {
    await db.insert(notificationsTable).values(
      users.map((u) => ({
        userId: u.id,
        type: "announcement",
        title: parsed.data.title,
        message: parsed.data.message,
      })),
    );
  }
  return res.json({ message: `Broadcast sent to ${users.length} users` });
});

export default router;
