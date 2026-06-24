import { useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { SiGoogle, SiApple } from "react-icons/si";
import { QuantumLogo } from "@/components/QuantumLogo";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

export default function Login() {
  const [, setLocation] = useLocation();
  const { setAuth } = useAuth();
  const { toast } = useToast();
  const loginMutation = useLogin();
  const [showPassword, setShowPassword] = useState(false);
  const search = useSearch();
  const prefilledEmail = new URLSearchParams(search).get("email") ?? "";

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: prefilledEmail, password: "", rememberMe: false },
  });

  const onSubmit = (values: z.infer<typeof loginSchema>) => {
    loginMutation.mutate({ data: { email: values.email, password: values.password } }, {
      onSuccess: (res) => {
        setAuth(res.token, res.user);
        toast({ title: "Login successful" });
        setLocation("/dashboard");
      },
      onError: (err: any) => {
        toast({ 
          title: "Login failed", 
          description: err.message || "An error occurred",
          variant: "destructive"
        });
      }
    });
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-background p-6 pt-12">
      <div className="flex-1 flex flex-col">
        <div className="flex items-center gap-2.5 mb-8">
          <QuantumLogo className="w-9 h-9" />
          <span className="text-xl font-bold tracking-tight text-white">
            Quantum<span className="text-primary"> FX</span> Bot
          </span>
        </div>
        
        <div className="mb-8 w-full">
          <h1 className="text-2xl font-bold mb-1.5">Welcome back</h1>
          <p className="text-muted-foreground text-sm">Log in to your account</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 w-full">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-muted-foreground font-normal">Email</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="name@example.com" 
                      type="email" 
                      className="bg-card border-border h-12 rounded-xl text-base px-4"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-muted-foreground font-normal">Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        placeholder="••••••••" 
                        type={showPassword ? "text" : "password"} 
                        className="bg-card border-border h-12 rounded-xl text-base px-4 pr-12"
                        {...field} 
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex items-center justify-between pt-1 pb-2">
              <FormField
                control={form.control}
                name="rememberMe"
                render={({ field }) => (
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="remember" 
                      checked={field.value} 
                      onCheckedChange={field.onChange}
                      className="rounded border-muted-foreground data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    <label
                      htmlFor="remember"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-muted-foreground"
                    >
                      Remember me
                    </label>
                  </div>
                )}
              />
              <Link href="/forgot-password" className="text-sm text-primary font-medium">
                Forgot password?
              </Link>
            </div>
            
            <Button type="submit" className="w-full h-14 rounded-xl text-lg font-medium shadow-none" disabled={loginMutation.isPending}>
              {loginMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Login"}
            </Button>
          </form>
        </Form>

        <div className="relative w-full my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-background px-2 text-muted-foreground">or continue with</span>
          </div>
        </div>

        <div className="flex gap-4 w-full mb-8">
          <Button variant="outline" className="flex-1 h-14 rounded-xl border-border bg-transparent hover:bg-card gap-2.5 text-base font-medium">
            <SiGoogle className="w-5 h-5 text-[#EA4335]" />
            Google
          </Button>
          <Button variant="outline" className="flex-1 h-14 rounded-xl border-border bg-transparent hover:bg-card gap-2.5 text-base font-medium">
            <SiApple className="w-5 h-5" />
            Apple
          </Button>
        </div>

        <div className="mt-auto pb-6 text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link href="/register" className="text-primary font-medium">
            Register
          </Link>
        </div>
      </div>
    </div>
  );
}
