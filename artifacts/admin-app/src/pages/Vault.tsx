import { useState } from "react";
import { useAdminListVaultUsers } from "@workspace/api-client-react";
import { format } from "date-fns";
import {
  Search,
  Vault as VaultIcon,
  TrendingUp,
  Clock,
  AlertTriangle,
  ArrowUpCircle,
  Layers,
  BadgeDollarSign,
  Wallet,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const filterOptions = ["all", "active", "maturing", "invested", "not-invested"] as const;
type FilterOption = (typeof filterOptions)[number];

const filterLabels: Record<FilterOption, string> = {
  all: "All",
  active: "Active",
  maturing: "Maturing Soon",
  invested: "Ever Invested",
  "not-invested": "Not Invested",
};

function fmt(n: number) {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function Vault() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filter, setFilter] = useState<FilterOption>("all");

  const { data, isLoading } = useAdminListVaultUsers({
    search: debouncedSearch || undefined,
    filter,
  });

  const stats = data?.stats;
  const vaultUsers = data?.users;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setDebouncedSearch(search);
  };

  return (
    <div className="p-4 space-y-4 pb-2">
      <div className="pt-1">
        <h1 className="text-xl font-bold tracking-tight">Vault</h1>
        <p className="text-xs text-muted-foreground">Per-user investment status, yields & activity</p>
      </div>

      {/* ── Aggregate stats ── */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
        </div>
      ) : stats && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Card className="rounded-2xl border-border/60">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                  <VaultIcon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-base font-bold leading-none">{fmt(stats.totalLocked)}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">Total locked</p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/60">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0">
                  <BadgeDollarSign className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <p className="text-base font-bold leading-none">{fmt(stats.totalRewardsOwed)}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">Rewards owed</p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/60">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                </div>
                <div>
                  <p className="text-base font-bold leading-none">{fmt(stats.totalRewardsPaid)}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">Rewards paid out</p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/60">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-orange-500/15 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                </div>
                <div>
                  <p className="text-base font-bold leading-none">{stats.maturingSoonCount}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">Maturing in 7d</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tier breakdown */}
          {stats.tierBreakdown.length > 0 && (
            <Card className="rounded-2xl border-border/60">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <Layers className="w-4 h-4 text-muted-foreground" />
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tier Breakdown</p>
                </div>
                {stats.tierBreakdown.map((t) => (
                  <div key={t.dailyRate} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-amber-500">{t.dailyRate}%/day</span>
                      <span className="text-xs text-muted-foreground">{t.count} user{t.count !== 1 ? "s" : ""}</span>
                    </div>
                    <span className="font-medium">{fmt(t.totalLocked)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* ── Search & filters ── */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          placeholder="Search name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 text-sm rounded-xl"
          data-testid="input-search-vault"
        />
        <Button type="submit" variant="secondary" size="sm" className="h-9 px-3 rounded-xl shrink-0" data-testid="btn-search-vault">
          <Search className="w-4 h-4" />
        </Button>
      </form>

      <div className="flex items-center gap-2 flex-wrap">
        {filterOptions.map((opt) => (
          <button
            key={opt}
            onClick={() => setFilter(opt)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              filter === opt ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border"
            }`}
            data-testid={`filter-vault-${opt}`}
          >
            {filterLabels[opt]}
            {opt === "maturing" && stats && stats.maturingSoonCount > 0 && (
              <span className="ml-1 bg-orange-500 text-white rounded-full px-1 text-[10px]">{stats.maturingSoonCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── User list ── */}
      <div className="space-y-2">
        {isLoading ? (
          Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)
        ) : vaultUsers?.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground border border-dashed border-border rounded-2xl">
            No users found
          </div>
        ) : (
          vaultUsers?.map((u) => (
            <Card
              key={u.userId}
              className={`rounded-2xl border-border/60 ${u.active?.isMaturing ? "border-orange-500/40" : ""}`}
              data-testid={`row-vault-${u.userId}`}
            >
              <CardContent className="p-4">
                {/* header row */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{u.userName}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{u.userEmail}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {u.active ? (
                      <Badge variant="default" className="text-[10px] h-4 px-1.5">Active</Badge>
                    ) : u.invested ? (
                      <Badge variant="secondary" className="text-[10px] h-4 px-1.5">Not Active</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5">Never Invested</Badge>
                    )}
                    {u.active?.isMaturing && (
                      <Badge className="text-[10px] h-4 px-1.5 bg-orange-500 text-white border-0">
                        <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />
                        Matures in {u.active.maturesInDays}d
                      </Badge>
                    )}
                  </div>
                </div>

                {/* active investment detail */}
                {u.active && (
                  <div className="mb-2 p-2.5 rounded-xl bg-secondary/60 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">Locked amount</span>
                      <span className="font-semibold">{fmt(u.active.amount)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">Term / Rate</span>
                      <span className="font-semibold">{u.active.termDays}d · {u.active.dailyRate}%/day</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">Expected yield</span>
                      <span className="font-semibold text-emerald-500">+{fmt(u.active.rewardAmount)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground pt-0.5">
                      <Clock className="w-3 h-3" />
                      Matures {format(new Date(u.active.maturesAt), "PP")}
                    </div>

                    {/* top-up & tier upgrade row */}
                    {(u.active.topUpCount > 0 || u.active.tierUpgraded) && (
                      <div className="flex items-center gap-2 pt-1.5 border-t border-border/40 flex-wrap">
                        {u.active.topUpCount > 0 && (
                          <span className="flex items-center gap-1 text-[10px] font-medium text-blue-400">
                            <ArrowUpCircle className="w-3 h-3" />
                            {u.active.topUpCount} top-up{u.active.topUpCount !== 1 ? "s" : ""}
                          </span>
                        )}
                        {u.active.tierUpgraded && (
                          <span className="flex items-center gap-1 text-[10px] font-medium text-amber-400">
                            <TrendingUp className="w-3 h-3" />
                            Tier upgraded
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* footer stats */}
                <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[11px]">
                  <span className="text-muted-foreground">Total invested</span>
                  <span className="font-medium">{fmt(u.totalInvested)}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Total yield earned</span>
                  <span className="font-medium text-emerald-500">{fmt(u.totalRewardsEarned)}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Wallet className="w-3 h-3" /> Vault Wallet
                  </span>
                  <span className="font-medium">{fmt(u.vaultWalletBalance)}</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
