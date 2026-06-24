import { db, botsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

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
  // --- Free bots ---
  {
    name: "Starter Signal Bot",
    description:
      "A free entry-level bot that follows conservative trend signals. Perfect for trying out automated trading with zero cost.",
    category: "Forex",
    price: "0",
    winRate: "70.00",
    riskLevel: "Low",
  },
  {
    name: "Demo Pilot Bot",
    description:
      "A free crypto bot for learning the ropes. Low-stakes momentum trades that help you understand how signal execution works.",
    category: "Crypto",
    price: "0",
    winRate: "72.00",
    riskLevel: "Low",
  },
  // --- Paid bots ($100 - $1000) ---
  {
    name: "Gold Scalper Bot",
    description:
      "High-frequency scalping on gold and commodities with tight risk control and consistent low-volatility returns.",
    category: "Commodities",
    price: "100",
    winRate: "88.00",
    riskLevel: "Low",
  },
  {
    name: "Forex Turbo Bot",
    description:
      "Fast-moving forex bot that captures intraday momentum across major currency pairs.",
    category: "Forex",
    price: "180",
    winRate: "85.00",
    riskLevel: "Medium",
  },
  {
    name: "Breakout Pro Bot",
    description:
      "Detects and trades range breakouts on forex pairs, aiming to ride strong directional moves.",
    category: "Forex",
    price: "250",
    winRate: "79.00",
    riskLevel: "Medium",
  },
  {
    name: "Scalping Pro Bot",
    description:
      "Aggressive scalping engine that books many small wins per session for active traders.",
    category: "Forex",
    price: "340",
    winRate: "80.00",
    riskLevel: "High",
  },
  {
    name: "Crypto Hunter Bot",
    description:
      "Hunts volatility across major cryptocurrencies, targeting high-reward swings with managed exposure.",
    category: "Crypto",
    price: "450",
    winRate: "82.00",
    riskLevel: "High",
  },
  {
    name: "Mean Reversion Bot",
    description:
      "Trades mean-reversion setups on commodities, fading overextended moves back toward fair value.",
    category: "Commodities",
    price: "550",
    winRate: "83.00",
    riskLevel: "Low",
  },
  {
    name: "AI Trend Master",
    description:
      "AI-driven trend-following model that adapts to changing market regimes for steady performance.",
    category: "AI",
    price: "700",
    winRate: "91.00",
    riskLevel: "Low",
  },
  {
    name: "Momentum Quant Bot",
    description:
      "Quantitative momentum strategy that rotates into the strongest trending assets across markets.",
    category: "AI",
    price: "850",
    winRate: "87.00",
    riskLevel: "Medium",
  },
  {
    name: "Quantum Apex Bot",
    description:
      "Our flagship AI bot combining multiple models for premium signal quality and top-tier win rates.",
    category: "AI",
    price: "1000",
    winRate: "93.00",
    riskLevel: "High",
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
