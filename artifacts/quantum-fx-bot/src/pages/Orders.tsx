import { useLocation } from "wouter";
import { useListTradePositions } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft, CheckCircle2, Clock, Zap,
  ArrowUpRight, ArrowDownRight, Activity,
} from "lucide-react";

function fmtDuration(ms: number): string {
  const sec = Math.floor(ms / 1000);
  const m   = Math.floor(sec / 60);
  const s   = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

const isBuy = (d: string) => d.toUpperCase() === "BUY";

export default function Orders() {
  const [, setLocation] = useLocation();

  const { data: positions = [], isLoading } = useListTradePositions({
    query: { refetchInterval: 4000 } as any,
  });

  const open   = positions.filter(p => p.status === "open");
  const closed = positions.filter(p => p.status !== "open");

  return (
    <Layout showNav>
      <div className="flex flex-col min-h-[100dvh]">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-6 pb-4 shrink-0">
          <button
            onClick={() => setLocation("/dashboard")}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-card"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold tracking-tight">Active Trades</h1>
            <p className="text-[11px] text-muted-foreground">Live positions &amp; trade history</p>
          </div>
          {open.length > 0 && (
            <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-full">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[10px] text-green-400 font-bold tracking-wider">{open.length} LIVE</span>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-28 space-y-6">

          {/* ── Running positions ── */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold">Running</h2>
              <span className="text-[10px] text-muted-foreground bg-card rounded-full px-2 py-0.5">{open.length}</span>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2].map(i => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}
              </div>
            ) : open.length === 0 ? (
              <div className="bg-card rounded-2xl p-6 text-center">
                <Clock className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No running trades</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Go to the Trade tab to start one.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {open.map(p => {
                  const buy    = isBuy(p.direction);
                  const pnlPos = p.pnl >= 0;
                  return (
                    <div
                      key={p.id}
                      className={`rounded-2xl p-4 border ${buy ? "bg-green-500/5 border-green-500/15" : "bg-red-500/5 border-red-500/15"}`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${buy ? "bg-green-500/15 text-green-500" : "bg-red-500/15 text-red-500"}`}>
                            {buy ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                          </div>
                          <div>
                            <p className="font-bold text-sm">{p.pair}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge className={`text-[10px] border-none px-1.5 h-4 ${buy ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>
                                {p.direction}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground">{p.botName}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-base font-bold ${pnlPos ? "text-green-400" : "text-red-400"}`}>
                            {pnlPos ? "+" : "−"}${Math.abs(p.pnl).toFixed(2)}
                          </p>
                          <div className="flex items-center gap-1 justify-end mt-0.5">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                            <span className="text-[10px] text-green-400 font-semibold">RUNNING</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-2 border-t border-border/20">
                        <span>Stake ${p.stake.toFixed(0)}</span>
                        <span>{p.market}</span>
                        <span className="text-primary font-semibold">
                          ROI {p.stake > 0 ? ((p.pnl / p.stake) * 100).toFixed(1) : "0.0"}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ── Closed positions ── */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <h2 className="text-sm font-bold">Closed — Profit</h2>
              <span className="text-[10px] text-muted-foreground bg-card rounded-full px-2 py-0.5">{closed.length}</span>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
              </div>
            ) : closed.length === 0 ? (
              <div className="bg-card rounded-2xl p-6 text-center">
                <Zap className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No closed trades yet</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {closed.map(p => {
                  const buy  = isBuy(p.direction);
                  const roi  = p.stake > 0 ? (p.pnl / p.stake) * 100 : 0;
                  const label =
                    p.status === "tp_hit"       ? "TP Hit"     :
                    p.status === "closed_manual" ? "Cashed Out" :
                    p.status === "closed_expired"? "Expired"    : "Closed";
                  return (
                    <div key={p.id} className="bg-card rounded-2xl p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-green-500/15 text-green-500 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-4.5 h-4.5" />
                          </div>
                          <div>
                            <p className="font-bold text-sm">{p.pair}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Badge className={`text-[10px] border-none px-1.5 h-4 ${buy ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>
                                {p.direction}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground">{p.botName}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-base font-bold text-green-400">+${Math.abs(p.pnl).toFixed(2)}</p>
                          <p className="text-[10px] text-muted-foreground">{label}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-2 border-t border-border/30">
                        <span>Stake ${p.stake.toFixed(0)}</span>
                        <span>{p.elapsedMs > 0 ? fmtDuration(p.elapsedMs) : "—"}</span>
                        <span className="font-semibold text-green-400">{roi.toFixed(1)}% ROI</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

        </div>
      </div>
    </Layout>
  );
}
