import { useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

export const ALARM_KEY = "qfx_login_alarm";

const API_BASE =
  typeof window !== "undefined" && window.location.hostname !== "localhost"
    ? "https://quantum-fx-bot.site"
    : "";

// ─── Note frequencies (Hz) ───────────────────────────────────────────────────
const N = {
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00,
  A4: 440.00, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99,
  A5: 880.00, B5: 987.77, C6: 1046.50, E6: 1318.51,
};

// ─── Reverb (delay + feedback) ───────────────────────────────────────────────
function makeReverb(ctx: AudioContext) {
  const dly = ctx.createDelay(0.6);
  const fb  = ctx.createGain();
  const wet = ctx.createGain();
  dly.delayTime.value = 0.32;
  fb.gain.value       = 0.40;
  wet.gain.value      = 0.22;
  dly.connect(fb); fb.connect(dly); dly.connect(wet); wet.connect(ctx.destination);

  const dry = ctx.createGain();
  dry.gain.value = 0.88;
  dry.connect(ctx.destination);
  dry.connect(dly);
  return { dry, wet };
}

function piano(
  ctx: AudioContext, dest: AudioNode,
  t0: number, t: number, freq: number, vol = 1.0
) {
  const partials = [
    { r: 1.000, g: 1.00, dur: 6.0 },
    { r: 2.001, g: 0.55, dur: 4.0 },
    { r: 3.003, g: 0.28, dur: 2.5 },
    { r: 4.006, g: 0.14, dur: 1.8 },
    { r: 5.012, g: 0.07, dur: 1.2 },
    { r: 6.020, g: 0.03, dur: 0.7 },
  ];
  partials.forEach(({ r, g, dur }) => {
    const osc = ctx.createOscillator();
    const gn  = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq * r;
    gn.gain.setValueAtTime(0, t0 + t);
    gn.gain.linearRampToValueAtTime(g * vol * 0.72, t0 + t + 0.004);
    gn.gain.exponentialRampToValueAtTime(0.0001, t0 + t + dur);
    osc.connect(gn); gn.connect(dest);
    osc.start(t0 + t); osc.stop(t0 + t + dur + 0.05);
  });
}

function trumpet(
  ctx: AudioContext, dest: AudioNode,
  t0: number, t: number, freq: number, dur: number, vol = 1.0
) {
  const partials = [
    { r: 1, g: 0.22 }, { r: 2, g: 0.88 }, { r: 3, g: 0.78 },
    { r: 4, g: 0.62 }, { r: 5, g: 0.46 }, { r: 6, g: 0.32 },
    { r: 7, g: 0.18 }, { r: 8, g: 0.09 },
  ];
  const att = Math.min(0.09, dur * 0.18);
  const rel = Math.min(0.18, dur * 0.22);
  const hold = Math.max(att + 0.01, dur - rel);
  partials.forEach(({ r, g }) => {
    const osc = ctx.createOscillator();
    const gn  = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq * r;
    gn.gain.setValueAtTime(0, t0 + t);
    gn.gain.linearRampToValueAtTime(g * vol * 0.42, t0 + t + att);
    gn.gain.setValueAtTime(g * vol * 0.42, t0 + t + hold);
    gn.gain.linearRampToValueAtTime(0, t0 + t + dur);
    osc.connect(gn); gn.connect(dest);
    osc.start(t0 + t); osc.stop(t0 + t + dur + 0.05);
  });
}

async function playPianoTrumpet(ctx: AudioContext) {
  // Always try to resume — works whether context was suspended or running
  if (ctx.state === "suspended") await ctx.resume();
  if (ctx.state !== "running") return;

  const { dry, wet } = makeReverb(ctx);
  const t0 = ctx.currentTime;

  dry.gain.setValueAtTime(0.88, t0 + 55);
  dry.gain.linearRampToValueAtTime(0, t0 + 63);
  wet.gain.setValueAtTime(0.22, t0 + 55);
  wet.gain.linearRampToValueAtTime(0, t0 + 63);

  const P = (t: number, f: number, v = 1.0) => piano(ctx, dry, t0, t, f, v);
  const T = (t: number, f: number, d: number, v = 1.0) => trumpet(ctx, dry, t0, t, f, d, v);

  const {
    C4, D4, E4, F4, G4, A4, B4,
    C5, D5, E5, F5, G5, A5, B5, C6, E6,
  } = N;

  P( 0.0, C4, 0.55); P( 0.6, E4, 0.60); P( 1.2, G4, 0.65);
  P( 2.2, C5, 0.80); P( 2.7, B4, 0.72); P( 3.2, A4, 0.70); P( 3.7, G4, 0.68);
  P( 4.8, E4, 0.68); P( 5.3, G4, 0.75); P( 5.8, A4, 0.80);
  P( 6.8, C5, 0.88); P( 7.3, D5, 0.82); P( 7.8, E5, 0.90);
  P( 9.0, C4, 0.72); P( 9.0, E4, 0.70); P( 9.0, G4, 0.70);
  P(10.4, G4, 0.80); P(10.9, A4, 0.82); P(11.4, B4, 0.84); P(12.3, C5, 0.90);
  P(13.0, C5, 0.80); P(13.4, B4, 0.75); P(13.8, A4, 0.72); P(14.2, G4, 0.70);
  P(15.1, E4, 0.78); P(15.5, F4, 0.72); P(15.9, G4, 0.78);
  T(16.6, G4, 1.2, 0.80);
  T(17.9, A4, 1.0, 0.85);
  T(19.0, C5, 1.6, 0.90);
  P(20.8, E5, 0.88); P(21.3, D5, 0.82); P(21.8, C5, 0.80); P(22.3, B4, 0.75);
  T(23.2, E5, 1.0, 0.88);
  T(24.3, G5, 1.5, 0.95);
  P(23.2, C5, 0.78); P(23.7, D5, 0.80); P(24.2, E5, 0.85);
  P(26.0, C4, 0.68); P(26.0, G4, 0.68);
  P(26.6, E5, 0.88); P(27.1, D5, 0.84); P(27.6, C5, 0.80); P(27.9, B4, 0.75);
  P(28.2, G4, 0.68); P(28.2, C4, 0.68);
  P(28.8, A4, 0.84); P(29.3, G4, 0.80);
  T(26.3, C5, 0.85, 0.82);
  T(27.3, E5, 0.85, 0.88);
  T(28.3, G5, 1.5, 1.00);
  P(30.0, C5, 0.80); P(30.25, D5, 0.82); P(30.5, E5, 0.84);
  P(30.75, F5, 0.86); P(31.0, G5, 0.92);
  T(31.6, A5, 0.75, 0.88);
  T(32.5, G5, 0.75, 0.84);
  T(33.4, E5, 1.3, 0.84);
  P(34.8, C4, 0.80); P(34.8, E4, 0.78); P(34.8, G4, 0.78); P(34.8, C5, 0.88);
  T(34.8, E5, 1.9, 0.88);
  P(36.8, G4, 0.78); P(36.8, B4, 0.78); P(36.8, D5, 0.80);
  T(36.8, G5, 1.6, 0.84);
  P(38.4, A4, 0.72); P(38.4, C5, 0.72); P(38.4, E5, 0.80);
  T(38.4, A5, 1.1, 0.90);
  P(40.0, C5, 0.90); P(40.2, D5, 0.90); P(40.4, E5, 0.92);
  P(40.6, F5, 0.92); P(40.8, G5, 0.95); P(41.0, A5, 0.95);
  P(41.2, B5, 0.98); P(41.5, C6, 1.00);
  T(41.8, C5, 0.30, 1.00); T(42.2, E5, 0.30, 1.00); T(42.6, G5, 0.30, 1.00);
  T(43.0, C6, 1.6,  1.00);
  P(44.7, E5, 0.92); P(44.7, G5, 0.90);
  P(45.1, C5, 0.90); P(45.1, E5, 0.90);
  T(45.6, E6, 2.2, 0.92);
  P(47.8, C6, 1.00); P(48.1, B5, 0.94); P(48.4, A5, 0.92);
  P(48.7, G5, 0.90); P(49.0, F5, 0.86); P(49.3, E5, 0.84);
  P(49.6, D5, 0.82); P(49.9, C5, 0.80);
  T(50.2, G5, 0.95, 0.90);
  T(51.2, E5, 0.80, 0.86);
  T(52.1, C5, 0.95, 0.90);
  P(53.2, C4, 1.00); P(53.2, E4, 0.95); P(53.2, G4, 0.95);
  P(53.2, C5, 1.00); P(53.2, E5, 0.95); P(53.2, G5, 0.95);
  P(53.3, C6, 1.00);
  T(53.2, C5, 6.0, 0.95);
  T(53.2, E5, 5.5, 0.88);
  T(53.2, G5, 5.0, 0.85);
}

// ─── Ensure AudioContext is ready ─────────────────────────────────────────────
// Browsers suspend AudioContext created outside a user gesture.
// We create it eagerly, then resume it on the very first interaction.
// After that first resume, all subsequent plays work without a gesture.
function ensureAudioContext(ctxRef: React.MutableRefObject<AudioContext | null>) {
  if (!ctxRef.current) {
    try { ctxRef.current = new AudioContext(); } catch { return; }
  }
  const ctx = ctxRef.current;
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useLoginAlarm() {
  const { toast }  = useToast();
  const toastRef   = useRef(toast);
  const esRef      = useRef<EventSource | null>(null);
  const ctxRef     = useRef<AudioContext | null>(null);
  const enabledRef = useRef(localStorage.getItem(ALARM_KEY) === "1");
  const unlockedRef = useRef(false);

  useEffect(() => { toastRef.current = toast; }, [toast]);

  // Create AudioContext eagerly. Browsers suspend it until a user gesture —
  // the interaction listener below resumes it on the first click/key.
  useEffect(() => {
    try { ctxRef.current = new AudioContext(); } catch { /* ignore */ }

    // Unlock audio on first any interaction — runs once
    const unlock = () => {
      if (unlockedRef.current) return;
      unlockedRef.current = true;
      ctxRef.current?.resume().catch(() => {});
      document.removeEventListener("click",      unlock, true);
      document.removeEventListener("pointerdown", unlock, true);
      document.removeEventListener("keydown",    unlock, true);
      document.removeEventListener("touchstart", unlock, true);
    };
    document.addEventListener("click",       unlock, true);
    document.addEventListener("pointerdown", unlock, true);
    document.addEventListener("keydown",     unlock, true);
    document.addEventListener("touchstart",  unlock, true);

    return () => {
      document.removeEventListener("click",      unlock, true);
      document.removeEventListener("pointerdown", unlock, true);
      document.removeEventListener("keydown",    unlock, true);
      document.removeEventListener("touchstart", unlock, true);
    };
  }, []);

  function connect() {
    if (esRef.current) return;
    const token = localStorage.getItem("qfx_admin_token") ?? "";
    const es = new EventSource(`${API_BASE}/api/admin/login-events?token=${encodeURIComponent(token)}`);

    es.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data) as {
          name: string; email: string; accountUid: string;
          userId: number; country: string; ip: string;
        };

        // Play alarm — always attempt resume first so it works even when
        // the browser tab has been in the background for a while.
        if (enabledRef.current && ctxRef.current) {
          const ctx = ctxRef.current;
          ctx.resume()
            .then(() => playPianoTrumpet(ctx))
            .catch(() => {});
        }

        window.dispatchEvent(new CustomEvent("qfxLoginNotification", { detail: payload }));
        toastRef.current({
          title: "🔔 User Logged In",
          description: `${payload.name} (${payload.email}) · ${payload.country}`,
          duration: 10000,
        });
      } catch { /* malformed event */ }
    };

    es.onerror = () => {
      es.close();
      esRef.current = null;
      setTimeout(() => { if (enabledRef.current) connect(); }, 6000);
    };

    esRef.current = es;
  }

  function disconnect() {
    esRef.current?.close();
    esRef.current = null;
  }

  useEffect(() => {
    // Always connect SSE so we get login notifications regardless of alarm state.
    // Sound only plays if alarm is enabled — SSE keeps notification bell working.
    connect();

    const onAlarmChange = (e: Event) => {
      const on = (e as CustomEvent<boolean>).detail;
      enabledRef.current = on;
      if (on) {
        // This runs inside a click handler — guaranteed user gesture.
        // Resume the existing context (no need to recreate).
        if (ctxRef.current) {
          ctxRef.current.resume().catch(() => {});
          unlockedRef.current = true;
        }
        connect();
      }
    };

    window.addEventListener("qfxAlarmChange", onAlarmChange);
    return () => {
      window.removeEventListener("qfxAlarmChange", onAlarmChange);
      disconnect();
      ctxRef.current?.close().catch(() => {});
      ctxRef.current = null;
    };
  }, []);
}
