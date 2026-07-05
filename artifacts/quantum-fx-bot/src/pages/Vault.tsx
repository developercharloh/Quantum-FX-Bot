import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, Gift, Lock, CheckCircle2, ShieldCheck, TrendingUp, BadgeCheck } from "lucide-react";
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

function formatCountdown(maturesAt: string, now: number): string {
  const remainingMs = new Date(maturesAt).getTime() - now;
  if (remainingMs <= 0) return "Matured";
  const totalHours = Math.floor(remainingMs / (60 * 60 * 1000));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (days === 0) return `${hours}h left`;
  return `${days}d ${hours}h left`;
}

export default function Vault() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading } = useGetVaultStatus();
  const [amount, setAmount] = useState("");
  const [termDays, setTermDays] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, []);

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
        toast({ title: "Could not invest", description: err?.message ?? "Something went wrong.", variant: "destructive" });
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
        toast({ title: "Could not redeem", description: err?.message ?? "Something went wrong.", variant: "destructive" });
      },
    },
  });

  const numericAmount = parseFloat(amount);
  const matchedTier = data?.tiers.find(
    (t) => Number.isFinite(numericAmount) && numericAmount >= t.min && (t.max == null || numericAmount <= t.max)
  );
  const dailyReward =
    matchedTier && Number.isFinite(numericAmount)
      ? numericAmount * (matchedTier.dailyRate / 100)
      : null;
  const projectedReward =
    dailyReward != null && termDays ? dailyReward * termDays : null;
  const growthMilestones =
    dailyReward != null && termDays
      ? Array.from(new Set([0.25, 0.5, 0.75, 1].map((f) => Math.max(1, Math.round(termDays * f)))))
          .sort((a, b) => a - b)
          .map((day) => ({ day, cumulative: dailyReward * day }))
      : [];

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
        <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-b from-amber-500/[0.07] to-transparent p-5 flex flex-col items-center text-center gap-3">
          <div
            className="flex items-center justify-center w-16 h-16 rounded-2xl"
            style={{
              background: "linear-gradient(145deg, #fde68a, #f59e0b 45%, #b45309)",
              boxShadow: "0 0 24px 6px rgba(245, 158, 11, 0.45)",
            }}
          >
            <Gift className="w-8 h-8 text-amber-950" strokeWidth={2.25} />
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-semibold">A Fixed-Term Growth Plan</h2>
            <p className="text-sm text-muted-foreground max-w-xs">
              Commit funds for a set term and earn guaranteed daily rewards
              — paid out in full the moment your term completes.
            </p>
          </div>

          <div className="flex items-center gap-2 mt-1 flex-wrap justify-center">
            <span className="flex items-center gap-1.5 rounded-full bg-muted/50 border border-border/40 px-3 py-1.5 text-xs font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-500" /> Secure Term
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-muted/50 border border-border/40 px-3 py-1.5 text-xs font-medium">
              <TrendingUp className="w-3.5 h-3.5 text-amber-500" /> Daily Growth
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-muted/50 border border-border/40 px-3 py-1.5 text-xs font-medium">
              <BadgeCheck className="w-3.5 h-3.5 text-amber-500" /> Guaranteed Payout
            </span>
          </div>
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
                <p className="text-xs text-muted-foreground">Daily rate</p>
                <p className="text-sm font-semibold text-amber-500">{data.active.dailyRate}%/day</p>
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
              <span className={data.active.isMatured ? "text-emerald-500 font-medium" : ""}>
                {data.active.isMatured ? "Matured — ready to redeem" : formatCountdown(data.active.maturesAt, now)}
              </span>
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

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> Earning
              </span>
              <span className="font-medium text-foreground/80">
                {formatMoney(data.active.rewardAmount / data.active.termDays)}/day
              </span>
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
                  Tier rate: {matchedTier.dailyRate}% daily
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

            {dailyReward != null && termDays != null && (
              <div className="rounded-xl bg-muted/40 p-3 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> Daily reward
                  </span>
                  <span className="text-sm font-semibold text-emerald-500">{formatMoney(dailyReward)}/day</span>
                </div>

                <div className="flex flex-col gap-1 pt-2 border-t border-border/40">
                  {growthMilestones.map((m) => (
                    <div key={m.day} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Day {m.day}</span>
                      <span className={m.day === termDays ? "font-semibold text-emerald-500" : "text-foreground/80"}>
                        {formatMoney(m.cumulative)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/40">
                  <span className="text-xs font-medium">Expected total after {termDays} days</span>
                  <span className="text-sm font-bold text-emerald-500">{formatMoney(projectedReward ?? 0)}</span>
                </div>
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
                  <span className="text-amber-500 font-medium">{t.dailyRate}% / day</span>
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
