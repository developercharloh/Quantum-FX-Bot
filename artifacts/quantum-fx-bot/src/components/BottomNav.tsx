import { Link, useLocation } from "wouter";
import { Home, Bot, Wallet, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/bots", label: "Bots", icon: Bot },
  { href: "/cashier", label: "Wallet", icon: Wallet },
  { href: "/trade", label: "Trade", icon: TrendingUp },
];

export function BottomNav() {
  const [location] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border mx-auto max-w-[430px] pb-safe">
      <div className="flex items-center justify-between px-2 h-[72px]">
        {NAV_ITEMS.map((item) => {
          const isActive = location === item.href || (location.startsWith(`${item.href}/`) && item.href !== '/dashboard');
          const Icon = item.icon;
          
          return (
            <Link key={item.href} href={item.href} className="flex-1 flex flex-col items-center justify-center gap-1 h-full py-1">
              <Icon 
                className={cn(
                  "w-6 h-6 transition-colors", 
                  isActive ? "text-primary" : "text-muted-foreground"
                )} 
              />
              <span 
                className={cn(
                  "text-[10px] font-medium transition-colors mt-0.5",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
