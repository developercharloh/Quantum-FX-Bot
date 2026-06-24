import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

interface LayoutProps {
  children: ReactNode;
  showNav?: boolean;
}

export function Layout({ children, showNav = false }: LayoutProps) {
  return (
    <div className="max-w-[430px] mx-auto min-h-[100dvh] bg-background text-foreground relative overflow-x-hidden shadow-2xl">
      <div className={showNav ? "pb-[72px]" : ""}>
        {children}
      </div>
      {showNav && <BottomNav />}
    </div>
  );
}
