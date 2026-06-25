import { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useGetBot, useGetBotAnalytics } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronDown, TrendingUp, TrendingDown, Bot } from "lucide-react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, LabelList, Cell,
} from "recharts";

// ── Period options ─────────────────────────────────────────────────────────
const PERIODS = [
  { id: "daily",   label: "Daily" },
  { id: "weekly",  label: "Weekly" },
  { id: "monthly", label: "Monthly" },
  { id: "yearly",  label: "Yearly" },
];

// ── Period dropdown ────────────────────────────────────────────────────────
function PeriodDropdown({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = PERIODS.find(p => p.id === value) ?? PERIODS[0];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 bg-background border border-border/40 text-xs font-semibold px-3 py-1.5 rounded-lg text-foreground"
      >
        {selected.label}
        <ChevronDown className="w-3 h-3 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-32 bg-[#1a2235] border border-border/40 rounded-xl shadow-xl overflow-hidden">
          {PERIODS.map(p => (
            <button
              key={p.id}
              onClick={() => { onChange(p.id); setOpen(false); }}
              className={`w-full text-left px-4 py-2.5 text-xs transition-colors ${
                p.id === value
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "text-foreground hover:bg-card"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── X-axis two-line tick ───────────────────────────────────────────────────
function MultiLineTick({ x, y, payload }: any) {
  const lines = (payload.value as string).split("\n");
  return (
    <g transform={`translate(${x},${y})`}>
      {lines.map((line: string, i: number) => (
        <text key={i} x={0} y={0} dy={12 + i * 11} textAnchor="middle" fill="#64748b" fontSize={9}>
          {line}
        </text>
      ))}
    </g>
  );
}

// ── Bar profit label ───────────────────────────────────────────────────────
function BarLabel({ x, y, width, value }: any) {
  if (!value || Math.abs(value) < 1) return null;
  return (
    <text x={x + width / 2} y={y - 3} textAnchor="middle" fill="#e2e8f0" fontSize={7} fontWeight={600}>
      ${value}
    </text>
  );
}

export default function BotAnalytics() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const [, setLocation] = useLocation();
  const [period, setPeriod] = useState("daily");

  const { data: bot, isLoading: loadingBot } = useGetBot(id, { query: { enabled: !!id } as any });
  const { data: chartData = [], isLoading: loadingChart } = useGetBotAnalytics(id, period, {
    query: { enabled: !!id, refetchInterval: 60000 } as any,
  });

  const totalProfit = chartData.reduce((s, p) => s + p.profit, 0);
  const profitableDays = chartData.filter(p => p.profit > 0).length;
  const winRate = chartData.length > 0 ? Math.round((profitableDays / chartData.length) * 100) : 0;
  const maxProfit = Math.max(...chartData.map(p => p.profit), 0);
  const isPositive = totalProfit >= 0;

  if (!id) { setLocation("/bots"); return null; }

  return (
    <Layout>
      <div className="p-5 pb-10 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLocation(`/bots/${id}`)}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-card shrink-0"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            {loadingBot ? (
              <Skeleton className="h-6 w-40" />
            ) : (
              <>
                <h1 className="text-lg font-bold truncate">{bot?.name} — Analytics</h1>
                <div className={`text-[10px] px-2 py-0.5 mt-0.5 rounded-full inline-flex items-center ${
                  bot?.status === "running" ? "text-green-500 bg-green-500/10" : "text-muted-foreground bg-muted"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${bot?.status === "running" ? "bg-green-500" : "bg-muted-foreground"}`} />
                  {bot?.status === "running" ? "Running" : "Paused"}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card rounded-2xl p-4">
            <p className="text-[10px] text-muted-foreground mb-1">Period Profit</p>
            <p className={`text-xl font-bold ${isPositive ? "text-green-400" : "text-red-400"}`}>
              {isPositive ? "+" : ""}{totalProfit.toFixed(2)} USDT
            </p>
            <div className={`flex items-center gap-1 mt-1 ${isPositive ? "text-green-400" : "text-red-400"}`}>
              {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span className="text-[10px] font-medium">{isPositive ? "Profitable" : "Loss"} period</span>
            </div>
          </div>
          <div className="bg-card rounded-2xl p-4">
            <p className="text-[10px] text-muted-foreground mb-1">Win Rate</p>
            <p className="text-xl font-bold">{winRate}%</p>
            <p className="text-[10px] text-muted-foreground mt-1">{profitableDays}/{chartData.length} periods positive</p>
          </div>
          <div className="bg-card rounded-2xl p-4">
            <p className="text-[10px] text-muted-foreground mb-1">Best Period</p>
            <p className="text-xl font-bold text-green-400">+{maxProfit.toFixed(2)}</p>
            <p className="text-[10px] text-muted-foreground mt-1">USDT</p>
          </div>
          <div className="bg-card rounded-2xl p-4">
            <p className="text-[10px] text-muted-foreground mb-1">Total Trades</p>
            <p className="text-xl font-bold">{bot?.totalTrades ?? 0}</p>
            <div className="flex items-center gap-1 mt-1">
              <Bot className="w-3 h-3 text-primary" />
              <span className="text-[10px] text-muted-foreground">All time</span>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-card rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-bold">Performance Chart</span>
            <PeriodDropdown value={period} onChange={setPeriod} />
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mb-2">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-primary" />
              <span className="text-[10px] text-muted-foreground">Profit (USDT)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-[2px]" style={{ borderTop: "2px dashed #4ade80" }} />
              <span className="text-[10px] text-muted-foreground">Cumulative</span>
            </div>
          </div>

          <div className="h-[220px] -mx-2">
            {loadingChart ? (
              <Skeleton className="w-full h-full rounded-xl" />
            ) : chartData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                No data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 20, right: 4, left: -28, bottom: 28 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={<MultiLineTick />}
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    height={40}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#64748b", fontSize: 9 }}
                    tickFormatter={(v) => `$${v}`}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0f1729", borderColor: "#1e293b", borderRadius: "12px", fontSize: "11px" }}
                    labelStyle={{ color: "#94a3b8", marginBottom: "4px" }}
                    formatter={(value: number, name: string) => [
                      `$${value.toFixed(2)}`,
                      name === "profit" ? "Profit" : "Cumulative",
                    ]}
                  />
                  <Bar dataKey="profit" radius={[3, 3, 0, 0]} maxBarSize={24}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.profit >= 0 ? "#7C3AED" : "#ef4444"} />
                    ))}
                    <LabelList content={<BarLabel />} />
                  </Bar>
                  <Line
                    type="monotone"
                    dataKey="cumulative"
                    stroke="#4ade80"
                    strokeWidth={2}
                    dot={{ fill: "#4ade80", r: 3, strokeWidth: 0 }}
                    strokeDasharray="4 2"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Period summary table */}
        <div className="bg-card rounded-2xl p-4">
          <p className="text-sm font-bold mb-3">Period Breakdown</p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {loadingChart ? (
              Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-8 w-full rounded-lg" />)
            ) : (
              [...chartData].reverse().map((p, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/20 last:border-0">
                  <span className="text-xs text-muted-foreground">{p.label.replace("\n", " ")}</span>
                  <div className="text-right">
                    <span className={`text-xs font-bold ${p.profit >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {p.profit >= 0 ? "+" : ""}{p.profit.toFixed(2)} USDT
                    </span>
                    <span className="text-[10px] text-muted-foreground ml-2">
                      Cum: {p.cumulative >= 0 ? "+" : ""}{p.cumulative.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
