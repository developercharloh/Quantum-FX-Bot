import { db, transactionsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";

export async function getAvailableBalance(userId: number): Promise<number> {
  const txns = await db
    .select()
    .from(transactionsTable)
    .where(eq(transactionsTable.userId, userId));

  let balance = 0;
  for (const t of txns) {
    const amt = parseFloat(t.amount);
    if (t.status === "completed") {
      // NOTE: vault_unlock/vault_reward intentionally excluded here — redeemed vault
      // funds land in the Vault Wallet (see getVaultWalletBalance) and only become
      // spendable/tradeable once explicitly transferred via vault_transfer.
      if (t.type === "deposit" || t.type === "trade_profit" || t.type === "vault_transfer") balance += amt;
      if (t.type === "withdrawal" || t.type === "trade_loss" || t.type === "bot_purchase" || t.type === "vault_lock") balance -= amt;
    }
    // Pending withdrawals also lock the funds so users can't double-spend
    if (t.status === "pending" && t.type === "withdrawal") balance -= amt;
  }
  return balance;
}

// Funds sitting in the Vault Wallet: redeemed vault principal + rewards that have
// NOT yet been transferred to the main (spot) wallet. These are held with status
// "vault_hold" and are never counted toward getAvailableBalance, so they cannot be
// used for trading, withdrawals, or new bot/vault purchases until transferred.
export async function getVaultWalletBalance(userId: number): Promise<number> {
  const txns = await db
    .select()
    .from(transactionsTable)
    .where(eq(transactionsTable.userId, userId));

  let balance = 0;
  for (const t of txns) {
    if (t.status !== "vault_hold") continue;
    if (t.type === "vault_unlock" || t.type === "vault_reward") {
      balance += parseFloat(t.amount);
    }
  }
  return balance;
}
