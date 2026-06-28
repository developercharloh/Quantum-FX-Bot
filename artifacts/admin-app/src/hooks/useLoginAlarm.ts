import { useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

export const ALARM_KEY = "qfx_login_alarm";

const API_BASE =
  typeof window !== "undefined" && window.location.hostname !== "localhost"
    ? "https://quantum-fx-bot.site"
    : "";

// ─── Golden Bell Sound ────────────────────────────────────────────────────────
// Each bell uses 6 inharmonic partials that match real bronze bell physics.
// A reverb loop (delay + feedback) adds warmth and space.
function playGoldenBells() {
  try {
    const ctx = new AudioContext();

    // Reverb: short delay with gentle feedback
    const delay    = ctx.createDelay(0.5);
    const feedback = ctx.createGain();
    const wetGain  = ctx.createGain();
    delay.delayTime.value = 0.28;
    feedback.gain.value   = 0.38;
    wetGain.gain.value    = 0.32;
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(wetGain);
    wetGain.connect(ctx.destination);

    // Master dry output
    const master = ctx.createGain();
    master.gain.value = 0.75;
    master.connect(ctx.destination);
    master.connect(delay);

    // Fade out everything at second 28-30
    master.gain.setValueAtTime(0.75, ctx.currentTime + 26);
    master.gain.linearRampToValueAtTime(0, ctx.currentTime + 30);
    wetGain.gain.setValueAtTime(0.32, ctx.currentTime + 26);
    wetGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 30);

    // Inharmonic partials — ratios tuned to a bronze church bell
    const partials = [
      { r: 0.5,   g: 0.22 },   // hum  (sub-octave)
      { r: 1.0,   g: 1.00 },   // prime (fundamental)
      { r: 1.51,  g: 0.75 },   // tierce (minor third above octave)
      { r: 1.93,  g: 0.50 },   // quint
      { r: 2.35,  g: 0.32 },   // nominal (octave)
      { r: 3.16,  g: 0.18 },   // superquint
    ];

    function strikeBell(t: number, freq: number, vol = 1.0) {
      partials.forEach(({ r, g }) => {
        const osc = ctx.createOscillator();
        const gn  = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq * r;

        // Sharp metallic attack, long warm decay
        gn.gain.setValueAtTime(0, ctx.currentTime + t);
        gn.gain.linearRampToValueAtTime(g * vol * 0.9, ctx.currentTime + t + 0.004);
        gn.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 4.5);

        osc.connect(gn);
        gn.connect(master);
        osc.start(ctx.currentTime + t);
        osc.stop(ctx.currentTime + t + 4.6);
      });
    }

    // Pentatonic pitches: C5, E5, G5, A5, C6
    const [C5, E5, G5, A5, C6] = [523.25, 659.25, 783.99, 880.0, 1046.5];

    // Melodic sequence — 4 ascending groups + closing chord
    //   Group 1: gentle intro
    strikeBell(0.0,  C5, 0.7);
    strikeBell(1.0,  E5, 0.8);
    strikeBell(2.0,  G5, 0.9);

    //   Group 2: rising
    strikeBell(5.5,  E5, 0.8);
    strikeBell(6.5,  G5, 0.9);
    strikeBell(7.5,  A5, 1.0);

    //   Group 3: high shimmer
    strikeBell(11.0, G5, 0.9);
    strikeBell(12.0, A5, 1.0);
    strikeBell(13.0, C6, 1.0);

    //   Group 4: descending resolve
    strikeBell(16.5, C6, 0.9);
    strikeBell(17.5, A5, 0.8);
    strikeBell(18.5, G5, 0.7);

    //   Final full chord — all three together
    strikeBell(22.5, C5, 0.65);
    strikeBell(22.5, E5, 0.65);
    strikeBell(22.5, G5, 0.65);
    strikeBell(22.5, C6, 0.65);
  } catch {
    // AudioContext unavailable (blocked before user gesture) — silent fail
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useLoginAlarm() {
  const { toast } = useToast();
  const toastRef = useRef(toast);
  const esRef = useRef<EventSource | null>(null);
  const enabledRef = useRef(localStorage.getItem(ALARM_KEY) === "1");

  // Keep toast ref current so SSE callbacks never capture a stale closure
  useEffect(() => { toastRef.current = toast; }, [toast]);

  function connect() {
    if (esRef.current) return;
    const es = new EventSource(`${API_BASE}/api/admin/login-events`);

    es.onmessage = (e) => {
      try {
        const { name, email } = JSON.parse(e.data) as { name: string; email: string };
        playGoldenBells();
        toastRef.current({
          title: "🔔 User Logged In",
          description: `${name} (${email})`,
          duration: 10000,
        });
      } catch {
        // malformed event — ignore
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
