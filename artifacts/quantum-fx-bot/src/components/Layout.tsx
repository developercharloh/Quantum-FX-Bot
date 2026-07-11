import { useState, ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { QuantumVaultFAB } from "./QuantumVaultFAB";
import { SideNav } from "./SideNav";
import { Sun, Moon } from "lucide-react";

/** Mobile-only floating theme toggle (hidden on desktop — SideNav has its own). */
function ThemeToggle() {
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
      className="lg:hidden fixed top-4 z-[60] w-9 h-9 rounded-full bg-card border border-border/40 flex items-center justify-center shadow-md hover:bg-muted transition-colors"
      style={{ right: "max(1rem, calc(50% - 215px + 1rem))" }}
    >
      {isDark
        ? <Sun  className="w-4 h-4 text-amber-400" />
        : <Moon className="w-4 h-4 text-primary" />}
    </button>
  );
}

interface LayoutProps {
  children: ReactNode;
  showNav?: boolean;
}

export function Layout({ children, showNav = false }: LayoutProps) {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      {/* Desktop sidebar — hidden on mobile */}
      <SideNav />

      {/* Content area — offset by sidebar width on desktop */}
      <div className="lg:ml-[240px]">
        <div className="max-w-[430px] lg:max-w-none mx-auto relative overflow-x-hidden shadow-2xl lg:shadow-none min-h-[100dvh]">
          <ThemeToggle />
          <div className={showNav ? "pb-[72px] lg:pb-6" : ""}>
            {children}
          </div>
          {showNav && <QuantumVaultFAB />}
          {showNav && <BottomNav />}
        </div>
      </div>
    </div>
  );
}
