import { useLocation } from "wouter";
import { useGetNotificationSettings, useUpdateNotificationSettings } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { Switch } from "@/components/ui/switch";
import { ChevronLeft, Mail, ArrowLeftRight, Gift, Bot } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";

export default function Notifications() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: settings, isLoading } = useGetNotificationSettings();
  const updateMutation = useUpdateNotificationSettings();

  type SettingsKey = "emailNotifications" | "botAlerts" | "depositWithdrawal" | "promotions";
  
  const handleToggle = (key: SettingsKey, value: boolean) => {
    updateMutation.mutate({ data: { [key]: value } as any }, {
      onSuccess: () => {
        queryClient.setQueryData(["/api/profile/notification-settings"], (old: any) => ({
          ...old,
          [key]: value
        }));
      },
      onError: (err: any) => {
        toast({ title: "Failed to update", description: err.message, variant: "destructive" });
      }
    });
  };

  const notificationItems = [
    {
      key: "emailNotifications" as const,
      title: "Email Notifications",
      description: "Receive general account updates via email",
      icon: Mail,
      color: "text-blue-500",
      bg: "bg-blue-500/10"
    },
    {
      key: "botAlerts" as const,
      title: "Bot Alerts",
      description: "Get notified when bots start, stop or encounter errors",
      icon: Bot,
      color: "text-primary",
      bg: "bg-primary/10"
    },
    {
      key: "depositWithdrawal" as const,
      title: "Deposit & Withdrawal",
      description: "Alerts for successful or failed transactions",
      icon: ArrowLeftRight,
      color: "text-green-500",
      bg: "bg-green-500/10"
    },
    {
      key: "promotions" as const,
      title: "Promotions",
      description: "News about new bots, features, and special deals",
      icon: Gift,
      color: "text-yellow-500",
      bg: "bg-yellow-500/10"
    }
  ];

  return (
    <Layout>
      <div className="p-5 pb-8 space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setLocation("/profile")} className="w-10 h-10 flex items-center justify-center rounded-xl bg-card">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold tracking-tight">Notifications</h1>
        </div>

        <div className="space-y-3">
          {isLoading ? (
            Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-[76px] w-full rounded-2xl" />)
          ) : (
            notificationItems.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.key} className="flex items-center justify-between p-4 bg-card rounded-2xl">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.bg}`}>
                      <Icon className={`w-5 h-5 ${item.color}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm mb-0.5">{item.title}</h3>
                      <p className="text-[11px] text-muted-foreground leading-tight">{item.description}</p>
                    </div>
                  </div>
                  <Switch 
                    checked={settings?.[item.key] || false}
                    onCheckedChange={(checked) => handleToggle(item.key, checked)}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
              );
            })
          )}
        </div>
      </div>
    </Layout>
  );
}
