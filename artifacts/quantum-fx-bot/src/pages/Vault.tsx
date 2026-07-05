import { useLocation } from "wouter";
import { ChevronLeft, Gift } from "lucide-react";
import { Layout } from "@/components/Layout";

export default function Vault() {
  const [, navigate] = useLocation();

  return (
    <Layout>
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button
          onClick={() => navigate("/dashboard")}
          aria-label="Back"
          className="w-9 h-9 rounded-full bg-card border border-border/40 flex items-center justify-center"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold">Quantum Vault</h1>
      </div>

      <div className="flex flex-col items-center justify-center px-6 py-16 text-center gap-4">
        <div
          className="flex items-center justify-center w-20 h-20 rounded-2xl"
          style={{
            background: "linear-gradient(145deg, #fde68a, #f59e0b 45%, #b45309)",
            boxShadow: "0 0 24px 6px rgba(245, 158, 11, 0.45)",
          }}
        >
          <Gift className="w-10 h-10 text-amber-950" strokeWidth={2.25} />
        </div>
        <h2 className="text-xl font-semibold">Coming Soon</h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          Lock in your funds for a fixed term and earn interest based on your
          balance tier. Quantum Vault is on its way.
        </p>
      </div>
    </Layout>
  );
}
