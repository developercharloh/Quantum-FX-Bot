import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useListPaymentMethods, useCreateDeposit } from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ChevronLeft, Loader2, CreditCard, Landmark, Apple, Smartphone, Copy, Check, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { SiTether, SiBitcoin } from "react-icons/si";

const depositSchema = z.object({
  amount: z.coerce.number().min(10, "Minimum deposit is $10"),
  paymentMethod: z.string().min(1, "Select a payment method"),
  walletAddress: z.string().optional(),
});

const QUICK_AMOUNTS = [100, 250, 500, 1000];

export default function Deposit() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const { data: paymentMethods, isLoading: loadingMethods } = useListPaymentMethods();
  const depositMutation = useCreateDeposit();

  const [copied, setCopied] = useState(false);

  const form = useForm<z.infer<typeof depositSchema>>({
    resolver: zodResolver(depositSchema),
    defaultValues: { amount: 100, paymentMethod: "" },
  });

  const onSubmit = (values: z.infer<typeof depositSchema>) => {
    const method = paymentMethods?.find((m) => m.id === values.paymentMethod);
    depositMutation.mutate(
      { data: { ...values, walletAddress: method?.depositAddress ?? undefined } },
      {
        onSuccess: () => {
          toast({ title: "Deposit initiated", description: "Your transaction is pending." });
          setLocation("/cashier/transactions");
        },
        onError: (err: any) => {
          toast({ title: "Deposit failed", description: err.message, variant: "destructive" });
        },
      }
    );
  };

  const selectedMethod = form.watch("paymentMethod");
  const activeMethod = paymentMethods?.find((m) => m.id === selectedMethod);

  const copyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({ title: "Could not copy", description: "Copy the address manually.", variant: "destructive" });
    }
  };

  const getMethodIcon = (name: string) => {
    if (name.includes('USDT') || name.includes('Tether')) return <SiTether className="w-6 h-6 text-[#26A17B]" />;
    if (name.includes('BTC') || name.includes('Bitcoin')) return <SiBitcoin className="w-6 h-6 text-[#F7931A]" />;
    if (name.includes('ACH') || name.includes('Bank')) return <Landmark className="w-6 h-6 text-sky-400" />;
    if (name.includes('Apple')) return <Apple className="w-6 h-6 text-foreground" />;
    if (name.includes('Google')) return <Smartphone className="w-6 h-6 text-emerald-400" />;
    return <CreditCard className="w-6 h-6 text-primary" />;
  };

  return (
    <Layout>
      <div className="p-5 pb-8 space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setLocation("/cashier")} className="w-10 h-10 flex items-center justify-center rounded-xl bg-card">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold tracking-tight">Deposit</h1>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            
            <div className="space-y-4">
              <p className="text-sm font-medium text-muted-foreground">Select Payment Method</p>
              <div className="space-y-3">
                {loadingMethods ? (
                  Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)
                ) : (
                  paymentMethods?.map((method) => (
                    <div 
                      key={method.id}
                      className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-colors ${
                        selectedMethod === method.id 
                          ? 'bg-card border-primary border' 
                          : 'bg-card border border-transparent'
                      }`}
                      onClick={() => form.setValue("paymentMethod", method.id)}
                    >
                      <div className="flex items-center gap-3">
                        {getMethodIcon(method.name)}
                        <span className="font-medium text-sm">
                          {method.name} {method.network ? `(${method.network})` : ''}
                        </span>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedMethod === method.id ? 'border-primary' : 'border-muted-foreground/30'
                      }`}>
                        {selectedMethod === method.id && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                      </div>
                    </div>
                  ))
                )}
              </div>
              {form.formState.errors.paymentMethod && (
                <p className="text-sm font-medium text-destructive">{form.formState.errors.paymentMethod.message}</p>
              )}

              {activeMethod?.depositAddress && (
                <div className="rounded-xl bg-card p-4 space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Send your deposit to this {activeMethod.network} address
                  </p>
                  <div className="flex items-center gap-2 rounded-lg bg-background p-3">
                    <code className="flex-1 break-all text-xs font-mono text-foreground">
                      {activeMethod.depositAddress}
                    </code>
                    <button
                      type="button"
                      onClick={() => copyAddress(activeMethod.depositAddress!)}
                      className="shrink-0 w-9 h-9 flex items-center justify-center rounded-lg bg-card hover:bg-muted transition-colors"
                      aria-label="Copy address"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                    </button>
                  </div>
                  <div className="flex gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                    <p className="text-[11px] leading-relaxed text-amber-200/90">
                      Double-check the address and send only {activeMethod.name} over the {activeMethod.network} network.
                      Crypto transactions are irreversible — funds sent to a wrong address or over the wrong network are
                      permanently lost and cannot be recovered or refunded.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem className="space-y-4">
                  <FormLabel className="text-muted-foreground font-normal">Enter Amount</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-xl font-bold">$</div>
                      <Input type="number" className="pl-8 bg-card border-none h-16 rounded-xl text-xl font-bold px-4" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <div className="grid grid-cols-4 gap-2">
                {QUICK_AMOUNTS.map(amount => (
                  <Button
                    key={amount}
                    type="button"
                    className={`h-12 rounded-xl text-sm font-medium shadow-none ${
                      form.watch("amount") === amount 
                        ? "bg-primary text-white" 
                        : "bg-card text-foreground hover:bg-card/80 border border-border"
                    }`}
                    onClick={() => form.setValue("amount", amount)}
                  >
                    ${amount}
                  </Button>
                ))}
              </div>
            </div>

            <Button type="submit" className="w-full h-14 rounded-xl text-lg font-medium shadow-none mt-8" disabled={depositMutation.isPending}>
              {depositMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Continue"}
            </Button>
          </form>
        </Form>
      </div>
    </Layout>
  );
}
