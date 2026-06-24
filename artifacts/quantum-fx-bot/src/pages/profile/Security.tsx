import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  useChangePassword, 
  useGet2FA, 
  useToggle2FA,
  useListSessions,
  useRevokeSession
} from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { ChevronLeft, Laptop, Smartphone, Shield, Key, ChevronRight, Eye, EyeOff, Monitor } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
  confirmPassword: z.string()
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function Security() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const changePwdMutation = useChangePassword();
  const { data: twoFA, isLoading: loading2FA } = useGet2FA();
  const toggle2FAMutation = useToggle2FA();
  const { data: sessions, isLoading: loadingSessions } = useListSessions();
  const revokeSessionMutation = useRevokeSession();

  const [pwdOpen, setPwdOpen] = useState(false);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  
  const [showCurPwd, setShowCurPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfPwd, setShowConfPwd] = useState(false);

  const form = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const onPasswordSubmit = (values: z.infer<typeof passwordSchema>) => {
    changePwdMutation.mutate({ data: { currentPassword: values.currentPassword, newPassword: values.newPassword } }, {
      onSuccess: () => {
        toast({ title: "Password changed successfully" });
        form.reset();
        setPwdOpen(false);
      },
      onError: (err: any) => {
        toast({ title: "Failed to change password", description: err.message, variant: "destructive" });
      }
    });
  };

  const handleToggle2FA = (checked: boolean) => {
    toggle2FAMutation.mutate({ data: { enable: checked } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/profile/2fa"] });
        toast({ title: `2FA ${checked ? 'Enabled' : 'Disabled'}` });
      }
    });
  };

  const handleRevokeSession = (id: number) => {
    revokeSessionMutation.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Session revoked" });
        queryClient.invalidateQueries({ queryKey: ["/api/profile/sessions"] });
      }
    });
  };

  return (
    <Layout>
      <div className="p-5 pb-8 space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setLocation("/profile")} className="w-10 h-10 flex items-center justify-center rounded-xl bg-card">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold tracking-tight">Security</h1>
        </div>

        <div className="space-y-3">
          {/* Change Password */}
          <Collapsible open={pwdOpen} onOpenChange={setPwdOpen} className="bg-card rounded-2xl overflow-hidden">
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between p-4 cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10">
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                  <span className="font-semibold text-sm">Change Password</span>
                </div>
                <ChevronRight className={`w-5 h-5 text-muted-foreground opacity-50 transition-transform ${pwdOpen ? "rotate-90" : ""}`} />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="p-4 pt-0 border-t border-border/50">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onPasswordSubmit)} className="space-y-4 pt-4">
                  <FormField
                    control={form.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-muted-foreground font-normal text-xs">Current Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input type={showCurPwd ? "text" : "password"} placeholder="••••••••" className="bg-background border-none h-12 rounded-xl px-4 pr-12" {...field} />
                            <button type="button" onClick={() => setShowCurPwd(!showCurPwd)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                              {showCurPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-muted-foreground font-normal text-xs">New Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input type={showNewPwd ? "text" : "password"} placeholder="••••••••" className="bg-background border-none h-12 rounded-xl px-4 pr-12" {...field} />
                            <button type="button" onClick={() => setShowNewPwd(!showNewPwd)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                              {showNewPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-muted-foreground font-normal text-xs">Confirm Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input type={showConfPwd ? "text" : "password"} placeholder="••••••••" className="bg-background border-none h-12 rounded-xl px-4 pr-12" {...field} />
                            <button type="button" onClick={() => setShowConfPwd(!showConfPwd)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                              {showConfPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full h-12 rounded-xl text-sm font-medium shadow-none mt-2" disabled={changePwdMutation.isPending}>
                    {changePwdMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                </form>
              </Form>
            </CollapsibleContent>
          </Collapsible>

          {/* Two-Factor Authentication */}
          <div className="flex items-center justify-between p-4 bg-card rounded-2xl">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10">
                <Key className="w-5 h-5 text-primary" />
              </div>
              <div>
                <span className="font-semibold text-sm block mb-0.5">Two-Factor Authentication</span>
                {loading2FA ? (
                  <Skeleton className="w-16 h-3" />
                ) : (
                  <span className={`text-[10px] font-medium ${twoFA?.enabled ? 'text-green-500' : 'text-muted-foreground'}`}>
                    {twoFA?.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                )}
              </div>
            </div>
            {loading2FA ? (
              <Skeleton className="w-10 h-6 rounded-full" />
            ) : (
              <Switch 
                checked={twoFA?.enabled || false}
                onCheckedChange={handleToggle2FA}
                disabled={toggle2FAMutation.isPending}
                className="data-[state=checked]:bg-primary"
              />
            )}
          </div>

          {/* Sessions */}
          <Collapsible open={sessionsOpen} onOpenChange={setSessionsOpen} className="bg-card rounded-2xl overflow-hidden">
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between p-4 cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10">
                    <Monitor className="w-5 h-5 text-primary" />
                  </div>
                  <span className="font-semibold text-sm">Login Sessions</span>
                </div>
                <ChevronRight className={`w-5 h-5 text-muted-foreground opacity-50 transition-transform ${sessionsOpen ? "rotate-90" : ""}`} />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="p-4 pt-0 border-t border-border/50">
              <div className="space-y-3 pt-4">
                {loadingSessions ? (
                  Array(2).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)
                ) : (
                  sessions?.map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-3 bg-background rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                          {session.device.toLowerCase().includes('mobile') ? (
                            <Smartphone className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <Laptop className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-xs flex items-center gap-2">
                            {session.device}
                            {session.isCurrent && (
                              <span className="text-[9px] bg-green-500/10 text-green-500 px-1.5 py-0 rounded-full">Current</span>
                            )}
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            {session.location || session.ip}
                          </div>
                        </div>
                      </div>
                      {!session.isCurrent && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 text-xs text-red-500 hover:text-red-500 hover:bg-red-500/10"
                          onClick={() => handleRevokeSession(session.id)}
                          disabled={revokeSessionMutation.isPending}
                        >
                          Revoke
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
    </Layout>
  );
}
