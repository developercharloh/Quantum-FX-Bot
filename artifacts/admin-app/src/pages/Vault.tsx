import { useState } from "react";
import { useAdminListVaultUsers } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Search, Vault as VaultIcon, TrendingUp, Clock } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const filterOptions = ["all", "active", "invested", "not-invested"] as const;
type FilterOption = (typeof filterOptions)[number];

const filterLabels: Record<FilterOption, string> = {
  all: "All",
  active: "Active",
  invested: "Invested",
  "not-invested": "Not Invested",
};

function statusColor(status: string) {
  if (status === "active") return "default";
  if (status === "redeemed") return "secondary";
  return "outline";
}

export default function Vault() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filter, setFilter] = useState<FilterOption>("all");

  const { data: vaultUsers, isLoading } = useAdminListVaultUsers({
    search: debouncedSearch || undefined,
    filter,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setDebouncedSearch(search);
  };

  const investedCount = vaultUsers?.filter((u) => u.invested).length ?? 0;
  const activeCount = vaultUsers?.filter((u) => u.active !== null).length ?? 0;

  return (
    <div className="p-4 space-y-4 pb-2">
      <div className="pt-1">
        <h1 className="text-xl font-bold tracking-tight">Vault</h1>
        <p className="text-xs text-muted-foreground">Per-user investment status & yields</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="rounded-2xl border-border/60">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
              <VaultIcon className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-lg font-bold leading-none">{investedCount}</p>
              <p className="text-[11px] text-muted-foreground mt-1">Ever invested</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/60">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <div>
              <p className="text-lg font-bold leading-none">{activeCount}</p>
              <p className="text-[11px] text-muted-foreground mt-1">Active now</p>
            </div>
          </CardContent>
        </Card>
      </div>

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
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {isLoading ? (
          Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)
        ) : vaultUsers?.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground border border-dashed border-border rounded-2xl">
            No users found
          </div>
        ) : (
          vaultUsers?.map((u) => (
            <Card key={u.userId} className="rounded-2xl border-border/60" data-testid={`row-vault-${u.userId}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{u.userName}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{u.userEmail}</p>
                  </div>
                  {u.active ? (
                    <Badge variant={statusColor(u.active.status)} className="text-[10px] h-4 px-1.5 shrink-0">
                      Active
                    </Badge>
                  ) : u.invested ? (
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5 shrink-0">
                      Not Invested
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5 shrink-0">
                      Never Invested
                    </Badge>
                  )}
                </div>

                {u.active && (
                  <div className="mb-2 p-2.5 rounded-xl bg-secondary/60 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">Locked amount</span>
                      <span className="font-semibold">${u.active.amount.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">Term / Rate</span>
                      <span className="font-semibold">{u.active.termDays}d · {u.active.dailyRate}%/day</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">Expected yield</span>
                      <span className="font-semibold text-emerald-500">+${u.active.rewardAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground pt-0.5">
                      <Clock className="w-3 h-3" />
                      Matures {format(new Date(u.active.maturesAt), "PP")}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[11px]">
                  <span className="text-muted-foreground">Total invested</span>
                  <span className="font-medium">${u.totalInvested.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Total yield earned</span>
                  <span className="font-medium text-emerald-500">${u.totalRewardsEarned.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
