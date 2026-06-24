import { useState, useEffect, useRef } from "react";
import {
  useListTradeSignals,
  useListMarketplaceBots,
  usePurchaseBot,
  useExecuteTrade,
  useListTradePositions,
  useCloseTradePosition,
  TradeSignal,
  MarketplaceBot,
  TradePosition,
} from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Zap,
  Bell,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  CheckCircle2,
  XCircle,
  Lock,
  Activity,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

type Stage = "signals" | "select-bot" | "params";

function formatElapsed(ms: number) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

const isBuy = (d: string) => d.toUpperCase() === "BUY";

export default function Trade() {
  const { data: signals, isLoading: loadingSignals } = useListTradeSignals();
  const { data: marketplaceBots, isLoading: loadingBots } = useListMarketplaceBots();
  const { data: positions } = useListTradePositions({ query: { refetchInterval: 4000 } as any });
  const purchaseMutation = usePurchaseBot();
  const executeMutation = useExecuteTrade();
  const closeMutation = useCloseTradePosition();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [stage, setStage] = useState<Stage>("signals");
  const [selectedSignal, setSelectedSignal] = useState<TradeSignal | null>(null);
  const [selectedBot, setSelectedBot] = useState<MarketplaceBot | null>(null);
  const [targetProfit, setTargetProfit] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [stake, setStake] = useState("");
  const [resolved, setResolved] = useState<TradePosition | null>(null);

  // Detect positions that just resolved (open -> tp/sl/manual) to show a popup
  const prevStatus = useRef<Map<number, string>>(new Map());
  useEffect(() => {
    if (!positions) return;
    let justResolved: TradePosition | null = null;
    for (const p of positions) {
      const prev = prevStatus.current.get(p.id);
      if (prev === "open" && p.status !== "open") {
        if (p.status === "tp_hit" || p.status === "sl_hit") justResolved = p;
      }
      prevStatus.current.set(p.id, p.status);
    }
    if (justResolved) {
      setResolved(justResolved);
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cashier/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bots"] });
    }
  }, [positions, queryClient]);

  const dialogOpen = stage !== "signals";

  const closeAll = () => {
    setStage("signals");
    setSelectedSignal(null);
    setSelectedBot(null);
  };

  const openSignal = (signal: TradeSignal) => {
    setSelectedSignal(signal);
    setSelectedBot(null);
    setStage("select-bot");
  };

  const handlePurchase = (id: number) => {
    purchaseMutation.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "AI bot purchased — ready to trade" });
          queryClient.invalidateQueries({ queryKey: ["/api/marketplace-bots"] });
          queryClient.invalidateQueries({ queryKey: ["/api/bots"] });
        },
        onError: (err: any) => {
          toast({ title: "Purchase failed", description: err.message, variant: "destructive" });
        },
      }
    );
  };

  const startTrade = (bot: MarketplaceBot) => {
    if (!selectedSignal) return;
    setSelectedBot(bot);
    setTargetProfit(String(selectedSignal.suggestedTp));
    setStopLoss(String(selectedSignal.suggestedSl));
    setStake("");
    setStage("params");
  };

  const executeTrade = () => {
    if (!selectedSignal || !selectedBot) return;
    const tp = parseFloat(targetProfit);
    const sl = parseFloat(stopLoss);
    const st = parseFloat(stake);
    if (!(tp > 0) || !(sl > 0) || !(st > 0)) {
      toast({ title: "Enter valid amounts", description: "Target profit, stop loss and stake must be greater than 0.", variant: "destructive" });
      return;
    }

    executeMutation.mutate(
      { data: { signalId: selectedSignal.id, botId: selectedBot.id, targetProfit: tp, stopLoss: sl, stake: st } },
      {
        onSuccess: (pos) => {
          prevStatus.current.set(pos.id, "open");
          toast({ title: "Position opened", description: `${pos.pair} ${pos.direction} is now running.` });
          queryClient.invalidateQueries({ queryKey: ["/api/trade/positions"] });
          closeAll();
        },
        onError: (err: any) => {
          toast({ title: "Trade could not be opened", description: err.message, variant: "destructive" });
        },
      }
    );
  };

  const closePosition = (id: number) => {
    closeMutation.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Position closed" });
          queryClient.invalidateQueries({ queryKey: ["/api/trade/positions"] });
          queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
          queryClient.invalidateQueries({ queryKey: ["/api/cashier/transactions"] });
        },
        onError: (err: any) => {
          toast({ title: "Could not close", description: err.message, variant: "destructive" });
        },
      }
    );
  };

  const open = (positions || []).filter((p) => p.status === "open");
  const history = (positions || []).filter((p) => p.status !== "open").slice(0, 8);

  return (
    <Layout showNav>
      <div className="p-5 pb-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="w-10 h-10 bg-card rounded-xl flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white fill-white" />
            </div>
            <span className="font-semibold tracking-tight text-sm">Quantum FX Bot</span>
          </div>
          <button className="w-10 h-10 bg-card rounded-xl flex items-center justify-center relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-primary rounded-full border-2 border-card" />
          </button>
        </div>

        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Trading Signals</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tap a live signal, pick a bot, and set your trade. Positions run live until they hit target profit.
          </p>
        </div>

        {/* Open positions journal */}
        {open.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              <h2 className="font-semibold text-sm">Running trades</h2>
              <span className="text-[10px] text-muted-foreground bg-card rounded-full px-2 py-0.5">{open.length} open</span>
            </div>
            {open.map((p) => {
              const buy = isBuy(p.direction);
              const up = p.pnl >= 0;
              const pct = Math.max(0, Math.min(100, ((p.pnl + p.stopLoss) / (p.targetProfit + p.stopLoss)) * 100));
              return (
                <Card key={p.id} className="bg-card border-none rounded-2xl shadow-none">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${buy ? "bg-green-500/15 text-green-500" : "bg-red-500/15 text-red-500"}`}>
                          {buy ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm">{p.pair}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={`text-[10px] border-none px-2 py-0 h-5 ${buy ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>
                              {p.direction}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">{p.botName}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-muted-foreground mb-0.5">Live P&amp;L</div>
                        <div className={`text-base font-bold tabular-nums ${up ? "text-green-500" : "text-red-500"}`}>
                          {up ? "+" : "-"}${Math.abs(p.pnl).toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {/* TP / SL progress bar */}
                    <div className="relative h-1.5 w-full rounded-full bg-background overflow-hidden mb-2">
                      <div className={`h-full rounded-full ${up ? "bg-green-500" : "bg-red-500"}`} style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-3">
                      <span className="text-red-500">SL -${p.stopLoss.toFixed(0)}</span>
                      <span>Running {formatElapsed(p.elapsedMs)}</span>
                      <span className="text-green-500">TP +${p.targetProfit.toFixed(0)}</span>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-9 rounded-lg text-xs"
                      disabled={closeMutation.isPending}
                      onClick={() => closePosition(p.id)}
                    >
                      Close at {up ? "+" : "-"}${Math.abs(p.pnl).toFixed(2)}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Signals list */}
        <div className="space-y-3">
          <h2 className="font-semibold text-sm">Live signals</h2>
          {loadingSignals ? (
            Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)
          ) : (signals || []).length > 0 ? (
            signals?.map((signal: TradeSignal) => {
              const buy = isBuy(signal.direction);
              return (
                <Card
                  key={signal.id}
                  className="bg-card border-none rounded-2xl shadow-none cursor-pointer active:scale-[0.99] transition-transform"
                  onClick={() => openSignal(signal)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${buy ? "bg-green-500/15 text-green-500" : "bg-red-500/15 text-red-500"}`}>
                          {buy ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm">{signal.pair}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={`text-[10px] border-none px-2 py-0 h-5 ${buy ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>
                              {signal.direction}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">{signal.market} · {signal.timeframe}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-muted-foreground mb-1">Confidence</div>
                        <div className={`text-sm font-bold ${signal.confidence >= 85 ? "text-green-500" : "text-foreground"}`}>{signal.confidence}%</div>
                      </div>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-background overflow-hidden">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${signal.confidence}%` }} />
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <div className="text-center py-12 text-muted-foreground bg-card rounded-2xl text-sm">
              No signals available right now.
            </div>
          )}
        </div>

        {/* History */}
        {history.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-semibold text-sm">Trade journal</h2>
            <div className="bg-card rounded-2xl divide-y divide-background">
              {history.map((p) => {
                const win = p.pnl >= 0;
                return (
                  <div key={p.id} className="flex items-center justify-between p-3.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${win ? "bg-green-500/15 text-green-500" : "bg-red-500/15 text-red-500"}`}>
                        {win ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{p.pair} {p.direction}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {p.status === "tp_hit" ? "Take profit hit" : p.status === "sl_hit" ? "Stop loss hit" : p.status === "closed_expired" ? "Auto-closed (24h)" : "Closed manually"}
                        </div>
                      </div>
                    </div>
                    <div className={`text-sm font-bold tabular-nums shrink-0 ${win ? "text-green-500" : "text-red-500"}`}>
                      {win ? "+" : "-"}${Math.abs(p.pnl).toFixed(2)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Flow dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) closeAll(); }}>
        <DialogContent className="max-w-[400px] rounded-2xl">
          {/* Select bot */}
          {stage === "select-bot" && selectedSignal && (
            <>
              <DialogHeader>
                <DialogTitle>Select a bot</DialogTitle>
                <DialogDescription>
                  Choose an AI bot to execute the {selectedSignal.pair} {selectedSignal.direction} signal.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 max-h-[60vh] overflow-y-auto -mx-1 px-1">
                {loadingBots ? (
                  Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)
                ) : (
                  marketplaceBots?.map((bot: MarketplaceBot) => (
                    <div key={bot.id} className="bg-background rounded-xl p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold bg-gradient-to-br from-purple-400 to-pink-500 shrink-0">
                          {bot.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-sm truncate">{bot.name}</h4>
                          <div className="text-[10px] text-muted-foreground">
                            Win {bot.winRate}% · {bot.riskLevel} risk
                          </div>
                        </div>
                      </div>
                      {bot.isPurchased ? (
                        <Button size="sm" className="h-9 rounded-lg shrink-0" onClick={() => startTrade(bot)}>
                          Trade
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9 rounded-lg shrink-0 text-xs"
                          disabled={purchaseMutation.isPending}
                          onClick={() => handlePurchase(bot.id)}
                        >
                          <Lock className="w-3 h-3 mr-1" />
                          {purchaseMutation.isPending ? "..." : "Purchase AI bot"}
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {/* Params */}
          {stage === "params" && selectedSignal && selectedBot && (
            <>
              <DialogHeader>
                <DialogTitle>Set up your trade</DialogTitle>
                <DialogDescription>
                  {selectedBot.name} on {selectedSignal.pair} {selectedSignal.direction}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tp">Target Profit ($)</Label>
                  <Input id="tp" type="number" inputMode="decimal" value={targetProfit} onChange={(e) => setTargetProfit(e.target.value)} className="h-12 rounded-xl" placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sl">Stop Loss ($)</Label>
                  <Input id="sl" type="number" inputMode="decimal" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} className="h-12 rounded-xl" placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stake">Stake ($)</Label>
                  <Input id="stake" type="number" inputMode="decimal" value={stake} onChange={(e) => setStake(e.target.value)} className="h-12 rounded-xl" placeholder="0.00" />
                </div>
                <Button className="w-full h-12 rounded-xl font-medium" disabled={executeMutation.isPending} onClick={executeTrade}>
                  {executeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Open Trade"}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Resolution popup */}
      <Dialog open={!!resolved} onOpenChange={(o) => { if (!o) setResolved(null); }}>
        <DialogContent className="max-w-[360px] rounded-2xl">
          {resolved && (
            <div className="py-6 flex flex-col items-center text-center gap-4">
              {resolved.status === "tp_hit" ? (
                <>
                  <div className="w-20 h-20 rounded-full bg-green-500/15 flex items-center justify-center">
                    <CheckCircle2 className="w-12 h-12 text-green-500" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-green-500">TP Hit! 🎉</h3>
                    <p className="text-sm text-muted-foreground mt-1">Take profit reached on {resolved.pair} {resolved.direction}</p>
                  </div>
                  <div className="text-3xl font-bold text-green-500">+${Math.abs(resolved.pnl).toFixed(2)}</div>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 rounded-full bg-red-500/15 flex items-center justify-center">
                    <XCircle className="w-12 h-12 text-red-500" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-red-500">Stop Loss Hit</h3>
                    <p className="text-sm text-muted-foreground mt-1">Stop loss triggered on {resolved.pair} {resolved.direction}</p>
                  </div>
                  <div className="text-3xl font-bold text-red-500">-${Math.abs(resolved.pnl).toFixed(2)}</div>
                </>
              )}
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                {resolved.status === "tp_hit" ? <TrendingUp className="w-3.5 h-3.5 text-green-500" /> : <TrendingDown className="w-3.5 h-3.5 text-red-500" />}
                Executed by {resolved.botName}
              </div>
              <Button className="w-full h-12 rounded-xl font-medium" onClick={() => setResolved(null)}>
                Done
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
