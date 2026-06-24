import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { useGetDepositSession, useSubmitDepositTxid } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import QRCode from "react-qr-code";
import {
  ChevronLeft, Copy, Check, Loader2, CheckCircle2, Clock, AlertTriangle,
  ExternalLink, RefreshCw, Send, Wallet, CircleDot, PartyPopper,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SiTether, SiBitcoin } from "react-icons/si";

const STATUS_ORDER = [
  "created",
  "waiting_payment",
  "payment_detected",
  "confirming",
  "completed",
];

function TimelineStep({
  label,
  done,
  active,
  detail,
}: {
  label: string;
  done: boolean;
  active: boolean;
  detail?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex flex-col items-center shrink-0">
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
            done
              ? "bg-emerald-500 text-white"
              : active
              ? "bg-primary text-white"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {done ? <CheckCircle2 className="w-4 h-4" /> : active ? <Clock className="w-3.5 h-3.5 animate-pulse" /> : <CircleDot className="w-3.5 h-3.5" />}
        </div>
        <div className="w-0.5 h-6 bg-border last-of-type:hidden" />
      </div>
      <div className="pb-4">
        <p className={`text-sm font-medium ${done ? "text-emerald-400" : active ? "text-foreground" : "text-muted-foreground"}`}>
          {label}
        </p>
        {detail && <p className="text-xs text-muted-foreground mt-0.5">{detail}</p>}
      </div>
    </div>
  );
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({ title: "Copy failed — please copy manually", variant: "destructive" });
    }
  };
  return (
    <button
      onClick={copy}
      className="shrink-0 w-9 h-9 flex items-center justify-center rounded-lg bg-card hover:bg-muted transition-colors"
      aria-label="Copy"
    >
      {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
    </button>
  );
}

function getMethodIcon(name: string) {
  if (name.includes("USDT") || name.includes("Tether")) return <SiTether className="w-5 h-5 text-[#26A17B]" />;
  if (name.includes("BTC") || name.includes("Bitcoin")) return <SiBitcoin className="w-5 h-5 text-[#F7931A]" />;
  return <Wallet className="w-5 h-5 text-primary" />;
}

export default function DepositStatus() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [showTxidForm, setShowTxidForm] = useState(false);
  const [txidInput, setTxidInput] = useState("");

  const {
    data: session,
    isLoading,
    refetch,
    isRefetching,
  } = useGetDepositSession(Number(id), {
    query: {
      refetchInterval: 5000,
      enabled: !!id,
    } as any,
  });

  const submitTxid = useSubmitDepositTxid();

  const handleSentPayment = () => setShowTxidForm(true);

  const handleSubmitTxid = () => {
    if (!txidInput.trim()) { toast({ title: "Enter your transaction ID", variant: "destructive" }); return; }
    submitTxid.mutate(
      { id: Number(id), data: { txid: txidInput.trim() } },
      {
        onSuccess: () => { toast({ title: "Transaction ID submitted", description: "We'll verify your payment shortly." }); setShowTxidForm(false); },
        onError: (err: any) => { toast({ title: "Failed to submit TXID", description: err.message, variant: "destructive" }); },
      }
    );
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!session) {
    return (
      <Layout>
        <div className="p-5 space-y-4 text-center pt-20">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto" />
          <p className="font-semibold">Deposit session not found</p>
          <Button onClick={() => setLocation("/cashier/deposit")} className="rounded-xl">New Deposit</Button>
        </div>
      </Layout>
    );
  }

  const { status, amount, paymentMethodName, network, depositAddress, txid, confirmations, requiredConfirmations } = session;

  // ── SUCCESS ─────────────────────────────────────────────────────────────────
  if (status === "completed") {
    return (
      <Layout>
        <div className="p-5 pb-10 flex flex-col items-center text-center gap-6 pt-10">
          <div className="w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <PartyPopper className="w-12 h-12 text-emerald-400" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">Deposit Successful!</h1>
            <p className="text-muted-foreground text-sm">Your funds have been credited to your account</p>
          </div>

          <div className="w-full rounded-2xl bg-card p-5 space-y-4 text-left">
            {[
              { label: "Deposited Amount", value: `$${amount.toFixed(2)}` },
              { label: "Asset",            value: paymentMethodName },
              { label: "Network",          value: network },
              ...(txid ? [{ label: "Transaction ID", value: txid.slice(0, 20) + "…" }] : []),
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between border-b border-border/40 pb-3 last:border-0 last:pb-0">
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className="text-sm font-semibold">{value}</span>
              </div>
            ))}
          </div>

          <div className="w-full grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-14 rounded-xl border-border" onClick={() => setLocation("/dashboard")}>
              Dashboard
            </Button>
            <Button className="h-14 rounded-xl" onClick={() => setLocation("/bots")}>
              Start Trading
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  // ── FAILED / EXPIRED / CANCELLED ────────────────────────────────────────────
  if (status === "failed" || status === "expired" || status === "cancelled") {
    return (
      <Layout>
        <div className="p-5 pb-10 flex flex-col items-center text-center gap-6 pt-10">
          <div className="w-24 h-24 rounded-full bg-destructive/20 flex items-center justify-center">
            <AlertTriangle className="w-12 h-12 text-destructive" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold capitalize">Deposit {status}</h1>
            <p className="text-muted-foreground text-sm">
              {status === "expired" ? "This deposit session has expired." : "Your deposit could not be processed."}
            </p>
          </div>
          <Button className="w-full h-14 rounded-xl" onClick={() => setLocation("/cashier/deposit")}>
            Try Again
          </Button>
        </div>
      </Layout>
    );
  }

  const isConfirming = status === "payment_detected" || status === "confirming";
  const isWaiting    = status === "waiting_payment" || status === "created";

  const timelineSteps = [
    { label: "Deposit Request Created",    done: true,                               active: false },
    { label: "Payment Detected",          done: isConfirming,                       active: isWaiting, detail: isWaiting ? "Waiting for your transfer" : undefined },
    { label: "Blockchain Confirmations",  done: false,                              active: isConfirming,
      detail: isConfirming ? `${confirmations} / ${requiredConfirmations} confirmations` : undefined },
    { label: "Funds Credited",            done: false,                              active: false },
  ];

  // ── ADDRESS / PENDING ────────────────────────────────────────────────────────
  return (
    <Layout>
      <div className="p-5 pb-8 space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={() => setLocation("/cashier")} className="w-10 h-10 flex items-center justify-center rounded-xl bg-card">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold tracking-tight">
            {isWaiting ? `Send ${paymentMethodName}` : "Waiting for Payment"}
          </h1>
        </div>

        {/* Summary row */}
        <div className="flex items-center gap-3 rounded-xl bg-card p-4">
          {getMethodIcon(paymentMethodName)}
          <div>
            <p className="text-xs text-muted-foreground">Deposit Amount</p>
            <p className="font-bold">${amount.toFixed(2)} · {network} Network</p>
          </div>
        </div>

        {/* QR + Address section (shown while waiting) */}
        {isWaiting && (
          <>
            <div className="rounded-2xl bg-card p-5 flex flex-col items-center gap-4">
              <p className="text-sm font-semibold self-start">Deposit Address</p>
              <div className="p-3 bg-white rounded-xl">
                <QRCode value={depositAddress} size={180} />
              </div>
              <p className="text-xs text-muted-foreground">Network: <span className="font-semibold text-foreground">{network}</span></p>
              <div className="w-full flex items-center gap-2 rounded-xl bg-background p-3">
                <code className="flex-1 break-all text-xs font-mono text-foreground leading-relaxed">
                  {depositAddress}
                </code>
                <CopyBtn text={depositAddress} />
              </div>
            </div>

            <div className="flex gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
              <p className="text-[11px] leading-relaxed text-amber-200/90">
                Send only <strong>{paymentMethodName}</strong> via the <strong>{network}</strong> network.
                Sending any other asset or network may result in permanent loss of funds.
              </p>
            </div>
          </>
        )}

        {/* Confirmations card (shown once payment detected) */}
        {isConfirming && (
          <div className="rounded-2xl bg-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Confirmations</p>
              <span className="text-sm font-bold text-primary">{confirmations} / {requiredConfirmations}</span>
            </div>
            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (confirmations / requiredConfirmations) * 100)}%` }}
              />
            </div>
            {txid && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Transaction ID</p>
                <div className="flex items-center gap-2 rounded-lg bg-background p-2">
                  <code className="flex-1 break-all text-[10px] font-mono leading-relaxed">{txid}</code>
                  <CopyBtn text={txid} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Timeline */}
        <div className="rounded-2xl bg-card p-5">
          <p className="text-sm font-semibold mb-4">Progress</p>
          {timelineSteps.map((s, i) => (
            <TimelineStep key={i} {...s} />
          ))}
        </div>

        {/* TXID form */}
        {showTxidForm && (
          <div className="rounded-2xl bg-card p-5 space-y-3">
            <p className="text-sm font-semibold">Submit Transaction ID</p>
            <p className="text-xs text-muted-foreground">
              Paste the transaction hash from your wallet or exchange to speed up verification.
            </p>
            <Input
              value={txidInput}
              onChange={(e) => setTxidInput(e.target.value)}
              placeholder="Transaction hash / TXID"
              className="bg-background border-none h-12 rounded-xl font-mono text-xs"
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 h-11 rounded-xl border-border text-sm" onClick={() => setShowTxidForm(false)}>
                Cancel
              </Button>
              <Button className="flex-1 h-11 rounded-xl text-sm" onClick={handleSubmitTxid} disabled={submitTxid.isPending}>
                {submitTxid.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-3.5 h-3.5 mr-1.5" />Submit</>}
              </Button>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 h-12 rounded-xl border-border text-sm"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            {isRefetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <><RefreshCw className="w-3.5 h-3.5 mr-1.5" />Refresh Status</>}
          </Button>
          {!showTxidForm && isWaiting && !txid && (
            <Button
              className="flex-1 h-12 rounded-xl text-sm"
              onClick={handleSentPayment}
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> I've Sent Payment
            </Button>
          )}
        </div>

        {isWaiting && (
          <p className="text-center text-[11px] text-muted-foreground">
            This page refreshes automatically. You can also close it and return later.
          </p>
        )}
      </div>
    </Layout>
  );
}
