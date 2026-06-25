import crypto from "node:crypto";
import { db, botsTable, usersTable, faqTable, notificationSettingsTable, kycTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
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

// The canonical trading-bot catalog. Two free bots so new users can start
// trading immediately, plus paid bots spanning $100 to $1000. This is applied
// idempotently on every server start so the marketplace exists in any database
// (fresh production DBs included), matching bots by name to preserve existing IDs.
const BOT_CATALOG: SeedBot[] = [
  // --- Free bots — Medium risk, ≥80% win rate ---
  {
    name: "Starter Signal Bot",
    description:
      "A free entry-level bot that follows conservative trend signals. Perfect for trying out automated trading with zero cost.",
    category: "Forex",
    price: "0",
    winRate: "80.00",
    riskLevel: "Medium",
  },
  {
    name: "Demo Pilot Bot",
    description:
      "A free crypto bot for learning the ropes. Balanced momentum trades that help you understand how signal execution works.",
    category: "Crypto",
    price: "0",
    winRate: "81.00",
    riskLevel: "Medium",
  },
  // --- Cheap paid bots ($100–$300) — Medium risk, ≥80% win rate ---
  {
    name: "Gold Scalper Bot",
    description:
      "High-frequency scalping on gold and commodities with tight risk control and consistent moderate-volatility returns.",
    category: "Commodities",
    price: "100",
    winRate: "82.00",
    riskLevel: "Medium",
  },
  {
    name: "Forex Turbo Bot",
    description:
      "Fast-moving forex bot that captures intraday momentum across major currency pairs.",
    category: "Forex",
    price: "180",
    winRate: "83.00",
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
  // --- Expensive bots ($340+) — Low risk, ≥85% win rate ---
  {
    name: "Scalping Pro Bot",
    description:
      "Precision scalping engine that books consistent small wins per session with low drawdown.",
    category: "Forex",
    price: "340",
    winRate: "85.00",
    riskLevel: "Low",
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
    name: "Mean Reversion Bot",
    description:
      "Trades mean-reversion setups on commodities, fading overextended moves back toward fair value.",
    category: "Commodities",
    price: "550",
    winRate: "87.00",
    riskLevel: "Low",
  },
  {
    name: "AI Trend Master",
    description:
      "AI-driven trend-following model that adapts to changing market regimes for steady, low-risk performance.",
    category: "AI",
    price: "700",
    winRate: "91.00",
    riskLevel: "Low",
  },
  {
    name: "Momentum Quant Bot",
    description:
      "Quantitative momentum strategy that rotates into the strongest trending assets with institutional-grade risk controls.",
    category: "AI",
    price: "850",
    winRate: "89.00",
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

  logger.info({ inserted, updated, total: BOT_CATALOG.length }, "Bot catalog seeded");
}
