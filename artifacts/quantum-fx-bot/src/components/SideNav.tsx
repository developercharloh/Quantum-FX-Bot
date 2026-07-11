import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Home, Bot, Wallet, TrendingUp, Activity, Gift, User, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Home",          icon: Home       },
  { href: "/bots",      label: "Bots",          icon: Bot        },
  { href: "/cashier",   label: "Wallet",        icon: Wallet     },
  { href: "/trade",     label: "Trade",         icon: TrendingUp },
  { href: "/orders",    label: "Orders",        icon: Activity   },
  { href: "/vault",     label: "Quantum Vault", icon: Gift       },
  { href: "/profile",   label: "Profile",       icon: User       },
];

function SideThemeToggle() {
  const [isDark, setIsDark] = useState(() =>
    (localStorage.getItem("qfx_theme") ?? "dark") === "dark"
  );

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem("qfx_theme", next ? "dark" : "light");
    if (next) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
    >
      {isDark
        ? <Sun  className="w-4 h-4 text-amber-400 flex-shrink-0" />
        : <Moon className="w-4 h-4 text-primary flex-shrink-0" />}
      {isDark ? "Light mode" : "Dark mode"}
    </button>
  );
}

export function SideNav() {
  const [location] = useLocation();

  return (
    <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-[240px] bg-card border-r border-border z-40">
      {/* Brand */}
      <div className="px-6 py-5 border-b border-border flex-shrink-0">
        <span className="text-lg font-bold text-foreground tracking-tight">
          Quantum <span className="text-primary">FX</span> Bot
        </span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive =
            location === item.href ||
            (item.href !== "/dashboard" && location.startsWith(`${item.href}/`));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Theme toggle at bottom */}
      <div className="px-3 py-4 border-t border-border flex-shrink-0">
        <SideThemeToggle />
      </div>
    </aside>
  );
}
