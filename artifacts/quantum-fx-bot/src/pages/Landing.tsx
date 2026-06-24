import { useEffect, useRef, useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { QuantumLogo } from "@/components/QuantumLogo";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
} from "recharts";
import {
  ShieldCheck,
  Lock,
  Zap,
  TrendingUp,
  Wallet,
  Bot,
  Star,
  ChevronRight,
  BadgeCheck,
} from "lucide-react";

const HERO_CHART = [
  { value: 20 }, { value: 28 }, { value: 24 }, { value: 38 },
  { value: 34 }, { value: 50 }, { value: 46 }, { value: 64 },
  { value: 58 }, { value: 78 }, { value: 72 }, { value: 95 },
];

interface Stat {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

const STATS: Stat[] = [
  { label: "Traded Volume", value: 482_000_000, prefix: "$", suffix: "+" },
  { label: "Active Traders", value: 128_400, suffix: "+" },
  { label: "Avg. Uptime", value: 99.9, suffix: "%", decimals: 1 },
  { label: "Bots Running", value: 6_200, suffix: "+" },
];

function formatStat(v: number, s: Stat) {
  let str: string;
  if (v >= 1_000_000) str = (v / 1_000_000).toFixed(v >= 10_000_000 ? 0 : 1) + "M";
  else if (v >= 1_000) str = (v / 1_000).toFixed(v >= 10_000 ? 0 : 1) + "K";
  else str = v.toFixed(s.decimals ?? 0);
  return `${s.prefix ?? ""}${str}${s.suffix ?? ""}`;
}

function CountUpStat({ stat }: { stat: Stat }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const frame = useRef<number | undefined>(undefined);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !started.current) {
            started.current = true;
            const duration = 1400;
            const start = performance.now();
            const tick = (now: number) => {
              const p = Math.min((now - start) / duration, 1);
              const eased = 1 - Math.pow(1 - p, 3);
              setVal(stat.value * eased);
              if (p < 1) frame.current = requestAnimationFrame(tick);
            };
            frame.current = requestAnimationFrame(tick);
          }
        });
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [stat.value]);

  return (
    <div ref={ref} className="bg-card rounded-2xl p-4">
      <div className="text-2xl font-bold tracking-tight text-white">
        {formatStat(val, stat)}
      </div>
      <div className="text-[11px] text-muted-foreground mt-1">{stat.label}</div>
    </div>
  );
}

const STEPS = [
  {
    icon: Wallet,
    title: "Fund your account",
    desc: "Deposit in seconds via bank transfer, card, Apple Pay, or crypto.",
  },
  {
    icon: Bot,
    title: "Pick a trading bot",
    desc: "Choose from strategies built for every risk appetite.",
  },
  {
    icon: TrendingUp,
    title: "Track your earnings",
    desc: "Watch live P&L update around the clock from your dashboard.",
  },
];

const TRUST = [
  { icon: Lock, label: "Bank-grade encryption" },
  { icon: ShieldCheck, label: "2FA account security" },
  { icon: BadgeCheck, label: "Transparent reporting" },
];

const TESTIMONIALS = [
  {
    name: "Marcus T.",
    location: "Austin, TX",
    quote:
      "Setup took five minutes and I can finally see exactly what my bot is doing. The dashboard is clean and the withdrawals were fast.",
  },
  {
    name: "Danielle R.",
    location: "Chicago, IL",
    quote:
      "I like that everything is upfront — the risk levels, the fees, the performance history. No guessing games.",
  },
];

export default function Landing() {
  const [, setLocation] = useLocation();
  const { token, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && token) setLocation("/dashboard");
  }, [token, isLoading, setLocation]);

  const handleGetStarted = () => {
    const seen = localStorage.getItem("qfx_onboarding_seen");
    setLocation(seen ? "/register" : "/onboarding");
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-6">
        <div className="flex items-center gap-2">
          <QuantumLogo className="w-8 h-8" />
          <span className="font-bold tracking-tight text-sm">
            Quantum<span className="text-primary"> FX</span>
          </span>
        </div>
        <Button
          variant="ghost"
          className="h-9 px-4 text-sm font-medium text-muted-foreground"
          onClick={() => setLocation("/login")}
        >
          Sign In
        </Button>
      </div>

      {/* Hero */}
      <section className="px-5 pt-8">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-[11px] font-medium px-3 py-1.5 rounded-full mb-5">
          <Zap className="w-3.5 h-3.5 fill-primary" />
          Automated trading, on autopilot
        </div>
        <h1 className="text-[34px] leading-[1.1] font-bold tracking-tight">
          Smart trading bots that work while you sleep
        </h1>
        <p className="text-muted-foreground text-[15px] leading-relaxed mt-4 max-w-[330px]">
          Quantum FX Bot puts institutional-grade AI strategies in your pocket.
          Fund your account, pick a bot, and track every trade in real time.
        </p>

        <div className="mt-6 space-y-3">
          <Button
            className="w-full h-14 rounded-xl text-[17px] font-medium shadow-none"
            onClick={handleGetStarted}
          >
            Get Started — It's Free
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            No credit card required to create an account
          </p>
        </div>

        {/* Hero chart */}
        <div className="relative mt-8 bg-card rounded-3xl p-5 overflow-hidden">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-muted-foreground">Portfolio value</span>
            <span className="text-xs text-green-500 bg-green-500/10 px-2 py-1 rounded-md font-medium">
              +37.2%
            </span>
          </div>
          <div className="text-2xl font-bold tracking-tight mb-3">$24,815.60</div>
          <div className="h-[110px] w-[calc(100%+10px)] -ml-[5px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={HERO_CHART} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="heroGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#7C3AED" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#7C3AED"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#heroGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Live stats */}
      <section className="px-5 pt-10">
        <div className="grid grid-cols-2 gap-3">
          {STATS.map((s) => (
            <CountUpStat key={s.label} stat={s} />
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="px-5 pt-12">
        <h2 className="text-xl font-bold tracking-tight mb-1">How it works</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Start earning in three simple steps.
        </p>
        <div className="space-y-3">
          {STEPS.map((step, i) => (
            <div key={step.title} className="flex items-start gap-4 bg-card rounded-2xl p-4">
              <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                <step.icon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-primary">
                    STEP {i + 1}
                  </span>
                </div>
                <h3 className="font-semibold text-[15px] mt-0.5">{step.title}</h3>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Trust */}
      <section className="px-5 pt-12">
        <div className="bg-card rounded-2xl p-5 space-y-4">
          <h2 className="text-base font-bold tracking-tight">
            Built for security &amp; transparency
          </h2>
          {TRUST.map((t) => (
            <div key={t.label} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                <t.icon className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm font-medium">{t.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="px-5 pt-12">
        <h2 className="text-xl font-bold tracking-tight mb-6">
          Loved by traders nationwide
        </h2>
        <div className="space-y-3">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="bg-card rounded-2xl p-5">
              <div className="flex gap-0.5 mb-3">
                {Array(5)
                  .fill(0)
                  .map((_, i) => (
                    <Star
                      key={i}
                      className="w-4 h-4 text-yellow-400 fill-yellow-400"
                    />
                  ))}
              </div>
              <p className="text-sm leading-relaxed text-foreground/90">
                "{t.quote}"
              </p>
              <div className="flex items-center gap-3 mt-4">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary to-purple-400 flex items-center justify-center text-sm font-bold">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-semibold">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.location}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-5 pt-12">
        <div className="bg-gradient-to-br from-primary/20 to-card rounded-3xl p-6 text-center">
          <h2 className="text-2xl font-bold tracking-tight">
            Ready to start trading smarter?
          </h2>
          <p className="text-sm text-muted-foreground mt-2 mb-5">
            Join thousands of traders growing their capital on autopilot.
          </p>
          <Button
            className="w-full h-14 rounded-xl text-[17px] font-medium shadow-none"
            onClick={() => setLocation("/register")}
          >
            Create Your Free Account
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-5 pt-12 pb-10">
        <div className="flex items-center gap-2 mb-4">
          <QuantumLogo className="w-6 h-6" />
          <span className="font-semibold text-sm">Quantum FX Bot</span>
        </div>
        <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm text-muted-foreground">
          <Link href="/about" className="hover:text-foreground transition-colors flex items-center gap-1">
            About Us <ChevronRight className="w-3.5 h-3.5" />
          </Link>
          <Link href="/legal/risk" className="hover:text-foreground transition-colors flex items-center gap-1">
            Risk Disclosure <ChevronRight className="w-3.5 h-3.5" />
          </Link>
          <Link href="/legal/terms" className="hover:text-foreground transition-colors flex items-center gap-1">
            Terms of Service <ChevronRight className="w-3.5 h-3.5" />
          </Link>
          <Link href="/legal/privacy" className="hover:text-foreground transition-colors flex items-center gap-1">
            Privacy Policy <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <p className="text-[11px] text-muted-foreground/70 leading-relaxed mt-6">
          Trading involves substantial risk and is not suitable for every
          investor. Past performance is not indicative of future results. Only
          invest capital you can afford to lose. See our Risk Disclosure for
          details.
        </p>
        <p className="text-[11px] text-muted-foreground/70 mt-4">
          © {new Date().getFullYear()} Quantum FX Bot. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
