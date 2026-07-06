export function formatUSD(
  amount: number | null | undefined,
  opts?: { decimals?: number }
): string {
  const value = typeof amount === "number" && Number.isFinite(amount) ? amount : 0;
  const decimals = opts?.decimals ?? 2;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  deposit: "Deposit",
  withdrawal: "Withdrawal",
  trade_profit: "Trade Profit",
  trade_loss: "Trade Capital",
  bot_purchase: "Bot Purchase",
  vault_fund: "Transfer to Vault",
  vault_transfer: "Transfer from Vault",
  vault_lock: "Vault Investment",
  vault_unlock: "Vault Principal Returned",
  vault_reward: "Vault Reward",
};

export function transactionTypeLabel(type: string): string {
  return TRANSACTION_TYPE_LABELS[type] ?? type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
