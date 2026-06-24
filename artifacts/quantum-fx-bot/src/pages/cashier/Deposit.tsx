import { useState } from "react";
import { useLocation } from "wouter";
import { useListPaymentMethods, useCreateDepositSession } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, Loader2, AlertTriangle, Clock, Shield, ArrowRight, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { SiTether, SiBitcoin } from "react-icons/si";

const QUICK_AMOUNTS = [100, 250, 500, 1000];
const MIN_DEPOSIT = 10;

const NETWORK_INFO: Record<string, { time: string; confirmations: number; fullName: string }> = {
  TRC20:   { time: "1–5 minutes",   confirmations: 20, fullName: "TRON (TRC20)"       },
  ERC20:   { time: "3–10 minutes",  confirmations: 12, fullName: "Ethereum (ERC20)"   },
  Bitcoin: { time: "10–60 minutes", confirmations: 6,  fullName: "Bitcoin Network"    },
};

export default function Deposit() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: paymentMethods, isLoading: loadingMethods } = useListPaymentMethods();
  const createSession = useCreateDepositSession();

  const [step, setStep] = useState<"select" | "review">("select");
  const [selectedMethodId, setSelectedMethodId] = useState("");
  const [amount, setAmount] = useState(100);
  const [amountInput, setAmountInput] = useState("100");

  const activeMethod = paymentMethods?.find((m) => m.id === selectedMethodId);
  const netInfo = activeMethod?.network ? NETWORK_INFO[activeMethod.network] ?? null : null;

  const getMethodIcon = (name: string) => {
    if (name.includes("USDT") || name.includes("Tether")) return <SiTether className="w-6 h-6 text-[#26A17B]" />;
    if (name.includes("BTC")  || name.includes("Bitcoin")) return <SiBitcoin className="w-6 h-6 text-[#F7931A]" />;
    return <Shield className="w-6 h-6 text-primary" />;
  };

  const handleContinue = () => {
    if (!selectedMethodId) { toast({ title: "Select a payment method", variant: "destructive" }); return; }
    if (!amount || amount < MIN_DEPOSIT) { toast({ title: `Minimum deposit is $${MIN_DEPOSIT}`, variant: "destructive" }); return; }
    setStep("review");
  };

  const handleConfirm = () => {
    createSession.mutate(
      { data: { amount, paymentMethodId: selectedMethodId } },
      {
        onSuccess: (session) => { setLocation(`/cashier/deposit/${session.id}`); },
        onError:   (err: any) => { toast({ title: "Failed to create deposit", description: err.message, variant: "destructive" }); },
      }
    );
  };

  // ── STEP: SELECT ────────────────────────────────────────────────────────────
  if (step === "select") {
    return (
      <Layout>
        <div className="p-5 pb-8 space-y-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setLocation("/cashier")} className="w-10 h-10 flex items-center justify-center rounded-xl bg-card">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold tracking-tight">Deposit</h1>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Select Payment Method</p>
            {loadingMethods
              ? Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)
              : paymentMethods?.map((method) => (
                  <div
                    key={method.id}
                    className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-colors ${
                      selectedMethodId === method.id ? "bg-card border-primary border" : "bg-card border border-transparent"
                    }`}
                    onClick={() => setSelectedMethodId(method.id)}
                  >
                    <div className="flex items-center gap-3">
                      {getMethodIcon(method.name)}
                      <div>
                        <p className="font-medium text-sm">{method.name}</p>
                        {method.network && <p className="text-[11px] text-muted-foreground">{method.network} Network</p>}
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedMethodId === method.id ? "border-primary" : "border-muted-foreground/30"}`}>
                      {selectedMethodId === method.id && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                    </div>
                  </div>
                ))}
          </div>

          <div className="space-y-4">
            <p className="text-sm font-medium text-muted-foreground">Enter Amount</p>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-xl font-bold">$</div>
              <Input
                type="number" min={MIN_DEPOSIT} value={amountInput}
                onChange={(e) => { setAmountInput(e.target.value); setAmount(parseFloat(e.target.value) || 0); }}
                className="pl-10 pr-4 bg-card border-none h-16 rounded-xl text-xl font-bold"
              />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {QUICK_AMOUNTS.map((qa) => (
                <Button key={qa} type="button"
                  className={`h-12 rounded-xl text-sm font-medium shadow-none ${amount === qa ? "bg-primary text-white" : "bg-card text-foreground hover:bg-card/80 border border-border"}`}
                  onClick={() => { setAmount(qa); setAmountInput(String(qa)); }}
                >
                  ${qa}
                </Button>
              ))}
            </div>
          </div>

          {activeMethod && (
            <div className="flex gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
              <p className="text-[11px] leading-relaxed text-amber-200/90">
                Send only {activeMethod.name} via the {activeMethod.network} network. Sending any other asset
                or using the wrong network may result in permanent loss of funds.
              </p>
            </div>
          )}

          <Button className="w-full h-14 rounded-xl text-lg font-medium shadow-none" onClick={handleContinue}>
            Continue
          </Button>
        </div>
      </Layout>
    );
  }

  // ── STEP: REVIEW ────────────────────────────────────────────────────────────
  return (
    <Layout>
      <div className="p-5 pb-8 space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setStep("select")} className="w-10 h-10 flex items-center justify-center rounded-xl bg-card">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold tracking-tight">Confirm Deposit</h1>
        </div>

        <div className="rounded-2xl bg-card p-6 text-center space-y-1">
          <p className="text-sm text-muted-foreground">Amount to Deposit</p>
          <p className="text-4xl font-bold">${amount.toFixed(2)}</p>
          <p className="text-sm text-primary font-medium">{activeMethod?.name}</p>
        </div>

        <div className="rounded-2xl bg-card p-5 space-y-4">
          <p className="text-sm font-semibold">Deposit Details</p>
          {[
            { label: "Payment Method",         value: activeMethod?.name ?? "" },
            { label: "Network",                value: netInfo?.fullName ?? activeMethod?.network ?? "" },
            { label: "Processing Time",        value: netInfo?.time ?? "Varies" },
            { label: "Minimum Deposit",        value: `$${MIN_DEPOSIT}` },
            { label: "Amount to be Credited",  value: `$${amount.toFixed(2)}` },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between border-b border-border/40 pb-3 last:border-0 last:pb-0">
              <span className="text-sm text-muted-foreground">{label}</span>
              <span className="text-sm font-semibold text-right max-w-[55%]">{value}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-card p-3 flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-primary shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground">Est. Processing</p>
              <p className="text-xs font-semibold">{netInfo?.time ?? "Varies"}</p>
            </div>
          </div>
          <div className="rounded-xl bg-card p-3 flex items-center gap-2.5">
            <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground">Confirmations</p>
              <p className="text-xs font-semibold">{netInfo?.confirmations ?? "—"} required</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2.5 rounded-xl border border-blue-500/30 bg-blue-500/10 p-3">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-blue-400 mt-0.5" />
          <p className="text-[11px] leading-relaxed text-blue-200/90">
            Your funds will be credited automatically once{" "}
            {netInfo?.confirmations ?? "the required"} blockchain confirmations are reached.
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1 h-14 rounded-xl text-base shadow-none border-border"
            onClick={() => setStep("select")} disabled={createSession.isPending}>
            Back
          </Button>
          <Button className="flex-1 h-14 rounded-xl text-base shadow-none" onClick={handleConfirm} disabled={createSession.isPending}>
            {createSession.isPending
              ? <Loader2 className="w-5 h-5 animate-spin" />
              : <><span>Confirm Deposit</span> <ArrowRight className="w-4 h-4 ml-1.5" /></>}
          </Button>
        </div>
      </div>
    </Layout>
  );
}
