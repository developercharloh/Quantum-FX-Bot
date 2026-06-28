import { useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

export const ALARM_KEY = "qfx_login_alarm";

export function isAlarmEnabled(): boolean {
  const v = localStorage.getItem(ALARM_KEY);
  return v === null || v === "1";
}

const API_BASE =
  typeof window !== "undefined" && window.location.hostname !== "localhost"
    ? "https://quantum-fx-bot.site"
    : "";

// ─── Note frequencies (Hz) ───────────────────────────────────────────────────
const N = {
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00,
  A4: 440.00, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99,
  A5: 880.00, B5: 987.77, C6: 1046.50,
};

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

function trumpet(ctx: AudioContext, dest: AudioNode, t0: number, t: number, freq: number, dur: number, vol = 1.0) {
  const partials = [
    { r: 1, g: 0.22 }, { r: 2, g: 0.88 }, { r: 3, g: 0.78 },
    { r: 4, g: 0.62 }, { r: 5, g: 0.46 }, { r: 6, g: 0.32 },
    { r: 7, g: 0.18 }, { r: 8, g: 0.09 },
  ];
  const att  = Math.min(0.09, dur * 0.18);
  const rel  = Math.min(0.18, dur * 0.22);
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

// ─── Silent Night — trumpet, ~90 seconds ─────────────────────────────────────
// Key: C major  |  Tempo: BPM 50 (1.2 s per beat)  |  Time: 3/4
async function playSilentNight(ctx: AudioContext) {
  if (ctx.state === "suspended") {
    try { await ctx.resume(); } catch { return; }
  }
  if (ctx.state !== "running") return;

  const { dry, wet } = makeReverb(ctx);
  const t0 = ctx.currentTime;
  const BPM = 50;
  const b = 60 / BPM; // 1.2 s per beat

  // Fade the whole thing out over the last ~8 seconds (~92 s total)
  dry.gain.setValueAtTime(0.88, t0 + 84);
  dry.gain.linearRampToValueAtTime(0, t0 + 92);
  wet.gain.setValueAtTime(0.22, t0 + 84);
  wet.gain.linearRampToValueAtTime(0, t0 + 92);

  // T(beatOffset, freq, beatDuration, volume)
  const T = (bt: number, freq: number, bd: number, vol = 0.88) =>
    trumpet(ctx, dry, t0, bt * b, freq, bd * b, vol);

  const { E4, G4, A4, B4, C5, D5, E5, G5 } = N;

  // ── VERSE 1 ────────────────────────────────────────────────────────────────

  // "Silent night, holy night"
  T(0,   G4, 1.5);   T(1.5, A4, 0.5);  T(2,   G4, 1.0);  T(3,   E4, 3.0);
  // "All is calm, all is bright"
  T(6,   G4, 1.5);   T(7.5, A4, 0.5);  T(8,   G4, 1.0);  T(9,   E4, 3.0);

  // "Round yon Virgin, Mother and Child"
  T(12,  D5, 3.0);
  T(15,  D5, 1.5);   T(16.5, B4, 0.5); T(17,  G4, 1.0);  T(18,  G4, 3.0);

  // "Holy Infant so tender and mild"
  T(21,  C5, 3.0);
  T(24,  C5, 1.5);   T(25.5, G4, 0.5); T(26,  E4, 1.0);  T(27,  E4, 3.0);

  // "Sleep in heavenly peace"
  T(30,  D5, 2.0);   T(32,  D5, 1.0);
  T(33,  C5, 1.5);   T(34.5, A4, 0.5); T(35,  G4, 1.0);  T(36,  G4, 3.0, 0.92);

  // "Sleep in heavenly peace" (repeat — climactic ascent)
  T(39,  G4, 1.5, 0.95); T(40.5, A4, 0.5, 0.95); T(41,  G4, 1.0, 0.95);
  T(42,  D5, 2.0, 1.00); T(44,  E5, 1.0, 1.00);
  T(45,  D5, 1.5, 0.96); T(46.5, B4, 0.5, 0.92); T(47,  G4, 1.0, 0.90);
  T(48,  E5, 5.0, 1.00); // long final hold — verse 1 ends ~beat 53 (63.6 s)

  // ── VERSE 2 ────────────────────────────────────────────────────────────────
  const v = 53; // verse 2 starts at beat 53

  // "Silent night, holy night"
  T(v+0,  G4, 1.5, 0.95); T(v+1.5, A4, 0.5, 0.95);
  T(v+2,  G4, 1.0, 0.95); T(v+3,   E4, 3.0, 0.95);

  // "All is calm, all is bright"
  T(v+6,  G4, 1.5, 0.95); T(v+7.5, A4, 0.5, 0.95);
  T(v+8,  G4, 1.0, 0.95); T(v+9,   E4, 3.0, 0.95);

  // Triumphant closing — soaring to G5
  T(v+12, D5, 3.0, 1.00); // beat 65
  T(v+15, E5, 3.0, 1.00); // beat 68
  T(v+18, G5, 4.0, 1.00); // beat 71 — highest point
  T(v+22, E5, 2.5, 0.92); // beat 73 — settling
  T(v+24.5, C5, 5.0, 0.80); // beat 75.5 — final resolve, fades out
  // beat 80.5 × 1.2 s = 96.6 s — fade-out covers the rest
}

// ─── Shared AudioContext ──────────────────────────────────────────────────────
let sharedCtx: AudioContext | null = null;

export function getAudioContext(): AudioContext | null {
  if (!sharedCtx || sharedCtx.state === "closed") {
    try { sharedCtx = new AudioContext(); } catch { return null; }
  }
  return sharedCtx;
}

export function unlockAudio(): void {
  const ctx = getAudioContext();
  if (ctx && ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
}

export function playTestAlarm(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  ctx.resume().then(() => playSilentNight(ctx)).catch(() => {});
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useLoginAlarm() {
  const { toast }  = useToast();
  const toastRef   = useRef(toast);
  const esRef      = useRef<EventSource | null>(null);
  const enabledRef = useRef(isAlarmEnabled());

  useEffect(() => { toastRef.current = toast; }, [toast]);

  // Unlock AudioContext on the first user interaction
  useEffect(() => {
    const unlock = () => {
      unlockAudio();
      document.removeEventListener("click",       unlock, true);
      document.removeEventListener("pointerdown", unlock, true);
      document.removeEventListener("keydown",     unlock, true);
      document.removeEventListener("touchstart",  unlock, true);
    };
    document.addEventListener("click",       unlock, true);
    document.addEventListener("pointerdown", unlock, true);
    document.addEventListener("keydown",     unlock, true);
    document.addEventListener("touchstart",  unlock, true);
    return () => {
      document.removeEventListener("click",       unlock, true);
      document.removeEventListener("pointerdown", unlock, true);
      document.removeEventListener("keydown",     unlock, true);
      document.removeEventListener("touchstart",  unlock, true);
    };
  }, []);

  function ring() {
    if (!enabledRef.current) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    playSilentNight(ctx).catch(() => {});
  }

  // Listen for messages from the Service Worker.
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const onSwMessage = (event: MessageEvent) => {
      if (event.data?.type === "QFX_PLAY_SOUND") ring();
    };
    navigator.serviceWorker.addEventListener("message", onSwMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onSwMessage);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function connect() {
    if (esRef.current) return;
    const token = localStorage.getItem("qfx_admin_token") ?? "";
    const es = new EventSource(`${API_BASE}/api/admin/login-events?token=${encodeURIComponent(token)}`);

    es.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data) as {
          type?: string;
          name: string; email: string; accountUid?: string;
          userId: number; country?: string; ip?: string;
          amount?: string; paymentMethod?: string;
        };

        ring();

        if (!payload.type || payload.type === "login") {
          window.dispatchEvent(new CustomEvent("qfxLoginNotification", { detail: payload }));
          toastRef.current({
            title: "🔔 User Logged In",
            description: `${payload.name} (${payload.email}) · ${payload.country ?? ""}`,
            duration: 10000,
          });
        } else if (payload.type === "deposit") {
          toastRef.current({
            title: "💰 Deposit Request",
            description: `${payload.name} · $${payload.amount} via ${payload.paymentMethod}`,
            duration: 12000,
          });
        } else if (payload.type === "withdrawal") {
          toastRef.current({
            title: "💸 Withdrawal Request",
            description: `${payload.name} · $${payload.amount} via ${payload.paymentMethod}`,
            duration: 12000,
          });
        }
      } catch { /* malformed event */ }
    };

    es.onerror = () => {
      es.close();
      esRef.current = null;
      setTimeout(connect, 6000);
    };

    esRef.current = es;
  }

  useEffect(() => {
    connect();

    const onAlarmChange = (e: Event) => {
      const on = (e as CustomEvent<boolean>).detail;
      enabledRef.current = on;
      if (on) unlockAudio();
    };

    window.addEventListener("qfxAlarmChange", onAlarmChange);
    return () => {
      window.removeEventListener("qfxAlarmChange", onAlarmChange);
      esRef.current?.close();
      esRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
