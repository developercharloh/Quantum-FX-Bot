import { useLocation } from "wouter";
import { Gift } from "lucide-react";

export function QuantumVaultFAB() {
  const [, navigate] = useLocation();

  return (
    <button
      onClick={() => navigate("/vault")}
      aria-label="Quantum Vault"
      className="lg:hidden fixed z-50 bottom-24 right-4 flex flex-col items-center gap-1 group"
      style={{ right: "max(1rem, calc(50% - 215px + 1rem))" }}
    >
      <span
        className="relative flex items-center justify-center w-14 h-14 rounded-2xl animate-[vault-float_3s_ease-in-out_infinite]"
        style={{
          background: "linear-gradient(145deg, #fde68a, #f59e0b 45%, #b45309)",
          boxShadow:
            "0 0 18px 4px rgba(245, 158, 11, 0.55), 0 0 40px 10px rgba(245, 158, 11, 0.25), inset 0 1px 2px rgba(255,255,255,0.6)",
        }}
      >
        <span className="absolute inset-0 rounded-2xl animate-[vault-pulse_2.4s_ease-in-out_infinite] bg-amber-400/40 blur-md" />
        <Gift className="w-7 h-7 text-amber-950 relative drop-shadow-sm" strokeWidth={2.25} />
      </span>
      <span className="text-[10px] font-semibold tracking-wide text-amber-400 drop-shadow-[0_0_6px_rgba(245,158,11,0.65)]">
        Quantum Vault
      </span>
    </button>
  );
}
