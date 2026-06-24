import { Layout } from "@/components/Layout";
import { useGetDashboardSummary, useGetEarningsChart, useGetRecentActivity, useListBots } from "@workspace/api-client-react";
import { Bell, ArrowUpRight, ArrowDownRight, Wallet, Activity, Zap, ChevronRight, Menu, Eye, User, LifeBuoy, LogOut } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "wouter";
import { formatUSD } from "@/lib/format";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";

export default function Dashboard() {
  const [period, setPeriod] = useState<"7D" | "30D" | "90D">("7D");
  const { user, logout } = useAuth();
  
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary();
  const { data: chartData, isLoading: loadingChart } = useGetEarningsChart({ period });
  const { data: recentActivity, isLoading: loadingActivity } = useGetRecentActivity();
  const { data: botsData, isLoading: loadingBots } = useListBots();

  const activeBots = botsData?.filter(bot => bot.status === 'running') || [];

  return (
    <Layout showNav>
      <div className="p-5 space-y-7 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Sheet>
            <SheetTrigger asChild>
              <button className="w-10 h-10 bg-card rounded-xl flex items-center justify-center">
                <Menu className="w-5 h-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] bg-background border-border p-0">
              <SheetHeader className="p-5 border-b border-border text-left">
                <SheetTitle className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-primary to-purple-400 flex items-center justify-center text-base font-bold text-white">
                    {user?.fullName?.charAt(0) || "U"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{user?.fullName || "User"}</p>
                    <p className="text-xs text-muted-foreground font-normal truncate">{user?.email || ""}</p>
                  </div>
                </SheetTitle>
              </SheetHeader>
              <nav className="p-3 flex flex-col gap-1">
                <SheetClose asChild>
                  <Link href="/profile" className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-card transition-colors">
                    <User className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm font-medium">Profile</span>
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link href="/support" className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-card transition-colors">
                    <LifeBuoy className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm font-medium">Support</span>
                  </Link>
                </SheetClose>
                <button
                  onClick={() => logout()}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-card transition-colors text-left"
                >
                  <LogOut className="w-5 h-5 text-red-500" />
                  <span className="text-sm font-medium text-red-500">Sign Out</span>
                </button>
              </nav>
            </SheetContent>
          </Sheet>
          
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

        {/* Welcome section */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-primary to-purple-400 flex items-center justify-center text-lg font-bold">
            {user?.fullName?.charAt(0) || "U"}
          </div>
          <div>
            <h1 className="text-xl font-bold">Welcome back, {user?.fullName?.split(" ")[0] || "User"}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Here's your trading overview for today.</p>
          </div>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-card border-none rounded-2xl shadow-none">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center">
                  <Eye className="w-4 h-4 text-muted-foreground" />
                </div>
                <Wallet className="w-5 h-5 text-muted-foreground opacity-50" />
              </div>
              
              <div className="space-y-1">
                {loadingSummary ? (
                  <Skeleton className="h-7 w-24" />
                ) : (
                  <div className="text-xl font-bold text-white tracking-tight">
                    {formatUSD(summary?.availableBalance)}
                  </div>
                )}
                <div className="text-[11px] text-muted-foreground">— Available Balance</div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-none rounded-2xl shadow-none">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                  <ArrowUpRight className="w-4 h-4 text-green-500" />
                </div>
                <Activity className="w-5 h-5 text-muted-foreground opacity-50" />
              </div>
              
              <div className="space-y-1">
                {loadingSummary ? (
                  <Skeleton className="h-7 w-24" />
                ) : (
                  <div className="text-xl font-bold text-green-500 tracking-tight">
                    {formatUSD(summary?.todayProfit)}
                  </div>
                )}
                <div className="text-[11px] text-green-500 font-medium">
                  +{summary?.todayProfitPercent || '0'}% from yesterday
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chart */}
        <div className="bg-card border-none rounded-2xl p-5 shadow-none">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[15px]">Earnings Overview</h3>
            <div className="bg-background rounded-lg flex items-center px-2 py-1 text-xs">
              <span className="text-muted-foreground">{period}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="ml-1 opacity-70">
                <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          
          <div className="mb-6">
            {loadingSummary ? (
              <Skeleton className="h-8 w-32 mb-1" />
            ) : (
              <div className="text-3xl font-bold tracking-tight">
                {formatUSD(summary?.totalEarnings)}
              </div>
            )}
            <div className="text-xs text-green-500 bg-green-500/10 inline-block px-2 py-1 rounded-md mt-2 font-medium">
              +{summary?.earningsChangePercent || '0'}% from last week
            </div>
          </div>
          
          <div className="h-[140px] w-[calc(100%+10px)] -ml-[10px]">
            {loadingChart ? (
              <Skeleton className="w-full h-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData || []} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.4}/>
                      <stop offset="100%" stopColor="#7C3AED" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0D1B2E', borderColor: '#1E293B', borderRadius: '12px', padding: '8px' }}
                    itemStyle={{ color: '#fff', fontSize: '14px', fontWeight: 'bold' }}
                    labelStyle={{ color: '#94A3B8', fontSize: '12px', marginBottom: '4px' }}
                  />
                  <Area type="monotone" dataKey="value" stroke="#7C3AED" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Active Bots */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[15px]">Active Bots</h3>
            <Link href="/bots" className="text-sm font-medium text-primary">View All</Link>
          </div>
          
          <div className="space-y-3">
            {loadingBots ? (
              <Skeleton className="h-20 w-full rounded-2xl" />
            ) : activeBots.length > 0 ? (
              activeBots.slice(0, 2).map((bot) => (
                <div key={bot.id} className="flex items-center justify-between p-4 bg-card rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-bold">
                      {bot.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-semibold text-sm mb-1">{bot.name}</div>
                      <div className="text-[10px] text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full inline-flex items-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5"></span>
                        Running
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div>
                      <div className="text-[10px] text-muted-foreground mb-0.5">Profit Today</div>
                      <div className="text-sm font-bold text-green-500">+${bot.profitToday}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground mb-0.5">Win Rate</div>
                      <div className="text-sm font-bold">{bot.winRate}%</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground opacity-50" />
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 bg-card rounded-2xl text-center text-sm text-muted-foreground">
                No active bots
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[15px]">Recent Activity</h3>
            <Link href="/cashier/transactions" className="text-sm font-medium text-primary">View All</Link>
          </div>
          
          <div className="space-y-3">
            {loadingActivity ? (
              Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-[72px] w-full rounded-2xl" />)
            ) : (recentActivity || []).length > 0 ? (
              recentActivity?.slice(0, 3).map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-4 bg-card rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      activity.type === 'deposit' ? 'bg-green-500/10' : 
                      activity.type === 'withdrawal' ? 'bg-red-500/10' : 'bg-primary/10'
                    }`}>
                      {activity.type === 'deposit' ? <ArrowDownRight className="w-5 h-5 text-green-500" /> : 
                       activity.type === 'withdrawal' ? <ArrowUpRight className="w-5 h-5 text-red-500" /> : 
                       <Zap className="w-4 h-4 text-primary fill-primary" />}
                    </div>
                    <div>
                      <div className="font-semibold text-sm mb-0.5">{activity.description}</div>
                      <div className="text-xs text-muted-foreground">{new Date(activity.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold text-sm mb-0.5 ${
                      activity.type === 'deposit' ? 'text-green-500' : 
                      activity.type === 'withdrawal' ? 'text-red-500' : 'text-foreground'
                    }`}>
                      {activity.type === 'deposit' ? '+' : activity.type === 'withdrawal' ? '-' : ''}{formatUSD(activity.amount)}
                    </div>
                    <div className={`text-[10px] px-2 py-0.5 rounded-full inline-block ${
                      activity.status === 'Completed' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'
                    }`}>
                      {activity.status}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 bg-card rounded-2xl text-center text-sm text-muted-foreground">
                No recent activity
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
