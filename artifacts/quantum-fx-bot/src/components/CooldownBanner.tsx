import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

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
  const [open, setOpen] = useState(false);

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
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 mt-2 cursor-pointer active:scale-[0.98] transition-transform"
      >
        <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span className="text-amber-400 font-mono text-sm font-semibold tracking-wider">
          {formatCountdown(remaining)}
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[320px] rounded-2xl text-center">
          <DialogHeader className="items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-amber-500/15 flex items-center justify-center">
              <Clock className="w-7 h-7 text-amber-400" />
            </div>
            <DialogTitle className="text-base">Bot is Cooling Down</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
              Your bot is currently scanning the market to filter out false
              signals and lock in only the highest-accuracy trades. This
              cooldown phase is where the real work happens — ensuring every
              trade entry is perfectly timed to maximise your profits and keep
              losses at an absolute minimum. Sit tight, your next trade is
              loading.
            </DialogDescription>
          </DialogHeader>
          <p className="text-amber-400 font-mono text-xl font-bold mt-1">
            {formatCountdown(remaining)}
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
