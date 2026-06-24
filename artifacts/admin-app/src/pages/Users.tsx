import { useState } from "react";
import { Link } from "wouter";
import {
  useAdminListUsers,
  useAdminListKyc,
  useAdminReviewKyc,
  getAdminListKycQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Search, ChevronRight, CheckCircle, XCircle } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export default function Users() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const { data: users, isLoading: usersLoading } = useAdminListUsers({ search: debouncedSearch || undefined });
  const { data: kycItems, isLoading: kycLoading } = useAdminListKyc({ status: "pending" });

  const reviewKyc = useAdminReviewKyc();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setDebouncedSearch(search);
  };

  const handleKycReview = (userId: number, action: "approve" | "reject") => {
    reviewKyc.mutate(
      { userId, data: { action, reason: action === "reject" ? "Documents unclear" : undefined } },
      {
        onSuccess: () => {
          toast({ title: `KYC ${action}d` });
          queryClient.invalidateQueries({ queryKey: getAdminListKycQueryKey({ status: "pending" }) });
        },
        onError: (err) => {
          toast({ title: `Failed to ${action} KYC`, description: err.message, variant: "destructive" });
        }
      }
    );
  };

  return (
    <div className="p-4 space-y-4 pb-2">
      <div className="pt-1">
        <h1 className="text-xl font-bold tracking-tight">Users</h1>
        <p className="text-xs text-muted-foreground">Accounts & KYC management</p>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="w-full h-9">
          <TabsTrigger value="all" className="flex-1 text-xs">All Users</TabsTrigger>
          <TabsTrigger value="kyc" className="flex-1 text-xs">
            KYC Review
            {kycItems?.length ? <Badge variant="destructive" className="ml-1.5 text-[10px] h-4 px-1">{kycItems.length}</Badge> : null}
          </TabsTrigger>
        </TabsList>

        {/* All Users */}
        <TabsContent value="all" className="space-y-3 mt-3">
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              placeholder="Search name or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-9 text-sm rounded-xl"
              data-testid="input-search-users"
            />
            <Button type="submit" variant="secondary" size="sm" className="h-9 px-3 rounded-xl shrink-0" data-testid="btn-search-users">
              <Search className="w-4 h-4" />
            </Button>
          </form>

          <div className="space-y-2">
            {usersLoading ? (
              Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)
            ) : users?.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground border border-dashed border-border rounded-2xl">
                No users found
              </div>
            ) : (
              users?.map(user => (
                <Link key={user.id} href={`/users/${user.id}`}>
                  <Card className="rounded-2xl border-border/60 hover:border-primary/40 transition-colors cursor-pointer" data-testid={`row-user-${user.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/20 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-primary">
                            {user.fullName?.charAt(0)?.toUpperCase() || "?"}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm font-semibold truncate">{user.fullName}</span>
                            <Badge variant={user.status === "active" ? "default" : "destructive"} className="text-[10px] h-4 px-1.5 shrink-0">
                              {user.status}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[11px] text-emerald-400 font-medium">${user.balance.toFixed(2)}</span>
                            <span className="text-[11px] text-muted-foreground">{user.totalBots} bots</span>
                            <Badge variant={user.kycStatus === "verified" ? "default" : user.kycStatus === "pending" ? "secondary" : "outline"} className="text-[10px] h-4 px-1.5">
                              KYC: {user.kycStatus}
                            </Badge>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))
            )}
          </div>
        </TabsContent>

        {/* Pending KYC */}
        <TabsContent value="kyc" className="space-y-2 mt-3">
          {kycLoading ? (
            Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)
          ) : kycItems?.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground border border-dashed border-border rounded-2xl">
              No pending KYC submissions
            </div>
          ) : (
            kycItems?.map(item => (
              <Card key={item.userId} className="rounded-2xl border-border/60" data-testid={`row-kyc-${item.userId}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-500/20 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-amber-400">
                        {item.fullName?.charAt(0)?.toUpperCase() || "?"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{item.fullName}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{item.email}</p>
                      <div className="flex gap-1.5 mt-1.5">
                        {item.documentFrontUrl && <Badge variant="outline" className="text-[10px] h-4 px-1.5">ID Front</Badge>}
                        {item.selfieUrl && <Badge variant="outline" className="text-[10px] h-4 px-1.5">Selfie</Badge>}
                      </div>
                      {item.submittedAt && (
                        <p className="text-[10px] text-muted-foreground/60 mt-1">{format(new Date(item.submittedAt), "PP")}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-border/50">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10 rounded-xl"
                      onClick={() => handleKycReview(item.userId, "approve")}
                      disabled={reviewKyc.isPending}
                      data-testid={`btn-approve-kyc-${item.userId}`}
                    >
                      <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Approve
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8 text-destructive border-destructive/30 hover:bg-destructive/10 rounded-xl"
                      onClick={() => handleKycReview(item.userId, "reject")}
                      disabled={reviewKyc.isPending}
                      data-testid={`btn-reject-kyc-${item.userId}`}
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1.5" /> Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
