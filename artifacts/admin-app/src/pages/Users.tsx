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
import { Search, Eye, CheckCircle, XCircle } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

  const handleKycReview = (userId: number, action: "approve" | "reject", reason?: string) => {
    reviewKyc.mutate(
      { userId, data: { action, reason } },
      {
        onSuccess: () => {
          toast({ title: `KYC ${action}d successfully` });
          queryClient.invalidateQueries({ queryKey: getAdminListKycQueryKey({ status: "pending" }) });
        },
        onError: (err) => {
          toast({ title: `Failed to ${action} KYC`, description: err.message, variant: "destructive" });
        }
      }
    );
  };

  return (
    <div className="flex-1 overflow-auto bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground mt-2">Manage customer accounts and KYC.</p>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <TabsTrigger value="all">All Users</TabsTrigger>
            <TabsTrigger value="kyc">Pending KYC {kycItems?.length ? <Badge variant="destructive" className="ml-2">{kycItems.length}</Badge> : null}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="space-y-4 mt-6">
            <Card>
              <CardContent className="p-4 flex gap-4">
                <form onSubmit={handleSearch} className="flex-1 flex gap-2">
                  <Input 
                    placeholder="Search by name or email..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="max-w-md"
                    data-testid="input-search-users"
                  />
                  <Button type="submit" variant="secondary" data-testid="btn-search-users">
                    <Search className="w-4 h-4 mr-2" />
                    Search
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="rounded-md border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>KYC</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="text-right">Bots</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersLoading ? (
                    Array(5).fill(0).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-4 w-[80px] ml-auto" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-4 w-[40px] ml-auto" /></TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    ))
                  ) : users?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No users found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    users?.map((user) => (
                      <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                        <TableCell>
                          <div className="font-medium">{user.fullName}</div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.status === "active" ? "default" : "destructive"}>
                            {user.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.kycStatus === "verified" ? "default" : user.kycStatus === "pending" ? "secondary" : "outline"}>
                            {user.kycStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${user.balance.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          {user.totalBots}
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/users/${user.id}`}>
                            <Button variant="ghost" size="sm" data-testid={`btn-view-user-${user.id}`}>
                              View <Eye className="ml-2 w-4 h-4" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
          
          <TabsContent value="kyc" className="space-y-4 mt-6">
             <div className="rounded-md border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Documents</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kycLoading ? (
                    Array(3).fill(0).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-8 w-[150px] ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : kycItems?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No pending KYC submissions.
                      </TableCell>
                    </TableRow>
                  ) : (
                    kycItems?.map((item) => (
                      <TableRow key={item.userId} data-testid={`row-kyc-${item.userId}`}>
                        <TableCell>
                          <div className="font-medium">{item.fullName}</div>
                          <div className="text-xs text-muted-foreground">{item.email}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {item.documentFrontUrl && <Badge variant="outline">ID Front</Badge>}
                            {item.selfieUrl && <Badge variant="outline">Selfie</Badge>}
                          </div>
                        </TableCell>
                        <TableCell>
                          {item.submittedAt ? format(new Date(item.submittedAt), "PP") : "N/A"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10"
                              onClick={() => handleKycReview(item.userId, "approve")}
                              disabled={reviewKyc.isPending}
                              data-testid={`btn-approve-kyc-${item.userId}`}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" /> Approve
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="text-destructive border-destructive/30 hover:bg-destructive/10"
                              onClick={() => handleKycReview(item.userId, "reject", "Documents unclear")}
                              disabled={reviewKyc.isPending}
                              data-testid={`btn-reject-kyc-${item.userId}`}
                            >
                              <XCircle className="w-4 h-4 mr-1" /> Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
