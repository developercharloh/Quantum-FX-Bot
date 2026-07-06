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
  useFundVaultWallet,
  useTransferVaultWallet,
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
  const [congrats, setCongrats] = useState<{ principal: number; reward: number; total: number } | null>(null);
  const [transferred, setTransferred] = useState<{ amount: number } | null>(null);
  const [showFund, setShowFund] = useState(false);
  const [fundAmount, setFundAmount] = useState("");

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getGetVaultStatusQueryKey() });

  const investMutation = useCreateVaultInvestment({
    mutation: {
      onSuccess: () => {
        toast({ title: "Investment started", description: "Your funds are now locked in your Vault." });
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
      onSuccess: (res: any) => {
        const principal = res?.principalAmount ?? 0;
        const reward = res?.rewardAmount ?? 0;
        const total = res?.totalCredited ?? principal + reward;
        setCongrats({ principal, reward, total });
        invalidate();
      },
      onError: (err: any) => {
        toast({ title: "Could not redeem", description: err?.message ?? "Something went wrong.", variant: "destructive" });
      },
    },
  });

  const transferMutation = useTransferVaultWallet({
    mutation: {
      onSuccess: (res: any) => {
        setTransferred({ amount: res?.transferredAmount ?? 0 });
        invalidate();
      },
      onError: (err: any) => {
        toast({ title: "Could not transfer", description: err?.message ?? "Something went wrong.", variant: "destructive" });
      },
    },
  });

  const fundMutation = useFundVaultWallet({
    mutation: {
      onSuccess: (res: any) => {
        toast({
          title: "Vault Wallet funded",
          description: `${formatMoney(res?.fundedAmount ?? 0)} transferred from your Main Wallet.`,
        });
        setShowFund(false);
        setFundAmount("");
        invalidate();
      },
      onError: (err: any) => {
        toast({ title: "Could not transfer", description: err?.message ?? "Something went wrong.", variant: "destructive" });
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

  const vaultWalletBalance = data?.vaultWalletBalance ?? 0;
  const insufficientVaultFunds =
    Number.isFinite(numericAmount) && numericAmount > 0 && numericAmount > vaultWalletBalance;
  const shortfall = insufficientVaultFunds ? numericAmount - vaultWalletBalance : 0;
  const numericFundAmount = parseFloat(fundAmount);

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
        <h1 className="text-lg font-semibold">Premium Fixed-Income Vault</h1>
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
              Invest with confidence through our fixed-term investment plans.
              Enjoy guaranteed daily rewards, paid in full at the end of your
              selected term.
            </p>
          </div>

          <div className="flex items-center gap-2 mt-1 flex-wrap justify-center">
            <span className="flex items-center gap-1.5 rounded-full bg-muted/50 border border-border/40 px-3 py-1.5 text-xs font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-500" /> Capital Security
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-muted/50 border border-border/40 px-3 py-1.5 text-xs font-medium">
              <TrendingUp className="w-3.5 h-3.5 text-amber-500" /> Predictable Returns
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-muted/50 border border-border/40 px-3 py-1.5 text-xs font-medium">
              <BadgeCheck className="w-3.5 h-3.5 text-amber-500" /> Maturity Payout
            </span>
          </div>
        </div>

        {isLoading && (
          <div className="text-center text-sm text-muted-foreground py-6">Loading Quantum Vault...</div>
        )}

        {data && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold flex items-center gap-1.5">
                <Gift className="w-4 h-4 text-emerald-500" /> Vault Wallet
              </span>
              <span className="text-xs text-muted-foreground">Main Wallet: {formatMoney(data.availableBalance)}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              A separate wallet used only to hold and invest in the Quantum Vault. Funds here
              can't be used for trading until you transfer them to your Main Wallet.
            </p>
            <p className="text-xl font-bold text-emerald-500">{formatMoney(vaultWalletBalance)}</p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={() => setShowFund(true)}
                className="w-full"
              >
                Fund from Main Wallet
              </Button>
              <Button
                onClick={() => transferMutation.mutate({ data: {} })}
                disabled={vaultWalletBalance <= 0 || transferMutation.isPending}
                className="w-full"
              >
                Transfer to Main Wallet
              </Button>
            </div>
          </div>
        )}

        {showFund && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6" onClick={() => setShowFund(false)}>
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl bg-card border border-emerald-500/30 p-6 flex flex-col gap-3"
            >
              <h2 className="text-lg font-bold">Fund Vault Wallet</h2>
              <p className="text-sm text-muted-foreground">
                Move funds from your Main Wallet ({formatMoney(data?.availableBalance ?? 0)} available) into your
                Vault Wallet so you can hold/invest in the Quantum Vault.
              </p>
              <input
                type="number"
                inputMode="decimal"
                value={fundAmount}
                onChange={(e) => setFundAmount(e.target.value)}
                placeholder="Amount"
                className="h-11 rounded-xl bg-muted/50 border border-border/40 px-3 text-sm outline-none focus:border-emerald-500/60"
              />
              <Button
                className="w-full"
                disabled={
                  !Number.isFinite(numericFundAmount) ||
                  numericFundAmount <= 0 ||
                  numericFundAmount > (data?.availableBalance ?? 0) ||
                  fundMutation.isPending
                }
                onClick={() => fundMutation.mutate({ data: { amount: numericFundAmount } })}
              >
                Transfer to Vault Wallet
              </Button>
              <button
                className="text-xs text-muted-foreground underline underline-offset-2 self-center"
                onClick={() => setShowFund(false)}
              >
                Cancel
              </button>
            </div>
          </div>
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
              onClick={() => redeemMutation.mutate({ data: {} })}
              className="w-full mt-1"
            >
              {data.active.isMatured
                ? `Redeem ${formatMoney(data.active.amount + data.active.rewardAmount)} (Principal + Reward)`
                : "Locked until maturity"}
            </Button>
          </div>
        )}

        {congrats && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6" onClick={() => setCongrats(null)}>
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl bg-card border border-amber-500/30 p-6 flex flex-col items-center gap-3 text-center"
            >
              <Gift className="w-10 h-10 text-amber-500" />
              <h2 className="text-lg font-bold">Congratulations! 🎉</h2>
              <p className="text-sm text-muted-foreground">
                Your Vault investment has matured. Your principal and rewards have been added to your Vault Wallet.
                Transfer them to your Main Wallet to use them for trading.
              </p>
              <div className="w-full rounded-xl bg-muted/40 p-3 flex flex-col gap-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Principal returned</span>
                  <span className="font-medium">{formatMoney(congrats.principal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reward earned</span>
                  <span className="font-medium text-emerald-500">{formatMoney(congrats.reward)}</span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-border/40">
                  <span className="font-semibold">Total in Vault Wallet</span>
                  <span className="font-bold text-amber-500">{formatMoney(congrats.total)}</span>
                </div>
              </div>
              <Button
                className="w-full mt-1"
                onClick={() => {
                  setCongrats(null);
                  transferMutation.mutate({ data: {} });
                }}
              >
                Transfer to Main Wallet
              </Button>
              <button
                className="text-xs text-muted-foreground underline underline-offset-2"
                onClick={() => setCongrats(null)}
              >
                I'll transfer later
              </button>
            </div>
          </div>
        )}

        {transferred && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6" onClick={() => setTransferred(null)}>
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl bg-card border border-emerald-500/30 p-6 flex flex-col items-center gap-3 text-center"
            >
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              <h2 className="text-lg font-bold">Transfer Complete</h2>
              <p className="text-sm text-muted-foreground">
                {formatMoney(transferred.amount)} has been moved from your Vault Wallet to your Main Wallet and is now available for trading.
              </p>
              <Button className="w-full mt-1" onClick={() => setTransferred(null)}>
                Great, thanks!
              </Button>
            </div>
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
                  <span className="text-xs font-medium">
                    Expected total after {termDays} days
                  </span>
                  <span className="text-sm font-bold text-emerald-500">{formatMoney(projectedReward ?? 0)}</span>
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Vault Wallet balance: {formatMoney(vaultWalletBalance)}
            </p>

            {insufficientVaultFunds && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 flex flex-col gap-2">
                <p className="text-xs text-red-400">
                  Insufficient funds in your Vault Wallet. Transfer {formatMoney(shortfall)} more from your Main
                  Wallet to activate this investment.
                </p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setFundAmount(shortfall.toFixed(2));
                    setShowFund(true);
                  }}
                >
                  Fund {formatMoney(shortfall)} from Main Wallet
                </Button>
              </div>
            )}

            <Button
              disabled={!matchedTier || !termDays || insufficientVaultFunds || investMutation.isPending}
              onClick={() =>
                investMutation.mutate({
                  data: { amount: numericAmount, termDays: termDays! },
                })
              }
              className="w-full"
            >
              Activate Investment Plan
            </Button>

            <div className="pt-2 border-t border-border/40 flex flex-col gap-1.5">
              <p className="text-xs text-muted-foreground mb-1">Daily Return Rates</p>
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
