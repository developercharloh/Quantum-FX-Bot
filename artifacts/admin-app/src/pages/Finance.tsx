import { useState } from "react";
import {
  useAdminListTransactions,
  useAdminReviewTransaction,
  getAdminListTransactionsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { CheckCircle, XCircle, Clock, ChevronDown } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

const typeOptions = ["all", "deposit", "withdrawal"] as const;
const statusOptions = ["all", "pending", "completed", "rejected"] as const;

function FilterChip({ value, active, onClick }: { value: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors capitalize ${
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-card text-muted-foreground border-border"
      }`}
    >
      {value}
    </button>
  );
}

export default function Finance() {
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const { data: transactions, isLoading } = useAdminListTransactions({
    type: filterType !== "all" ? filterType : undefined,
    status: filterStatus !== "all" ? filterStatus : undefined
  });

  const reviewTxn = useAdminReviewTransaction();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleReview = (id: number, action: "approve" | "reject") => {
    reviewTxn.mutate(
      { id, data: { action } },
      {
        onSuccess: () => {
          toast({ title: `Transaction ${action}d` });
          queryClient.invalidateQueries({ queryKey: getAdminListTransactionsQueryKey() });
        },
        onError: (err) => {
          toast({ title: `Failed to ${action}`, description: err.message, variant: "destructive" });
        }
      }
    );
  };

  return (
    <div className="p-4 space-y-4 pb-2">
      <div className="pt-1">
        <h1 className="text-xl font-bold tracking-tight">Wallet</h1>
        <p className="text-xs text-muted-foreground">Money movement & ledger</p>
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground w-12">Type</span>
          {typeOptions.map(opt => (
            <FilterChip key={opt} value={opt} active={filterType === opt} onClick={() => setFilterType(opt)} />
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground w-12">Status</span>
          {statusOptions.map(opt => (
            <FilterChip key={opt} value={opt} active={filterStatus === opt} onClick={() => setFilterStatus(opt)} />
          ))}
        </div>
      </div>

      {/* Transaction Cards */}
      <div className="space-y-2">
        {isLoading ? (
          Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)
        ) : transactions?.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground border border-dashed border-border rounded-2xl">
            No transactions found
          </div>
        ) : (
          transactions?.map(txn => (
            <Card key={txn.id} className="rounded-2xl border-border/60" data-testid={`row-txn-${txn.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        variant={txn.status === 'completed' ? 'default' : txn.status === 'pending' ? 'secondary' : 'destructive'}
                        className="text-[10px] h-4 px-1.5 capitalize"
                      >
                        {txn.status === 'pending' && <Clock className="w-2.5 h-2.5 mr-1 inline" />}
                        {txn.status}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground capitalize">{txn.type.replace('_', ' ')}</span>
                    </div>
                    <p className="text-sm font-semibold truncate">{txn.userName}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{txn.userEmail}</p>
                    {txn.paymentMethod && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">{txn.paymentMethod}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">{format(new Date(txn.createdAt), "PP · p")}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-lg font-bold ${txn.type === 'deposit' || txn.type === 'trade_profit' ? 'text-emerald-400' : 'text-foreground'}`}>
                      {txn.type === 'deposit' || txn.type === 'trade_profit' ? '+' : ''}${txn.amount.toFixed(2)}
                    </div>
                  </div>
                </div>

                {txn.status === 'pending' && (txn.type === 'deposit' || txn.type === 'withdrawal') && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-border/50">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10 rounded-xl"
                      onClick={() => handleReview(txn.id, "approve")}
                      disabled={reviewTxn.isPending}
                      data-testid={`btn-approve-txn-${txn.id}`}
                    >
                      <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Approve
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8 text-destructive border-destructive/30 hover:bg-destructive/10 rounded-xl"
                      onClick={() => handleReview(txn.id, "reject")}
                      disabled={reviewTxn.isPending}
                      data-testid={`btn-reject-txn-${txn.id}`}
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1.5" /> Reject
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
