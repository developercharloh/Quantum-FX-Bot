import { useState, useEffect } from "react";
import { 
  useAdminGetSettings, 
  useAdminUpdateSettings,
  getAdminGetSettingsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { data: settings, isLoading } = useAdminGetSettings();
  const updateMutation = useAdminUpdateSettings();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm({
    defaultValues: {
      appName: "",
      supportEmail: "",
      maintenanceMode: false,
      depositsEnabled: true,
      withdrawalsEnabled: true,
      minDeposit: 0,
      minWithdrawal: 0,
      referralCommission: 0,
      paymentMethods: [] as any[]
    }
  });

  const { fields: paymentFields, append: appendPayment, remove: removePayment } = useFieldArray({
    control: form.control,
    name: "paymentMethods"
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        appName: settings.appName,
        supportEmail: settings.supportEmail,
        maintenanceMode: settings.maintenanceMode,
        depositsEnabled: settings.depositsEnabled,
        withdrawalsEnabled: settings.withdrawalsEnabled,
        minDeposit: settings.minDeposit,
        minWithdrawal: settings.minWithdrawal,
        referralCommission: settings.referralCommission,
        paymentMethods: settings.paymentMethods || []
      });
    }
  }, [settings, form]);

  const onSubmit = (data: any) => {
    // Coerce numbers
    const payload = {
      ...data,
      minDeposit: Number(data.minDeposit),
      minWithdrawal: Number(data.minWithdrawal),
      referralCommission: Number(data.referralCommission),
      paymentMethods: data.paymentMethods.map((m: any) => ({
        ...m,
        id: m.id || `pm-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
      }))
    };

    updateMutation.mutate(
      { data: payload },
      {
        onSuccess: () => {
          toast({ title: "Settings updated successfully" });
          queryClient.invalidateQueries({ queryKey: getAdminGetSettingsQueryKey() });
        },
        onError: (err) => {
          toast({ title: "Failed to update settings", description: err.message, variant: "destructive" });
        }
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto bg-background p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-2">Platform configuration and business rules.</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>General Configuration</CardTitle>
                <CardDescription>Basic application settings.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="appName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Application Name</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-app-name" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="supportEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Support Email</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} data-testid="input-support-email" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Platform Operations</CardTitle>
                <CardDescription>Enable or disable core platform features.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="maintenanceMode"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border p-4 shadow-sm bg-secondary/20">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base text-destructive font-semibold">Maintenance Mode</FormLabel>
                        <FormDescription>
                          Disable access for all non-admin users.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-maintenance"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="depositsEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border p-4 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Accept Deposits</FormLabel>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-deposits"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="withdrawalsEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border p-4 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Allow Withdrawals</FormLabel>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-withdrawals"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Financial Rules</CardTitle>
                <CardDescription>Limits and commission settings.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="minDeposit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Min Deposit ($)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} data-testid="input-min-deposit" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="minWithdrawal"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Min Withdrawal ($)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} data-testid="input-min-withdrawal" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="referralCommission"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Referral Commission (%)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.1" {...field} data-testid="input-referral-commission" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Payment Methods</CardTitle>
                  <CardDescription>Manage deposit wallets and methods.</CardDescription>
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => appendPayment({ name: "", network: "", address: "", enabled: true })}
                >
                  <Plus className="w-4 h-4 mr-2" /> Add Method
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {paymentFields.length === 0 ? (
                  <div className="text-center py-6 text-sm text-muted-foreground border border-dashed border-border rounded-md">
                    No payment methods configured.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {paymentFields.map((field, index) => (
                      <div key={field.id} className="grid grid-cols-12 gap-4 items-start border border-border p-4 rounded-lg bg-secondary/10">
                        <div className="col-span-3">
                          <FormField
                            control={form.control}
                            name={`paymentMethods.${index}.name`}
                            render={({ field: nameField }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Asset Name</FormLabel>
                                <FormControl><Input {...nameField} placeholder="e.g. USDT, BTC" /></FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="col-span-3">
                          <FormField
                            control={form.control}
                            name={`paymentMethods.${index}.network`}
                            render={({ field: netField }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Network</FormLabel>
                                <FormControl><Input {...netField} placeholder="e.g. TRC20, ERC20" value={netField.value || ''} /></FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="col-span-4">
                          <FormField
                            control={form.control}
                            name={`paymentMethods.${index}.address`}
                            render={({ field: addrField }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Wallet Address</FormLabel>
                                <FormControl><Input {...addrField} placeholder="0x..." /></FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="col-span-2 flex flex-col items-end justify-between h-full gap-2 pt-6">
                          <FormField
                            control={form.control}
                            name={`paymentMethods.${index}.enabled`}
                            render={({ field: enabledField }) => (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">Enabled</span>
                                <Switch checked={enabledField.value} onCheckedChange={enabledField.onChange} />
                              </div>
                            )}
                          />
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            className="text-destructive h-8 px-2"
                            onClick={() => removePayment(index)}
                          >
                            <Trash2 className="w-4 h-4 mr-1" /> Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-end sticky bottom-8 p-4 bg-background border border-border rounded-lg shadow-xl z-10">
              <Button type="submit" size="lg" disabled={updateMutation.isPending} data-testid="btn-save-settings">
                {updateMutation.isPending ? "Saving..." : "Save All Settings"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
