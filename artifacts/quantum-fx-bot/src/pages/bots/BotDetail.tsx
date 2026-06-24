import { useParams, useLocation } from "wouter";
import { useGetBot, useToggleBot, useGetBotAnalytics } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function BotDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [period, setPeriod] = useState("7D");

  const { data: bot, isLoading } = useGetBot(id, { query: { enabled: !!id } as any });
  const { data: analytics, isLoading: loadingAnalytics } = useGetBotAnalytics(id, period, { query: { enabled: !!id } as any });
  const toggleMutation = useToggleBot();

  const handleToggle = () => {
    toggleMutation.mutate({ id }, {
      onSuccess: () => {
        toast({ title: bot?.status === 'running' ? "Bot paused" : "Bot started" });
        queryClient.invalidateQueries({ queryKey: ["/api/bots"] });
        queryClient.invalidateQueries({ queryKey: [`/api/bots/${id}`] });
      },
      onError: (err: any) => {
        toast({ title: "Action failed", description: err.message, variant: "destructive" });
      }
    });
  };

  if (!id) {
    setLocation("/bots");
    return null;
  }

  return (
    <Layout>
      <div className="p-5 pb-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setLocation("/bots")}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-card"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          {isLoading ? (
            <Skeleton className="h-6 w-32" />
          ) : (
            <div className="flex-1 flex justify-between items-center">
              <div>
                <h1 className="text-xl font-bold tracking-tight">{bot?.name}</h1>
                <div className={`text-[10px] px-2 py-0.5 mt-1 rounded-full inline-flex items-center ${
                  bot?.status === 'running' ? 'text-green-500 bg-green-500/10' : 'text-muted-foreground bg-muted'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${bot?.status === 'running' ? 'bg-green-500' : 'bg-muted-foreground'}`}></span>
                  {bot?.status === 'running' ? 'Running' : 'Paused'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-card border-none rounded-2xl shadow-none">
            <CardContent className="p-4">
              <div className="text-[11px] font-medium text-muted-foreground mb-1">Win Rate</div>
              {isLoading ? <Skeleton className="h-7 w-16" /> : (
                <div className="text-xl font-bold">{bot?.winRate}%</div>
              )}
            </CardContent>
          </Card>
          <Card className="bg-card border-none rounded-2xl shadow-none">
            <CardContent className="p-4">
              <div className="text-[11px] font-medium text-muted-foreground mb-1">Profit Today</div>
              {isLoading ? <Skeleton className="h-7 w-16" /> : (
                <div className="text-xl font-bold text-green-500">+${bot?.profitToday}</div>
              )}
            </CardContent>
          </Card>
          <Card className="bg-card border-none rounded-2xl shadow-none">
            <CardContent className="p-4">
              <div className="text-[11px] font-medium text-muted-foreground mb-1">Total Profit</div>
              {isLoading ? <Skeleton className="h-7 w-16" /> : (
                <div className="text-xl font-bold text-green-500">+${bot?.profitTotal}</div>
              )}
            </CardContent>
          </Card>
          <Card className="bg-card border-none rounded-2xl shadow-none">
            <CardContent className="p-4">
              <div className="text-[11px] font-medium text-muted-foreground mb-1">Total Trades</div>
              {isLoading ? <Skeleton className="h-7 w-16" /> : (
                <div className="text-xl font-bold">{bot?.totalTrades}</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Performance Chart */}
        <div className="bg-card border-none rounded-2xl p-5 shadow-none">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-[15px]">Performance</h3>
            <div className="flex bg-background rounded-lg p-1">
              {(["7D", "30D", "90D"]).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`text-xs px-3 py-1 rounded-md transition-colors ${period === p ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="h-[180px] w-[calc(100%+10px)] -ml-[10px]">
            {loadingAnalytics ? (
              <Skeleton className="w-full h-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics || []} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorBot" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.4}/>
                      <stop offset="100%" stopColor="#7C3AED" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0D1B2E', borderColor: '#1E293B', borderRadius: '12px', padding: '8px' }}
                    itemStyle={{ color: '#fff', fontSize: '14px', fontWeight: 'bold' }}
                    labelStyle={{ color: '#94A3B8', fontSize: '12px', marginBottom: '4px' }}
                  />
                  <Area type="monotone" dataKey="value" stroke="#7C3AED" strokeWidth={3} fillOpacity={1} fill="url(#colorBot)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-4">
          <Button 
            className={`flex-1 h-14 rounded-xl text-[15px] font-medium shadow-none ${
              bot?.status === 'running' 
                ? 'bg-transparent border border-red-500/50 text-red-500 hover:bg-red-500/10' 
                : 'bg-primary text-white'
            }`}
            onClick={handleToggle}
            disabled={isLoading || toggleMutation.isPending}
          >
            {toggleMutation.isPending ? (
              "Updating..."
            ) : bot?.status === 'running' ? (
              "Pause Bot"
            ) : (
              "Start Bot"
            )}
          </Button>
          <Button className="flex-1 h-14 rounded-xl text-[15px] font-medium shadow-none bg-primary text-white hover:bg-primary/90">
            View Analytics
          </Button>
        </div>
      </div>
    </Layout>
  );
}
