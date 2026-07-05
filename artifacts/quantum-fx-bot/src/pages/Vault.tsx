import { useState } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, Gift, Lock, CheckCircle2 } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  useGetVaultStatus,
  useCreateVaultInvestment,
  useRedeemVaultInvestment,
  getGetVaultStatusQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

function formatMoney(n: number) {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function Vault() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading } = useGetVaultStatus();
  const [amount, setAmount] = useState("");
  const [termDays, setTermDays] = useState<number | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getGetVaultStatusQueryKey() });

  const investMutation = useCreateVaultInvestment({
    mutation: {
      onSuccess: () => {
        toast({ title: "Investment started", description: "Your funds are now locked in Quantum Vault." });
        setAmount("");
        setTermDays(null);
        invalidate();
      },
      onError: (err: any) => {
        toast({ title: "Could not invest", description: err?.error ?? "Something went wrong.", variant: "destructive" });
      },
    },
  });

  const redeemMutation = useRedeemVaultInvestment({
    mutation: {
      onSuccess: () => {
        toast({ title: "Rewards redeemed", description: "Your rewards have been added to your main balance." });
        invalidate();
      },
      onError: (err: any) => {
        toast({ title: "Could not redeem", description: err?.error ?? "Something went wrong.", variant: "destructive" });
      },
    },
  });

  const numericAmount = parseFloat(amount);
  const matchedTier = data?.tiers.find(
    (t) => Number.isFinite(numericAmount) && numericAmount >= t.min && (t.max == null || numericAmount <= t.max)
  );
  const projectedReward =
    matchedTier && termDays
      ? numericAmount * (matchedTier.annualRate / 100) * (termDays / 365)
      : null;

  return (
    <Layout>
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button
          onClick={() => navigate("/dashboard")}
          aria-label="Back"
          className="w-9 h-9 rounded-full bg-card border border-border/40 flex items-center justify-center"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold">Quantum Vault</h1>
      </div>

      <div className="px-4 pb-10 flex flex-col gap-5">
        <div className="flex flex-col items-center text-center gap-3 py-4">
          <div
            className="flex items-center justify-center w-16 h-16 rounded-2xl"
            style={{
              background: "linear-gradient(145deg, #fde68a, #f59e0b 45%, #b45309)",
              boxShadow: "0 0 24px 6px rgba(245, 158, 11, 0.45)",
            }}
          >
            <Gift className="w-8 h-8 text-amber-950" strokeWidth={2.25} />
          </div>
          <p className="text-sm text-muted-foreground max-w-xs">
            Lock funds for a fixed term and grow daily. Once your term ends,
            redeem your rewards straight to your main balance. Locked capital
            cannot be withdrawn.
          </p>
        </div>

        {isLoading && (
          <div className="text-center text-sm text-muted-foreground py-6">Loading Quantum Vault...</div>
        )}

        {data?.active && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-amber-500" /> Active Investment
              </span>
              <span className="text-xs text-muted-foreground">{data.active.termDays} days</span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Locked amount</p>
                <p className="text-xl font-bold">{formatMoney(data.active.amount)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Annual rate</p>
                <p className="text-sm font-semibold text-amber-500">{data.active.annualRate}%</p>
              </div>
            </div>

            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all"
                style={{ width: `${Math.min(data.active.progressPercent, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Day {data.active.daysElapsed} of {data.active.termDays}</span>
              <span>{data.active.isMatured ? "Matured" : `${data.active.daysRemaining} days left`}</span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border/40">
              <div>
                <p className="text-xs text-muted-foreground">Grown so far</p>
                <p className="text-sm font-semibold text-emerald-500">{formatMoney(data.active.accruedSoFar)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Total reward at maturity</p>
                <p className="text-sm font-semibold">{formatMoney(data.active.rewardAmount)}</p>
              </div>
            </div>

            <Button
              disabled={!data.active.isMatured || redeemMutation.isPending}
              onClick={() => redeemMutation.mutate()}
              className="w-full mt-1"
            >
              {data.active.isMatured ? "Redeem Rewards" : "Locked until maturity"}
            </Button>
          </div>
        )}

        {data && !data.active && (
          <div className="rounded-2xl border border-border/40 p-4 flex flex-col gap-4">
            <h2 className="text-sm font-semibold">Start a new investment</h2>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Amount (min ${data.minAmount})</label>
              <input
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 1000"
                className="h-11 rounded-xl bg-muted/50 border border-border/40 px-3 text-sm outline-none focus:border-amber-500/60"
              />
              {matchedTier && (
                <span className="text-xs text-amber-500">
                  Tier rate: {matchedTier.annualRate}% annual
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Term</label>
              <div className="grid grid-cols-3 gap-2">
                {data.terms.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTermDays(t)}
                    className={`h-10 rounded-xl text-sm font-medium border transition-colors ${
                      termDays === t
                        ? "bg-amber-500 text-amber-950 border-amber-500"
                        : "bg-muted/40 border-border/40 text-muted-foreground"
                    }`}
                  >
                    {t}d
                  </button>
                ))}
              </div>
            </div>

            {projectedReward != null && (
              <div className="rounded-xl bg-muted/40 p-3 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Projected reward</span>
                <span className="text-sm font-semibold text-emerald-500">{formatMoney(projectedReward)}</span>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Available balance: {formatMoney(data.availableBalance)}
            </p>

            <Button
              disabled={!matchedTier || !termDays || investMutation.isPending}
              onClick={() => investMutation.mutate({ data: { amount: numericAmount, termDays: termDays! } })}
              className="w-full"
            >
              Lock Funds in Quantum Vault
            </Button>

            <div className="pt-2 border-t border-border/40 flex flex-col gap-1.5">
              <p className="text-xs text-muted-foreground mb-1">Reward tiers</p>
              {data.tiers.map((t, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span>{formatMoney(t.min)}{t.max ? ` – ${formatMoney(t.max)}` : "+"}</span>
                  <span className="text-amber-500 font-medium">{t.annualRate}% / yr</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {data && data.history.length > 0 && (
          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold">History</h2>
            {data.history.map((h) => (
              <div key={h.id} className="rounded-xl border border-border/40 p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{formatMoney(h.amount)} · {h.termDays}d</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(h.startedAt).toLocaleDateString()} - {new Date(h.maturesAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-500 text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4" /> +{formatMoney(h.rewardAmount)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
