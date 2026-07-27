import { Wrench } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useMaintenance } from "@/contexts/MaintenanceContext";

/**
 * Shown on top of all authenticated pages when maintenance mode is ON.
 * Clicking "Got it" logs the user out gracefully.
 */
export function MaintenanceOverlay() {
  const { maintenanceMode } = useMaintenance();
  const { token, logout } = useAuth();

  // Only show for logged-in users; the login page handles the unauthenticated case.
  if (!maintenanceMode || !token) return null;

  return (
    <div
      className="fixed inset-0 z-[999] flex flex-col items-center justify-center px-8 text-center"
      style={{ background: "linear-gradient(160deg, #0d0621 0%, #0a1117 100%)" }}
    >
      {/* Pulsing icon */}
      <div
        className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
        style={{
          background: "linear-gradient(135deg, #7c3aed33, #6366f133)",
          border: "1px solid rgba(124,58,237,0.35)",
          boxShadow: "0 0 40px 8px rgba(124,58,237,0.18)",
        }}
      >
        <Wrench className="w-9 h-9 text-violet-400" strokeWidth={1.75} />
      </div>

      <h1 className="text-2xl font-bold text-white mb-3">
        We'll be right back
      </h1>

      <p className="text-sm text-white/55 leading-relaxed max-w-xs mb-8">
        We're making a few improvements to serve you better.
        Your funds are safe — we'll be back shortly. Thank you for your patience.
      </p>

      <button
        onClick={logout}
        className="h-12 px-8 rounded-2xl text-sm font-semibold text-white transition-opacity active:opacity-70"
        style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
      >
        Got it, sign me out
      </button>

      <p className="text-[11px] text-white/25 mt-6">Quantum FX · System Maintenance</p>
    </div>
  );
}
