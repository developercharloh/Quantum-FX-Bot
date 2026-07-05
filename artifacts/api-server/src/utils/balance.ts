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
      // NOTE: vault_unlock/vault_reward/vault_lock intentionally excluded here —
      // they only ever move money within the Vault Wallet (see getVaultWalletBalance).
      // Only vault_fund (Main -> Vault) and vault_transfer (Vault -> Main) cross the
      // boundary into/out of the Main (Spot) Wallet balance.
      if (t.type === "deposit" || t.type === "trade_profit" || t.type === "vault_transfer") balance += amt;
      if (t.type === "withdrawal" || t.type === "trade_loss" || t.type === "bot_purchase" || t.type === "vault_fund") balance -= amt;
    }
    // Pending withdrawals also lock the funds so users can't double-spend
    if (t.status === "pending" && t.type === "withdrawal") balance -= amt;
  }
  return balance;
}

// Funds sitting in the Vault Wallet — a fully separate wallet from the Main (Spot)
// Wallet. Money must be explicitly funded in from the Main Wallet (vault_fund)
// before it can be invested (vault_lock), and redeemed principal/reward
// (vault_unlock/vault_reward) land back here — never directly in the Main Wallet.
// It can only leave the Vault Wallet again via an explicit transfer back to the
// Main Wallet (vault_transfer). None of these types ever affect trading directly.
export async function getVaultWalletBalance(userId: number): Promise<number> {
  const txns = await db
    .select()
    .from(transactionsTable)
    .where(and(eq(transactionsTable.userId, userId), eq(transactionsTable.status, "completed")));

  let balance = 0;
  for (const t of txns) {
    const amt = parseFloat(t.amount);
    if (t.type === "vault_fund" || t.type === "vault_unlock" || t.type === "vault_reward") balance += amt;
    if (t.type === "vault_lock" || t.type === "vault_transfer") balance -= amt;
  }
  return balance;
}
