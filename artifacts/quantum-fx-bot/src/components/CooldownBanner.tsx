import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface Props {
  cooldownUntil: string | null | undefined;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "00:00:00";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return [h, m, s].map(n => String(n).padStart(2, "0")).join(":");
}

export function CooldownBanner({ cooldownUntil }: Props) {
  const [remaining, setRemaining] = useState<number>(() =>
    cooldownUntil ? Math.max(0, new Date(cooldownUntil).getTime() - Date.now()) : 0
  );

  useEffect(() => {
    if (!cooldownUntil) return;
    const tick = () => {
      const ms = Math.max(0, new Date(cooldownUntil).getTime() - Date.now());
      setRemaining(ms);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [cooldownUntil]);

  if (!cooldownUntil || remaining <= 0) return null;

  return (
    <div className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 mt-2">
      <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
      <span className="text-amber-400 font-mono text-sm font-semibold tracking-wider">
        {formatCountdown(remaining)}
      </span>
    </div>
  );
}
