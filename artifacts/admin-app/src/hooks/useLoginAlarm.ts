import { useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

export const ALARM_KEY = "qfx_login_alarm";

const API_BASE =
  typeof window !== "undefined" && window.location.hostname !== "localhost"
    ? "https://quantum-fx-bot.site"
    : "";

function playAlarm() {
  try {
    const ctx = new AudioContext();
    // Three loud sharp beeps
    [0, 0.28, 0.56].forEach((delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "square";
      osc.frequency.setValueAtTime(960, ctx.currentTime + delay);
      gain.gain.setValueAtTime(1.5, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.22);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.22);
    });
  } catch {
    // AudioContext not available
  }
}

export function useLoginAlarm() {
  const { toast } = useToast();
  const toastRef = useRef(toast);
  const esRef = useRef<EventSource | null>(null);
  const enabledRef = useRef(localStorage.getItem(ALARM_KEY) === "1");

  // Keep toast ref current so callbacks never use a stale closure
  useEffect(() => { toastRef.current = toast; }, [toast]);

  function connect() {
    if (esRef.current) return;
    const url = `${API_BASE}/api/admin/login-events`;
    const es = new EventSource(url);

    es.onmessage = (e) => {
      try {
        const { name, email } = JSON.parse(e.data) as { name: string; email: string };
        playAlarm();
        toastRef.current({
          title: "🔔 User Logged In",
          description: `${name} (${email})`,
          duration: 8000,
        });
      } catch {
        // malformed event — ignore
      }
    };

    es.onerror = () => {
      es.close();
      esRef.current = null;
      // Auto-reconnect after 6s if still enabled
      if (enabledRef.current) {
        setTimeout(() => { if (enabledRef.current) connect(); }, 6000);
      }
    };

    esRef.current = es;
  }

  function disconnect() {
    esRef.current?.close();
    esRef.current = null;
  }

  useEffect(() => {
    if (enabledRef.current) connect();

    const onAlarmChange = (e: Event) => {
      const on = (e as CustomEvent<boolean>).detail;
      enabledRef.current = on;
      if (on) connect();
      else disconnect();
    };

    window.addEventListener("qfxAlarmChange", onAlarmChange);
    return () => {
      window.removeEventListener("qfxAlarmChange", onAlarmChange);
      disconnect();
    };
  }, []);
}
