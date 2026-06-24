import { useState } from "react";
import { 
  useAdminListTransactions, 
  useAdminReviewTransaction,
  getAdminListTransactionsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { CheckCircle, XCircle, Clock } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

export default function Finance() {
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  
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
          toast({ title: `Transaction ${action}d successfully` });
          queryClient.invalidateQueries({ queryKey: getAdminListTransactionsQueryKey() });
        },
        onError: (err) => {
          toast({ title: `Failed to ${action} transaction`, description: err.message, variant: "destructive" });
        }
      }
    );
  };

  return (
    <div className="flex-1 overflow-auto bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Finance</h1>
          <p className="text-muted-foreground mt-2">Money movement and ledger.</p>
        </div>

        <Card>
          <CardContent className="p-4 flex flex-wrap gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Type</label>
              <Tabs value={filterType} onValueChange={setFilterType} className="w-full">
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="deposit">Deposits</TabsTrigger>
                  <TabsTrigger value="withdrawal">Withdrawals</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <Tabs value={filterStatus} onValueChange={setFilterStatus} className="w-full">
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="pending">Pending</TabsTrigger>
                  <TabsTrigger value="completed">Completed</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardContent>
        </Card>

        <div className="rounded-md border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-[60px] ml-auto" /></TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                ))
              ) : transactions?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No transactions found.
                  </TableCell>
                </TableRow>
              ) : (
                transactions?.map((txn) => (
                  <TableRow key={txn.id} data-testid={`row-txn-${txn.id}`}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {format(new Date(txn.createdAt), "PP p")}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{txn.userName}</div>
                      <div className="text-xs text-muted-foreground">{txn.userEmail}</div>
                    </TableCell>
                    <TableCell className="capitalize">{txn.type.replace('_', ' ')}</TableCell>
                    <TableCell>
                      {txn.paymentMethod || '-'}
                      {txn.walletAddress && <div className="text-[10px] text-muted-foreground font-mono truncate max-w-[100px]" title={txn.walletAddress}>{txn.walletAddress}</div>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={txn.status === 'completed' ? 'default' : txn.status === 'pending' ? 'secondary' : 'destructive'}>
                        {txn.status === 'pending' && <Clock className="w-3 h-3 mr-1 inline" />}
                        {txn.status}
                      </Badge>
                    </TableCell>
                    <TableCell className={`text-right font-medium ${txn.type === 'deposit' || txn.type === 'trade_profit' ? 'text-emerald-500' : ''}`}>
                      {txn.type === 'deposit' || txn.type === 'trade_profit' ? '+' : ''}
                      ${txn.amount.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      {txn.status === 'pending' && (txn.type === 'deposit' || txn.type === 'withdrawal') && (
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10 h-7 px-2"
                            onClick={() => handleReview(txn.id, "approve")}
                            disabled={reviewTxn.isPending}
                            data-testid={`btn-approve-txn-${txn.id}`}
                          >
                            <CheckCircle className="w-3 h-3 mr-1" /> Approve
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-destructive border-destructive/30 hover:bg-destructive/10 h-7 px-2"
                            onClick={() => handleReview(txn.id, "reject")}
                            disabled={reviewTxn.isPending}
                            data-testid={`btn-reject-txn-${txn.id}`}
                          >
                            <XCircle className="w-3 h-3 mr-1" /> Reject
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
