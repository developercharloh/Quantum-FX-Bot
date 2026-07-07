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
  const totalSeconds = Math.floor(remainingMs / 1000);
  const days = Math.floor(totalSeconds / (24 * 60 * 60));
  const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  if (days === 0) return `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s left`;
  return `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s left`;
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
    const interval = setInterval(() => setNow(Date.now()), 1_000);
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
      <div className="pb-10 flex flex-col gap-4">

        {/* ── Hero ── */}
        <div
          className="relative flex flex-col items-center text-center px-5 pt-10 pb-7 gap-4"
          style={{
            background: "linear-gradient(180deg, #1a0a2e 0%, #0d1117 100%)",
          }}
        >
          {/* back button */}
          <button
            onClick={() => navigate("/dashboard")}
            aria-label="Back"
            className="absolute top-5 left-4 w-9 h-9 rounded-full bg-white/10 border border-white/10 flex items-center justify-center"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>

          {/* orange glow orb + gift icon */}
          <div className="relative flex items-center justify-center w-20 h-20 mt-2">
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: "radial-gradient(circle, #f59e0b 0%, #b45309 55%, transparent 80%)",
                filter: "blur(8px)",
                opacity: 0.85,
              }}
            />
            <Gift className="relative w-9 h-9 text-amber-900" strokeWidth={2.2} />
          </div>

          <div className="flex flex-col gap-1.5">
            <h2 className="text-xl font-bold text-white">A Fixed-Term Growth Plan</h2>
            <p className="text-sm text-white/60 max-w-xs leading-relaxed">
              Invest with confidence through our fixed-term investment plans.
              Enjoy guaranteed daily rewards, paid in full at the end of your selected term.
            </p>
          </div>

          {/* badge pills — two on top row, one centred below */}
          <div className="flex flex-col items-center gap-2 mt-1">
            <div className="flex gap-2">
              <span className="flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1.5 text-xs font-medium text-white/80">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" /> Capital Security
              </span>
              <span className="flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1.5 text-xs font-medium text-white/80">
                <TrendingUp className="w-3.5 h-3.5 text-amber-400" /> Predictable Returns
              </span>
            </div>
            <span className="flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1.5 text-xs font-medium text-white/80">
              <BadgeCheck className="w-3.5 h-3.5 text-amber-400" /> Maturity Payout
            </span>
          </div>
        </div>

        <div className="px-4 flex flex-col gap-4">

          {isLoading && (
            <div className="text-center text-sm text-muted-foreground py-6">Loading Quantum Vault...</div>
          )}

          {/* ── Vault Wallet card ── */}
          {data && (
            <div
              className="rounded-2xl p-4 flex flex-col gap-3"
              style={{
                background: "linear-gradient(135deg, #0d2e2a 0%, #0a1f1c 100%)",
                border: "1px solid rgba(16,185,129,0.25)",
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, #059669, #047857)" }}
                  >
                    <Gift className="w-4.5 h-4.5 text-white" />
                  </div>
                  <span className="text-base font-bold text-white">Vault Wallet</span>
                </div>
                <span className="text-xs text-white/50">Main Wallet: {formatMoney(data.availableBalance)}</span>
              </div>

              <p className="text-xs text-white/50 leading-relaxed">
                A separate wallet used only to hold and invest in the Quantum Vault. Funds here
                can't be used for trading until you transfer them to your Main Wallet.
              </p>

              <p className="text-3xl font-bold" style={{ color: "#10b981" }}>
                {formatMoney(vaultWalletBalance)}
              </p>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setShowFund(true)}
                  className="h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 border border-white/15 text-white/80 bg-white/5"
                >
                  ↓ Fund from Main Wallet
                </button>
                <button
                  onClick={() => transferMutation.mutate({ data: {} })}
                  disabled={vaultWalletBalance <= 0 || transferMutation.isPending}
                  className="h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 text-white disabled:opacity-40"
                  style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}
                >
                  ↑ Transfer to Main Wallet
                </button>
              </div>
            </div>
          )}

          {/* ── Fund modal ── */}
          {showFund && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6" onClick={() => setShowFund(false)}>
              <div
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-sm rounded-2xl p-6 flex flex-col gap-3"
                style={{ background: "#0d2e2a", border: "1px solid rgba(16,185,129,0.3)" }}
              >
                <h2 className="text-lg font-bold text-white">Fund Vault Wallet</h2>
                <p className="text-sm text-white/50">
                  Move funds from your Main Wallet ({formatMoney(data?.availableBalance ?? 0)} available) into your
                  Vault Wallet so you can hold/invest in the Quantum Vault.
                </p>
                <input
                  type="number"
                  inputMode="decimal"
                  value={fundAmount}
                  onChange={(e) => setFundAmount(e.target.value)}
                  placeholder="Amount"
                  className="h-11 rounded-xl bg-white/5 border border-white/10 px-3 text-sm text-white outline-none focus:border-emerald-500/60"
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
                  className="text-xs text-white/40 underline underline-offset-2 self-center"
                  onClick={() => setShowFund(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* ── Active Investment card ── */}
          {data?.active && (
            <div
              className="rounded-2xl p-4 flex flex-col gap-3"
              style={{
                background: "linear-gradient(135deg, #1c1005 0%, #110d03 100%)",
                border: "1px solid rgba(245,158,11,0.35)",
              }}
            >
              {/* header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, #f59e0b, #b45309)" }}
                  >
                    <Lock className="w-4.5 h-4.5 text-amber-950" />
                  </div>
                  <span className="text-base font-bold text-white">Active Investment</span>
                </div>
                <span
                  className="text-xs font-medium px-2.5 py-1 rounded-full"
                  style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.2)" }}
                >
                  {data.active.termDays} days
                </span>
              </div>

              {/* amount + rate */}
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs text-white/50 mb-0.5">Locked amount</p>
                  <p className="text-2xl font-bold text-white">{formatMoney(data.active.amount)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-white/50 mb-0.5">Daily rate</p>
                  <p className="text-xl font-bold" style={{ color: "#f59e0b" }}>{data.active.dailyRate}%/day</p>
                </div>
              </div>

              {/* progress bar */}
              <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(data.active.progressPercent, 100)}%`,
                    background: "linear-gradient(90deg, #f59e0b, #d97706)",
                  }}
                />
              </div>

              {/* day counter + countdown */}
              <div className="flex justify-between text-xs">
                <span className="text-white/50">Day {data.active.daysElapsed} of {data.active.termDays}</span>
                <span className={data.active.isMatured ? "text-emerald-400 font-medium" : "text-white/50"}>
                  {data.active.isMatured ? "Matured — ready to redeem" : formatCountdown(data.active.maturesAt, now)}
                </span>
              </div>

              {/* three-column stats */}
              <div className="flex items-start justify-between pt-2 border-t border-white/10">
                <div>
                  <p className="text-xs text-white/50 mb-0.5">Grown so far</p>
                  <p className="text-sm font-bold text-emerald-400">{formatMoney(data.active.accruedSoFar)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-white/50 mb-0.5">Total reward at maturity</p>
                  <p className="text-sm font-bold text-white">{formatMoney(data.active.rewardAmount)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-white/50 mb-0.5">Earning</p>
                  <p className="text-sm font-bold text-emerald-400 flex items-center justify-end gap-0.5">
                    <TrendingUp className="w-3.5 h-3.5" />
                    {formatMoney(data.active.rewardAmount / data.active.termDays)}/day
                  </p>
                </div>
              </div>

              {/* redeem / locked button */}
              <button
                disabled={!data.active.isMatured || redeemMutation.isPending}
                onClick={() => redeemMutation.mutate({ data: {} })}
                className="w-full h-12 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 mt-1 disabled:opacity-70 transition-opacity"
                style={{
                  background: data.active.isMatured
                    ? "linear-gradient(135deg, #059669, #047857)"
                    : "linear-gradient(135deg, #7c3aed, #ec4899)",
                }}
              >
                {data.active.isMatured ? (
                  `Redeem ${formatMoney(data.active.amount + data.active.rewardAmount)}`
                ) : (
                  <><Lock className="w-4 h-4" /> Locked until maturity</>
                )}
              </button>
            </div>
          )}

          {/* ── Congrats modal ── */}
          {congrats && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6" onClick={() => setCongrats(null)}>
              <div
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-sm rounded-2xl p-6 flex flex-col items-center gap-3 text-center"
                style={{ background: "#1a0a2e", border: "1px solid rgba(245,158,11,0.3)" }}
              >
                <Gift className="w-10 h-10 text-amber-400" />
                <h2 className="text-lg font-bold text-white">Congratulations! 🎉</h2>
                <p className="text-sm text-white/50">
                  Your Vault investment has matured. Your principal and rewards have been added to your Vault Wallet.
                  Transfer them to your Main Wallet to use them for trading.
                </p>
                <div className="w-full rounded-xl bg-white/5 p-3 flex flex-col gap-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/50">Principal returned</span>
                    <span className="font-medium text-white">{formatMoney(congrats.principal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">Reward earned</span>
                    <span className="font-medium text-emerald-400">{formatMoney(congrats.reward)}</span>
                  </div>
                  <div className="flex justify-between pt-1.5 border-t border-white/10">
                    <span className="font-semibold text-white">Total in Vault Wallet</span>
                    <span className="font-bold text-amber-400">{formatMoney(congrats.total)}</span>
                  </div>
                </div>
                <Button
                  className="w-full mt-1"
                  onClick={() => { setCongrats(null); transferMutation.mutate({ data: {} }); }}
                >
                  Transfer to Main Wallet
                </Button>
                <button className="text-xs text-white/40 underline underline-offset-2" onClick={() => setCongrats(null)}>
                  I'll transfer later
                </button>
              </div>
            </div>
          )}

          {/* ── Transfer complete modal ── */}
          {transferred && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6" onClick={() => setTransferred(null)}>
              <div
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-sm rounded-2xl p-6 flex flex-col items-center gap-3 text-center"
                style={{ background: "#0d2e2a", border: "1px solid rgba(16,185,129,0.3)" }}
              >
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                <h2 className="text-lg font-bold text-white">Transfer Complete</h2>
                <p className="text-sm text-white/50">
                  {formatMoney(transferred.amount)} has been moved from your Vault Wallet to your Main Wallet and is now available for trading.
                </p>
                <Button className="w-full mt-1" onClick={() => setTransferred(null)}>Great, thanks!</Button>
              </div>
            </div>
          )}

          {/* ── New investment form ── */}
          {data && !data.active && (
            <div
              className="rounded-2xl p-4 flex flex-col gap-4"
              style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <h2 className="text-sm font-semibold text-white">Start a new investment</h2>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-white/50">Amount (min ${data.minAmount.toLocaleString()})</label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 15000"
                  className="h-11 rounded-xl bg-white/5 border border-white/10 px-3 text-sm text-white outline-none focus:border-amber-500/60"
                />
                {matchedTier && (
                  <span className="text-xs text-amber-400">
                    Tier rate: {matchedTier.dailyRate}% / day
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-white/50">Term</label>
                <div className="grid grid-cols-3 gap-2">
                  {data.terms.map((t) => {
                    const label =
                      t === 7 ? "7 Days" :
                      t === 30 ? "1 Month" :
                      t === 90 ? "3 Months" :
                      t === 180 ? "6 Months" :
                      t === 365 ? "1 Year" : `${t}d`;
                    return (
                      <button
                        key={t}
                        onClick={() => setTermDays(t)}
                        className="h-10 rounded-xl text-sm font-medium border transition-colors"
                        style={
                          termDays === t
                            ? { background: "#f59e0b", color: "#431407", borderColor: "#f59e0b" }
                            : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)", borderColor: "rgba(255,255,255,0.08)" }
                        }
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {dailyReward != null && termDays != null && (
                <div className="rounded-xl p-3 flex flex-col gap-2.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/50 flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> Daily reward
                    </span>
                    <span className="text-sm font-semibold text-emerald-400">{formatMoney(dailyReward)}/day</span>
                  </div>
                  <div className="flex flex-col gap-1 pt-2 border-t border-white/10">
                    {growthMilestones.map((m) => (
                      <div key={m.day} className="flex items-center justify-between text-xs">
                        <span className="text-white/40">Day {m.day}</span>
                        <span className={m.day === termDays ? "font-semibold text-emerald-400" : "text-white/70"}>
                          {formatMoney(m.cumulative)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-white/10">
                    <span className="text-xs font-medium text-white/70">Expected total after {termDays} days</span>
                    <span className="text-sm font-bold text-emerald-400">{formatMoney(projectedReward ?? 0)}</span>
                  </div>
                </div>
              )}

              <p className="text-xs text-white/40">
                Vault Wallet balance: {formatMoney(vaultWalletBalance)}
              </p>

              {insufficientVaultFunds && (
                <div className="rounded-xl p-3 flex flex-col gap-2" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>
                  <p className="text-xs text-red-400">
                    Insufficient funds in your Vault Wallet. Transfer {formatMoney(shortfall)} more from your Main Wallet to activate this investment.
                  </p>
                  <button
                    className="h-9 rounded-xl text-xs font-semibold text-white/80 border border-white/10 bg-white/5"
                    onClick={() => { setFundAmount(shortfall.toFixed(2)); setShowFund(true); }}
                  >
                    Fund {formatMoney(shortfall)} from Main Wallet
                  </button>
                </div>
              )}

              <button
                disabled={!matchedTier || !termDays || insufficientVaultFunds || investMutation.isPending}
                onClick={() => investMutation.mutate({ data: { amount: numericAmount, termDays: termDays! } })}
                className="w-full h-12 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-opacity"
                style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
              >
                Activate Investment Plan
              </button>

              {/* Daily return rates */}
              <div className="pt-2 border-t border-white/10 flex flex-col gap-1.5">
                <p className="text-xs text-white/40 mb-1">Daily Return Rates</p>
                {data.tiers.map((t, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-white/60">{formatMoney(t.min)}{t.max ? ` – ${formatMoney(t.max)}` : "+"}</span>
                    <span className="text-amber-400 font-medium">{t.dailyRate}% / day</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── History ── */}
          {data && data.history.length > 0 && (
            <div className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold text-white/70">History</h2>
              {data.history.map((h) => (
                <div key={h.id} className="rounded-xl p-3 flex items-center justify-between" style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div>
                    <p className="text-sm font-medium text-white">{formatMoney(h.amount)} · {h.termDays}d</p>
                    <p className="text-xs text-white/40">
                      {new Date(h.startedAt).toLocaleDateString()} – {new Date(h.maturesAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-400 text-sm font-medium">
                    <CheckCircle2 className="w-4 h-4" /> +{formatMoney(h.rewardAmount)}
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </Layout>
  );
}
