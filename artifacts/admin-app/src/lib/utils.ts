import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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
