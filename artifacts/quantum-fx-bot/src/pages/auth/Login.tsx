import { useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useMaintenance } from "@/contexts/MaintenanceContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2, ShieldCheck, Mail, ChevronLeft, Wrench } from "lucide-react";
import { QuantumLogo } from "@/components/QuantumLogo";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

export default function Login() {
  const [, setLocation] = useLocation();
  const { setAuth } = useAuth();
  const { maintenanceMode } = useMaintenance();
  const { toast } = useToast();
  const loginMutation = useLogin();
  const [showPassword, setShowPassword] = useState(false);
  const search = useSearch();
  const prefilledEmail = new URLSearchParams(search).get("email") ?? "";

  const [step, setStep] = useState<"credentials" | "email-otp" | "2fa">("credentials");
  const [pendingEmail, setPendingEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [tempToken, setTempToken] = useState("");
  const [twoFACode, setTwoFACode] = useState("");

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: prefilledEmail, password: "", rememberMe: false },
  });

  const onSubmit = (values: z.infer<typeof loginSchema>) => {
    loginMutation.mutate({ data: { email: values.email, password: values.password } }, {
      onSuccess: (res: any) => {
        if (res.requiresEmailVerification) {
          setPendingEmail(res.email ?? values.email);
          setStep("email-otp");
        } else if (res.requires2FA) {
          setTempToken(res.tempToken);
          setStep("2fa");
        } else {
          setAuth(res.token, res.user);
          toast({ title: "Login successful" });
          setLocation("/dashboard");
        }
      },
      onError: (err: any) => {
        toast({ title: "Login failed", description: err.message || "An error occurred", variant: "destructive" });
      },
    });
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) {
      toast({ title: "Enter the 6-digit code sent to your email", variant: "destructive" });
      return;
    }
    setVerifying(true);
    try {
      const r = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pendingEmail, otp: otpCode }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Invalid code");
      if (data.requires2FA) {
        setTempToken(data.tempToken);
        setStep("2fa");
      } else {
        setAuth(data.token, data.user);
        toast({ title: "Login successful" });
        setLocation("/dashboard");
      }
    } catch (err: any) {
      toast({ title: "Invalid code", description: err.message, variant: "destructive" });
      setOtpCode("");
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      const r = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pendingEmail }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Failed to resend");
      toast({ title: "Code resent", description: `A new code was sent to ${pendingEmail}` });
      setOtpCode("");
    } catch (err: any) {
      toast({ title: "Failed to resend", description: err.message, variant: "destructive" });
    } finally {
      setResending(false);
    }
  };

  const handle2FAVerify = async () => {
    if (twoFACode.length !== 6) {
      toast({ title: "Enter the 6-digit code from your authenticator app", variant: "destructive" });
      return;
    }
    setVerifying(true);
    try {
      const r = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tempToken, code: twoFACode }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Invalid code");
      setAuth(data.token, data.user);
      toast({ title: "Login successful" });
      setLocation("/dashboard");
    } catch (err: any) {
      toast({ title: "Invalid code", description: err.message, variant: "destructive" });
      setTwoFACode("");
    } finally {
      setVerifying(false);
    }
  };

  // ── Email OTP step ────────────────────────────────────────────────
  if (step === "email-otp") {
    return (
      <div className="flex flex-col min-h-[100dvh] bg-background p-6 pt-12 max-w-[430px] mx-auto">
        <div className="flex-1 flex flex-col">
          <div className="flex items-center gap-2.5 mb-8">
            <QuantumLogo className="w-9 h-9" />
            <span className="text-xl font-bold tracking-tight text-white">Quantum<span className="text-primary"> FX</span> Bot</span>
          </div>

          <button onClick={() => setStep("credentials")} className="flex items-center gap-1 text-muted-foreground text-sm mb-8 w-fit">
            <ChevronLeft className="w-4 h-4" /> Back to login
          </button>

          <div className="flex flex-col items-center text-center mb-10">
            <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center mb-4">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Check your email</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              We sent a 6-digit code to<br />
              <strong className="text-foreground">{pendingEmail}</strong>
            </p>
          </div>

          <div className="space-y-5">
            <Input
              type="number"
              inputMode="numeric"
              placeholder="000000"
              maxLength={6}
              value={otpCode}
              onChange={e => setOtpCode(e.target.value.slice(0, 6))}
              className="h-16 rounded-xl text-center text-3xl font-mono tracking-[0.5em] bg-card border-none"
            />

            <Button
              className="w-full h-14 rounded-xl text-lg font-medium shadow-none"
              onClick={handleVerifyOtp}
              disabled={verifying || otpCode.length !== 6}
            >
              {verifying ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify & Login"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Didn't receive it?{" "}
              <button onClick={handleResend} disabled={resending} className="text-primary font-medium underline underline-offset-2">
                {resending ? "Sending…" : "Resend code"}
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── 2FA step ──────────────────────────────────────────────────────
  if (step === "2fa") {
    return (
      <div className="flex flex-col min-h-[100dvh] bg-background p-6 pt-12 max-w-[430px] mx-auto">
        <div className="flex-1 flex flex-col">
          <div className="flex items-center gap-2.5 mb-8">
            <QuantumLogo className="w-9 h-9" />
            <span className="text-xl font-bold tracking-tight text-white">Quantum<span className="text-primary"> FX</span> Bot</span>
          </div>

          <button onClick={() => setStep("email-otp")} className="flex items-center gap-1 text-muted-foreground text-sm mb-8 w-fit">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>

          <div className="flex flex-col items-center text-center mb-10">
            <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center mb-4">
              <ShieldCheck className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Two-Factor Authentication</h1>
            <p className="text-muted-foreground text-sm">
              Open <strong className="text-foreground">Google Authenticator</strong> and enter the 6-digit code for <strong className="text-foreground">Quantum FX Bot</strong>.
            </p>
          </div>

          <div className="space-y-5">
            <Input
              type="number"
              inputMode="numeric"
              placeholder="000 000"
              maxLength={6}
              value={twoFACode}
              onChange={e => setTwoFACode(e.target.value.slice(0, 6))}
              className="h-16 rounded-xl text-center text-3xl font-mono tracking-[0.5em] bg-card border-none"
            />
            <Button className="w-full h-14 rounded-xl text-lg font-medium shadow-none" onClick={handle2FAVerify} disabled={verifying || twoFACode.length !== 6}>
              {verifying ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify & Login"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">Code refreshes every 30 seconds.</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Credentials step ──────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-[100dvh] bg-background p-6 pt-12 max-w-[430px] mx-auto">
      <div className="flex-1 flex flex-col">
        <div className="flex items-center gap-2.5 mb-8">
          <QuantumLogo className="w-9 h-9" />
          <span className="text-xl font-bold tracking-tight text-white">Quantum<span className="text-primary"> FX</span> Bot</span>
        </div>

        {/* Maintenance banner */}
        {maintenanceMode && (
          <div
            className="flex items-start gap-3 rounded-2xl px-4 py-3.5 mb-6"
            style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.3)" }}
          >
            <Wrench className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-violet-300 leading-none mb-1">Scheduled Maintenance</p>
              <p className="text-xs text-white/55 leading-relaxed">
                Our trading systems are undergoing routine maintenance. Login is temporarily unavailable — your account and funds remain fully secure. Please check back shortly.
              </p>
            </div>
          </div>
        )}

        <div className="mb-8 w-full">
          <h1 className="text-2xl font-bold mb-1.5">Welcome back</h1>
          <p className="text-muted-foreground text-sm">Log in to your account</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 w-full">
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className="text-muted-foreground font-normal">Email</FormLabel>
                <FormControl>
                  <Input placeholder="name@example.com" type="email" className="bg-card border-border h-12 rounded-xl text-base px-4" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="password" render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className="text-muted-foreground font-normal">Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input placeholder="••••••••" type={showPassword ? "text" : "password"} className="bg-card border-border h-12 rounded-xl text-base px-4 pr-12" {...field} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white">
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="flex items-center justify-between pt-1 pb-2">
              <FormField control={form.control} name="rememberMe" render={({ field }) => (
                <div className="flex items-center space-x-2">
                  <Checkbox id="remember" checked={field.value} onCheckedChange={field.onChange} className="rounded border-muted-foreground data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
                  <label htmlFor="remember" className="text-sm font-medium leading-none text-muted-foreground">Remember me</label>
                </div>
              )} />
              <Link href="/forgot-password" className="text-sm text-primary font-medium">Forgot password?</Link>
            </div>

            <Button type="submit" className="w-full h-14 rounded-xl text-lg font-medium shadow-none" disabled={loginMutation.isPending || maintenanceMode}>
              {loginMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Login"}
            </Button>
          </form>
        </Form>

        <div className="mt-8 pb-6 text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link href="/register" className="text-primary font-medium">Register</Link>
        </div>
      </div>
    </div>
  );
}
