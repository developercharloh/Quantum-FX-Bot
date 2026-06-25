import crypto from "node:crypto";
import { db, botsTable, usersTable, faqTable, notificationSettingsTable, kycTable } from "@workspace/db";
import { eq, sql, notInArray } from "drizzle-orm";
import { logger } from "./logger";

function hashPassword(p: string) {
  return crypto.createHash("sha256").update(p + "quantum_salt_2024").digest("hex");
}

const DEMO_EMAIL = "demo@quantumfx.com";
const DEMO_PASSWORD = "Demo1234!";
const DEMO_UID = "QFXDEMO0001";
const DEMO_NAME = "Demo User";

const FAQ_ENTRIES = [
  { question: "How do I deposit funds?", answer: "Go to Wallet > Deposit, choose your preferred method (USDT TRC20/ERC20, BTC, or card), and follow the on-screen instructions. Your balance updates once the transaction is confirmed.", category: "Deposits" },
  { question: "How do I start a trading bot?", answer: "Go to Bots > Marketplace, select a bot, and tap Buy Bot. Once purchased, the bot activates automatically and begins trading on your behalf.", category: "Bots" },
  { question: "When are profits paid out?", answer: "Profits are credited to your Available Balance in real-time as each trade closes. You can withdraw anytime once your balance meets the minimum threshold.", category: "Earnings" },
  { question: "What is the minimum withdrawal amount?", answer: "The minimum withdrawal is $10 USD equivalent. Withdrawals are processed within 24 hours to your verified payment method.", category: "Withdrawals" },
  { question: "How does the referral program work?", answer: "Share your unique referral link from the Team tab. You earn a commission on every deposit made by users you refer. Track your team and earnings in the Team section.", category: "Referrals" },
  { question: "Is KYC verification required?", answer: "KYC is required to enable withdrawals and unlock higher deposit limits. Go to Profile > KYC Verification and upload a valid government-issued ID.", category: "Security" },
  { question: "How secure is my account?", answer: "We use industry-standard encryption, two-factor authentication (2FA), and session management. Enable 2FA in Profile > Security for maximum protection.", category: "Security" },
  { question: "What if I forget my password?", answer: "Tap Forgot Password on the login screen and enter your registered email. You will receive a reset link within a few minutes. Check your spam folder if it does not arrive.", category: "Account" },
];

// Primary admin accounts — always promoted on startup regardless of env vars.
const SEED_ADMINS = ["mrcharlohfx@gmail.com"];

export async function ensureAdminEmail(): Promise<void> {
  const fromEnv = process.env["ADMIN_EMAIL"];
  const emails = [...SEED_ADMINS, ...(fromEnv ? [fromEnv.toLowerCase().trim()] : [])];

  for (const email of [...new Set(emails)]) {
    const result = await db
      .update(usersTable)
      .set({ isAdmin: true })
      .where(eq(usersTable.email, email))
      .returning({ id: usersTable.id, email: usersTable.email });
    if (result.length > 0) {
      logger.info({ email }, "Admin email auto-promoted");
    } else {
      logger.warn({ email }, "Admin seed email not found in users table — skipped");
    }
  }
}

export async function seedDemoAndFaq(): Promise<void> {
  // Demo user
  const existing = await db.select().from(usersTable).where(eq(usersTable.email, DEMO_EMAIL)).limit(1);
  if (existing.length === 0) {
    const [user] = await db.insert(usersTable).values({
      fullName: DEMO_NAME,
      email: DEMO_EMAIL,
      passwordHash: hashPassword(DEMO_PASSWORD),
      accountUid: DEMO_UID,
      kycStatus: "verified",
      twoFAEnabled: false,
      referralCode: "DEMOREF01",
    }).returning();
    await db.insert(notificationSettingsTable).values({ userId: user.id, emailNotifications: true, botAlerts: true, depositWithdrawal: true, promotions: false });
    await db.insert(kycTable).values({ userId: user.id, status: "not_submitted" });
    logger.info({ id: user.id }, "Demo user seeded");
  }

  // FAQ
  const count = await db.select({ c: sql<number>`count(*)::int` }).from(faqTable);
  if ((count[0]?.c ?? 0) === 0) {
    await db.insert(faqTable).values(FAQ_ENTRIES);
    logger.info({ count: FAQ_ENTRIES.length }, "FAQ seeded");
  }
}

type SeedBot = {
  name: string;
  description: string;
  category: string;
  price: string;
  winRate: string;
  riskLevel: string;
};

// The canonical trading-bot catalog. All bots are paid. Applied idempotently on
// every server start so the marketplace exists in any database (fresh production
// DBs included), matching bots by name to preserve existing IDs.
const BOT_CATALOG: SeedBot[] = [
  {
    name: "Alpha Signal Bot",
    description:
      "An entry-level forex signal bot that follows proven trend strategies. Ideal for traders starting their automated journey.",
    category: "Forex",
    price: "99",
    winRate: "80.00",
    riskLevel: "Medium",
  },
  {
    name: "Momentum Crypto Bot",
    description:
      "Captures momentum swings across major crypto pairs using balanced risk management and high-frequency signal analysis.",
    category: "Crypto",
    price: "149",
    winRate: "81.00",
    riskLevel: "Medium",
  },
  {
    name: "Breakout Pro Bot",
    description:
      "Detects and trades range breakouts on forex pairs, aiming to ride strong directional moves.",
    category: "Forex",
    price: "250",
    winRate: "84.00",
    riskLevel: "Medium",
  },
  {
    name: "Crypto Hunter Bot",
    description:
      "Hunts high-probability setups across major cryptocurrencies with disciplined risk management.",
    category: "Crypto",
    price: "450",
    winRate: "86.00",
    riskLevel: "Low",
  },
  {
    name: "Quantum Apex Bot",
    description:
      "Our flagship AI bot combining multiple models for premium signal quality, top-tier win rates, and the lowest drawdown.",
    category: "AI",
    price: "1000",
    winRate: "93.00",
    riskLevel: "Low",
  },
];

export async function seedBots(): Promise<void> {
  let inserted = 0;
  let updated = 0;

  for (const bot of BOT_CATALOG) {
    const existing = await db
      .select()
      .from(botsTable)
      .where(eq(botsTable.name, bot.name))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(botsTable)
        .set({
          description: bot.description,
          category: bot.category,
          price: bot.price,
          winRate: bot.winRate,
          riskLevel: bot.riskLevel,
          isMarketplace: true,
        })
        .where(eq(botsTable.id, existing[0]!.id));
      updated += 1;
    } else {
      await db.insert(botsTable).values({
        name: bot.name,
        description: bot.description,
        category: bot.category,
        price: bot.price,
        winRate: bot.winRate,
        riskLevel: bot.riskLevel,
        isMarketplace: true,
      });
      inserted += 1;
    }
  }

  // Hide any bots no longer in the catalog so they don't appear in the marketplace
  const catalogNames = BOT_CATALOG.map(b => b.name);
  await db.update(botsTable)
    .set({ isMarketplace: false })
    .where(notInArray(botsTable.name, catalogNames));

  logger.info({ inserted, updated, total: BOT_CATALOG.length }, "Bot catalog seeded");
}
