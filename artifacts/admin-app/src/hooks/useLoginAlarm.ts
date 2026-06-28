import { useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

export const ALARM_KEY = "qfx_login_alarm";

const API_BASE =
  typeof window !== "undefined" && window.location.hostname !== "localhost"
    ? "https://quantum-fx-bot.site"
    : "";

function playBeep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(660, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.7);
  } catch {
    // AudioContext not available
  }
}

export function useLoginAlarm() {
  const { toast } = useToast();
  const esRef = useRef<EventSource | null>(null);
  const enabledRef = useRef(localStorage.getItem(ALARM_KEY) === "1");

  function connect() {
    if (esRef.current) return;
    const es = new EventSource(`${API_BASE}/api/admin/login-events`);

    es.onmessage = (e) => {
      try {
        const { name, email } = JSON.parse(e.data) as { name: string; email: string };
        playBeep();
        toast({
          title: "🔔 User Logged In",
          description: `${name} (${email})`,
        });
      } catch {
        // malformed event
      }
    };

    es.onerror = () => {
      es.close();
      esRef.current = null;
      if (enabledRef.current) {
        setTimeout(() => { if (enabledRef.current) connect(); }, 5000);
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
      const enabled = (e as CustomEvent<boolean>).detail;
      enabledRef.current = enabled;
      if (enabled) connect();
      else disconnect();
    };

    window.addEventListener("qfxAlarmChange", onAlarmChange);
    return () => {
      window.removeEventListener("qfxAlarmChange", onAlarmChange);
      disconnect();
    };
  }, []);
}
