import { useState, useMemo } from "react";
import { Link } from "wouter";
import { 
  useAdminGetOverview, 
  useAdminBroadcast,
  getAdminGetOverviewQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Users, Bot, CircleDollarSign, LifeBuoy, Megaphone, Activity, CheckCircle, Clock } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const { data: overview, isLoading, error } = useAdminGetOverview();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  
  const broadcastMutation = useAdminBroadcast();

  const handleBroadcast = () => {
    broadcastMutation.mutate(
      { data: { title: broadcastTitle, message: broadcastMessage } },
      {
        onSuccess: () => {
          toast({ title: "Broadcast sent successfully" });
          setIsBroadcastOpen(false);
          setBroadcastTitle("");
          setBroadcastMessage("");
        },
        onError: (err) => {
          toast({ title: "Failed to send broadcast", description: err.message, variant: "destructive" });
        }
      }
    );
  };

  const chartData = useMemo(() => {
    if (!overview?.revenueSeries) return [];
    return overview.revenueSeries.map(point => ({
      date: format(new Date(point.date), "MMM dd"),
      value: point.value
    }));
  }, [overview?.revenueSeries]);

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto bg-background p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="space-y-2">
            <Skeleton className="h-10 w-[200px]" />
            <Skeleton className="h-4 w-[300px]" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full" />)}
          </div>
        </div>
      </div>
    );
  }

  if (error || !overview) {
    return <div className="p-8 text-destructive">Failed to load dashboard</div>;
  }

  return (
    <div className="flex-1 overflow-auto bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-2">Platform overview and pending operations.</p>
          </div>
          <Dialog open={isBroadcastOpen} onOpenChange={setIsBroadcastOpen}>
            <DialogTrigger asChild>
              <Button data-testid="btn-new-broadcast">
                <Megaphone className="w-4 h-4 mr-2" />
                Broadcast
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Send Platform Broadcast</DialogTitle>
                <DialogDescription>Send a message to all users.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Title</label>
                  <Input 
                    value={broadcastTitle} 
                    onChange={e => setBroadcastTitle(e.target.value)} 
                    placeholder="Announcement Title"
                    data-testid="input-broadcast-title"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Message</label>
                  <Textarea 
                    value={broadcastMessage} 
                    onChange={e => setBroadcastMessage(e.target.value)} 
                    placeholder="Type your message here..."
                    rows={4}
                    data-testid="input-broadcast-message"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsBroadcastOpen(false)}>Cancel</Button>
                <Button 
                  onClick={handleBroadcast} 
                  disabled={!broadcastTitle || !broadcastMessage || broadcastMutation.isPending}
                  data-testid="btn-send-broadcast"
                >
                  {broadcastMutation.isPending ? "Sending..." : "Send Broadcast"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-total-users">{overview.totalUsers.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-emerald-500 font-medium">+{overview.newUsersToday}</span> today
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Bots</CardTitle>
              <Bot className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-active-bots">{overview.activeBotInstances.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Across {overview.totalBots} bot types
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Net Revenue</CardTitle>
              <CircleDollarSign className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-net-revenue">${overview.netRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending Work</CardTitle>
              <Activity className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-pending-work">
                {overview.pendingDeposits + overview.pendingWithdrawals + overview.pendingKyc + overview.openTickets}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Overview</CardTitle>
            <CardDescription>Daily net revenue over the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                      formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: 'hsl(var(--primary))' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground border border-dashed border-border rounded-md">
                  No revenue data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Pending Queues */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Pending Queues</CardTitle>
              <CardDescription>Items requiring operator attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <Link href="/finance?status=pending">
                  <div className="p-4 rounded-lg border border-border bg-card hover:bg-secondary transition-colors cursor-pointer group">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">Pending Deposits</div>
                      {overview.pendingDeposits > 0 ? (
                        <Badge variant="destructive">{overview.pendingDeposits}</Badge>
                      ) : (
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                      )}
                    </div>
                  </div>
                </Link>
                <Link href="/finance?status=pending">
                  <div className="p-4 rounded-lg border border-border bg-card hover:bg-secondary transition-colors cursor-pointer group">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">Pending Withdrawals</div>
                      {overview.pendingWithdrawals > 0 ? (
                        <Badge variant="destructive">{overview.pendingWithdrawals}</Badge>
                      ) : (
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                      )}
                    </div>
                  </div>
                </Link>
                <Link href="/users?tab=kyc">
                  <div className="p-4 rounded-lg border border-border bg-card hover:bg-secondary transition-colors cursor-pointer group">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">Pending KYC</div>
                      {overview.pendingKyc > 0 ? (
                        <Badge variant="destructive">{overview.pendingKyc}</Badge>
                      ) : (
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                      )}
                    </div>
                  </div>
                </Link>
                <Link href="/support?status=open">
                  <div className="p-4 rounded-lg border border-border bg-card hover:bg-secondary transition-colors cursor-pointer group">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">Open Tickets</div>
                      {overview.openTickets > 0 ? (
                        <Badge variant="destructive">{overview.openTickets}</Badge>
                      ) : (
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                      )}
                    </div>
                  </div>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {overview.recentTransactions.length > 0 ? (
                  overview.recentTransactions.slice(0, 5).map(txn => (
                    <div key={txn.id} className="flex items-center justify-between text-sm border-b border-border pb-2 last:border-0 last:pb-0">
                      <div>
                        <div className="font-medium">{txn.userName}</div>
                        <div className="text-muted-foreground capitalize flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {txn.type.replace('_', ' ')} - {txn.status}
                        </div>
                      </div>
                      <div className={`font-medium ${txn.type === 'deposit' || txn.type === 'trade_profit' ? 'text-emerald-500' : ''}`}>
                        {txn.type === 'deposit' || txn.type === 'trade_profit' ? '+' : ''}
                        ${txn.amount.toFixed(2)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground text-center py-4">No recent activity</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
