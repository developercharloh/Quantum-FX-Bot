import { useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

export const ALARM_KEY = "qfx_login_alarm";

const API_BASE =
  typeof window !== "undefined" && window.location.hostname !== "localhost"
    ? "https://quantum-fx-bot.site"
    : "";

// ─── Golden Bell Sound ────────────────────────────────────────────────────────
// AudioContext is created on user gesture (toggle-on click) so the browser
// never blocks it. We resume() before each play in case it was suspended.
async function playGoldenBells(ctx: AudioContext) {
  if (ctx.state === "suspended") await ctx.resume();

  // Reverb: delay + feedback loop
  const delay    = ctx.createDelay(0.5);
  const feedback = ctx.createGain();
  const wetGain  = ctx.createGain();
  delay.delayTime.value = 0.28;
  feedback.gain.value   = 0.38;
  wetGain.gain.value    = 0.30;
  delay.connect(feedback);
  feedback.connect(delay);
  delay.connect(wetGain);
  wetGain.connect(ctx.destination);

  // Master dry + send to reverb
  const master = ctx.createGain();
  master.gain.value = 0.75;
  master.connect(ctx.destination);
  master.connect(delay);

  // Fade everything out by second 30
  const t0 = ctx.currentTime;
  master.gain.setValueAtTime(0.75, t0 + 26);
  master.gain.linearRampToValueAtTime(0, t0 + 30);
  wetGain.gain.setValueAtTime(0.30, t0 + 26);
  wetGain.gain.linearRampToValueAtTime(0, t0 + 30);

  // Inharmonic partials of a bronze church bell
  const partials = [
    { r: 0.5,  g: 0.22 },
    { r: 1.0,  g: 1.00 },
    { r: 1.51, g: 0.75 },
    { r: 1.93, g: 0.50 },
    { r: 2.35, g: 0.32 },
    { r: 3.16, g: 0.18 },
  ];

  function strikeBell(t: number, freq: number, vol = 1.0) {
    partials.forEach(({ r, g }) => {
      const osc = ctx.createOscillator();
      const gn  = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq * r;
      gn.gain.setValueAtTime(0, t0 + t);
      gn.gain.linearRampToValueAtTime(g * vol * 0.9, t0 + t + 0.004);
      gn.gain.exponentialRampToValueAtTime(0.0001, t0 + t + 4.5);
      osc.connect(gn);
      gn.connect(master);
      osc.start(t0 + t);
      osc.stop(t0 + t + 4.6);
    });
  }

  // Pentatonic scale: C5 E5 G5 A5 C6
  const [C5, E5, G5, A5, C6] = [523.25, 659.25, 783.99, 880.0, 1046.5];

  // 4 ascending groups + final chord
  strikeBell(0.0,  C5, 0.7);  strikeBell(1.0,  E5, 0.8);  strikeBell(2.0,  G5, 0.9);
  strikeBell(5.5,  E5, 0.8);  strikeBell(6.5,  G5, 0.9);  strikeBell(7.5,  A5, 1.0);
  strikeBell(11.0, G5, 0.9);  strikeBell(12.0, A5, 1.0);  strikeBell(13.0, C6, 1.0);
  strikeBell(16.5, C6, 0.9);  strikeBell(17.5, A5, 0.8);  strikeBell(18.5, G5, 0.7);
  // Final chord
  strikeBell(22.5, C5, 0.65); strikeBell(22.5, E5, 0.65);
  strikeBell(22.5, G5, 0.65); strikeBell(22.5, C6, 0.65);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useLoginAlarm() {
  const { toast } = useToast();
  const toastRef  = useRef(toast);
  const esRef     = useRef<EventSource | null>(null);
  const ctxRef    = useRef<AudioContext | null>(null);   // created on user gesture
  const enabledRef = useRef(localStorage.getItem(ALARM_KEY) === "1");

  useEffect(() => { toastRef.current = toast; }, [toast]);

  function connect() {
    if (esRef.current) return;
    const es = new EventSource(`${API_BASE}/api/admin/login-events`);

    es.onmessage = (e) => {
      try {
        const { name, email } = JSON.parse(e.data) as { name: string; email: string };
        if (ctxRef.current) {
          playGoldenBells(ctxRef.current).catch(() => {});
        }
        toastRef.current({
          title: "🔔 User Logged In",
          description: `${name} (${email})`,
          duration: 10000,
        });
      } catch {
        // malformed event
      }
    };

    es.onerror = () => {
      es.close();
      esRef.current = null;
      if (enabledRef.current) {
        setTimeout(() => { if (enabledRef.current) connect(); }, 6000);
      }
    };

    esRef.current = es;
  }

  function disconnect() {
    esRef.current?.close();
    esRef.current = null;
    ctxRef.current?.close();
    ctxRef.current = null;
  }

  useEffect(() => {
    // If alarm was already ON from a previous session, we can't create
    // AudioContext without a gesture — connect the SSE but sound will
    // only work after the user taps the toggle off→on again.
    if (enabledRef.current) connect();

    const onAlarmChange = (e: Event) => {
      const on = (e as CustomEvent<boolean>).detail;
      enabledRef.current = on;
      if (on) {
        // This fires synchronously inside the toggle click → valid user gesture
        // so AudioContext creation is always allowed here.
        try {
          ctxRef.current?.close();
          ctxRef.current = new AudioContext();
        } catch { /* ignore */ }
        connect();
      } else {
        disconnect();
      }
    };

    window.addEventListener("qfxAlarmChange", onAlarmChange);
    return () => {
      window.removeEventListener("qfxAlarmChange", onAlarmChange);
      disconnect();
    };
  }, []);
}
