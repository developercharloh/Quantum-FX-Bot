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

// ─── Notes ────────────────────────────────────────────────────────────────────
const N: Record<string, number> = {
  C3: 130.81, G3: 196.00,
  C4: 261.63, E4: 329.63, G4: 392.00, A4: 440.00, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99,
};

// ─── Reverb (proven feedback-loop approach from original) ─────────────────────
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

// ─── Trumpet — identical to original working version (8 partials) ─────────────
function trumpet(ctx: AudioContext, dest: AudioNode, t0: number, t: number,
                 freq: number, dur: number, vol = 1.0) {
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

// ─── Piano — bright attack, 2 harmonics (mobile-safe: few oscillators) ────────
function piano(ctx: AudioContext, dest: AudioNode, t0: number, t: number,
               freq: number, dur: number, vol = 1.0) {
  [{ r: 1, g: 0.65 }, { r: 2, g: 0.20 }].forEach(({ r, g }) => {
    const osc = ctx.createOscillator();
    const gn  = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq * r;
    const peak = g * vol * 0.26;
    gn.gain.setValueAtTime(0, t0 + t);
    gn.gain.linearRampToValueAtTime(peak, t0 + t + 0.012);
    gn.gain.exponentialRampToValueAtTime(peak * 0.28, t0 + t + Math.min(dur * 0.5, 1.2));
    gn.gain.linearRampToValueAtTime(0, t0 + t + dur);
    osc.connect(gn); gn.connect(dest);
    osc.start(t0 + t); osc.stop(t0 + t + dur + 0.05);
  });
}

// ─── Violin — 1 sawtooth oscillator, slow bow attack ─────────────────────────
function violin(ctx: AudioContext, dest: AudioNode, t0: number, t: number,
                freq: number, dur: number, vol = 1.0) {
  const osc  = ctx.createOscillator();
  const gn   = ctx.createGain();
  osc.type = "sawtooth";
  osc.frequency.value = freq;
  const att  = Math.min(0.25, dur * 0.30);
  const peak = vol * 0.12;
  gn.gain.setValueAtTime(0, t0 + t);
  gn.gain.linearRampToValueAtTime(peak, t0 + t + att);
  gn.gain.setValueAtTime(peak, t0 + t + Math.max(att, dur - 0.14));
  gn.gain.linearRampToValueAtTime(0, t0 + t + dur);
  osc.connect(gn); gn.connect(dest);
  osc.start(t0 + t); osc.stop(t0 + t + dur + 0.05);
}

// ─── Tuba — 1 sine oscillator, deep bass ──────────────────────────────────────
function tuba(ctx: AudioContext, dest: AudioNode, t0: number, t: number,
              freq: number, dur: number, vol = 1.0) {
  const osc = ctx.createOscillator();
  const gn  = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  const att  = Math.min(0.20, dur * 0.25);
  const hold = Math.max(att + 0.01, dur - 0.20);
  const peak = vol * 0.30;
  gn.gain.setValueAtTime(0, t0 + t);
  gn.gain.linearRampToValueAtTime(peak, t0 + t + att);
  gn.gain.setValueAtTime(peak, t0 + t + hold);
  gn.gain.linearRampToValueAtTime(0, t0 + t + dur);
  osc.connect(gn); gn.connect(dest);
  osc.start(t0 + t); osc.stop(t0 + t + dur + 0.05);
}

// ─── Silent Night — orchestra, ~65 s, BPM 72 ─────────────────────────────────
// Oscillator budget: ~35 melody notes × (8 trumpet + 2 piano) = 350
// + ~8 violin + ~14 tuba = 372 total — well within mobile limits
async function playSilentNight(ctx: AudioContext) {
  if (ctx.state === "suspended") {
    try { await ctx.resume(); } catch { return; }
  }
  if (ctx.state !== "running") return;

  const { dry } = makeReverb(ctx);
  const t0 = ctx.currentTime + 0.05; // tiny buffer so first notes don't miss
  const b  = 60 / 72; // 0.833 s per beat — enjoyable waltz tempo

  // Fade out over last 8 beats
  dry.gain.setValueAtTime(0.88, t0 + 72 * b);
  dry.gain.linearRampToValueAtTime(0,  t0 + 80 * b);

  // Shorthand helpers
  const Tr = (bt: number, f: number, bd: number, v = 0.88) =>
    trumpet(ctx, dry, t0, bt * b, f, bd * b, v);
  const Pn = (bt: number, f: number, bd: number, v = 0.72) =>
    piano  (ctx, dry, t0, bt * b, f, bd * b, v);
  const Vi = (bt: number, f: number, bd: number, v = 0.55) =>
    violin (ctx, dry, t0, bt * b, f, bd * b, v);
  const Tu = (bt: number, f: number, bd: number, v = 0.70) =>
    tuba   (ctx, dry, t0, bt * b, f, bd * b, v);

  const { C3, G3, E4, G4, A4, B4, C5, D5, E5, G5 } = N;
  const C4 = N.C4;

  // ── VERSE 1 ───────────────────────────────────────────────────────────────
  // "Silent night, holy night"
  Tr(0,G4,1.5);  Tr(1.5,A4,0.5); Tr(2,G4,1); Tr(3,E4,3);
  Pn(0,G4,1.5);  Pn(1.5,A4,0.5); Pn(2,G4,1); Pn(3,E4,3);
  Vi(0,E4,6,0.44); Tu(0,G3,3); Tu(3,G3,3);

  // "All is calm, all is bright"
  Tr(6,G4,1.5);  Tr(7.5,A4,0.5); Tr(8,G4,1); Tr(9,E4,3);
  Pn(6,G4,1.5);  Pn(7.5,A4,0.5); Pn(8,G4,1); Pn(9,E4,3);
  Vi(6,E4,6,0.44); Tu(6,G3,3); Tu(9,G3,3);

  // "Round yon Virgin, Mother and Child"
  Tr(12,D5,3); Tr(15,D5,1.5); Tr(16.5,B4,0.5); Tr(17,G4,1); Tr(18,G4,3);
  Pn(12,D5,3); Pn(15,D5,1.5); Pn(16.5,B4,0.5); Pn(17,G4,1); Pn(18,G4,3);
  Vi(12,B4,9,0.50); Tu(12,G3,3); Tu(15,G3,3); Tu(18,G3,3);

  // "Holy Infant so tender and mild"
  Tr(21,C5,3); Tr(24,C5,1.5); Tr(25.5,G4,0.5); Tr(26,E4,1); Tr(27,E4,3);
  Pn(21,C5,3); Pn(24,C5,1.5); Pn(25.5,G4,0.5); Pn(26,E4,1); Pn(27,E4,3);
  Vi(21,C4,9,0.50); Tu(21,C3,3); Tu(24,C3,3); Tu(27,C3,3);

  // "Sleep in heavenly peace"
  Tr(30,D5,2); Tr(32,D5,1); Tr(33,C5,1.5); Tr(34.5,A4,0.5); Tr(35,G4,1); Tr(36,G4,3,0.92);
  Pn(30,D5,2); Pn(32,D5,1); Pn(33,C5,1.5); Pn(34.5,A4,0.5); Pn(35,G4,1); Pn(36,G4,3);
  Vi(30,B4,9,0.56); Tu(30,G3,3); Tu(33,G3,3); Tu(36,G3,3);

  // "Sleep in heavenly peace" — climactic repeat
  Tr(39,G4,1.5,0.95); Tr(40.5,A4,0.5,0.95); Tr(41,G4,1,0.95);
  Tr(42,D5,2,1.00);   Tr(44,E5,1,1.00);
  Tr(45,D5,1.5,0.96); Tr(46.5,B4,0.5,0.92); Tr(47,G4,1,0.90);
  Tr(48,E5,5,1.00);
  Pn(39,G4,1.5,0.90); Pn(40.5,A4,0.5,0.90); Pn(41,G4,1,0.90);
  Pn(42,D5,2,0.95);   Pn(44,E5,1,0.95);
  Pn(45,D5,1.5,0.90); Pn(46.5,B4,0.5,0.88); Pn(47,G4,1,0.85);
  Pn(48,E5,5,0.95);
  Vi(39,B4,9,0.65); Vi(48,E5,5,0.70);
  Tu(39,G3,3); Tu(42,G3,3); Tu(45,G3,3); Tu(48,C3,5);

  // ── VERSE 2 — triumphant ──────────────────────────────────────────────────
  const v = 54;
  Tr(v+0,G4,1.5,0.95); Tr(v+1.5,A4,0.5,0.95); Tr(v+2,G4,1,0.95); Tr(v+3,E4,3,0.95);
  Pn(v+0,G4,1.5,0.90); Pn(v+1.5,A4,0.5,0.90); Pn(v+2,G4,1,0.90); Pn(v+3,E4,3,0.90);
  Vi(v+0,E4,6,0.60); Tu(v+0,G3,3); Tu(v+3,G3,3);

  Tr(v+6,G4,1.5,0.95); Tr(v+7.5,A4,0.5,0.95); Tr(v+8,G4,1,0.95); Tr(v+9,E4,3,0.95);
  Pn(v+6,G4,1.5,0.90); Pn(v+7.5,A4,0.5,0.90); Pn(v+8,G4,1,0.90); Pn(v+9,E4,3,0.90);
  Vi(v+6,E4,6,0.60); Tu(v+6,G3,3); Tu(v+9,G3,3);

  // Triumphant closing — soaring to G5
  Tr(v+12,D5,3,1.00); Tr(v+15,E5,3,1.00); Tr(v+18,G5,4,1.00);
  Tr(v+22,E5,2.5,0.92); Tr(v+24.5,C5,5,0.82);
  Pn(v+12,D5,3,0.95); Pn(v+15,E5,3,0.95); Pn(v+18,G5,4,1.00);
  Pn(v+22,E5,2.5,0.90); Pn(v+24.5,C5,5,0.85);
  Vi(v+12,B4,9,0.78); Vi(v+21,C5,8.5,0.82);
  Tu(v+12,G3,3); Tu(v+15,C3,3); Tu(v+18,C3,4);
  Tu(v+22,C3,2.5); Tu(v+24.5,C3,5);
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
  if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
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

  // Unlock AudioContext on first user interaction
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
    // Always try to resume before playing (SSE events have no gesture)
    ctx.resume().then(() => playSilentNight(ctx)).catch(() => {});
  }

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const onSwMsg = (e: MessageEvent) => {
      if (e.data?.type === "QFX_PLAY_SOUND") ring();
    };
    navigator.serviceWorker.addEventListener("message", onSwMsg);
    return () => navigator.serviceWorker.removeEventListener("message", onSwMsg);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function connect() {
    if (esRef.current) return;
    const token = localStorage.getItem("qfx_admin_token") ?? "";
    const es = new EventSource(`${API_BASE}/api/admin/login-events?token=${encodeURIComponent(token)}`);

    es.onmessage = (e) => {
      try {
        const p = JSON.parse(e.data) as {
          type?: string; name: string; email: string;
          userId: number; country?: string;
          amount?: string; paymentMethod?: string;
        };
        ring();
        if (!p.type || p.type === "login") {
          window.dispatchEvent(new CustomEvent("qfxLoginNotification", { detail: p }));
          toastRef.current({ title: "🔔 User Logged In",
            description: `${p.name} (${p.email}) · ${p.country ?? ""}`, duration: 10000 });
        } else if (p.type === "deposit") {
          toastRef.current({ title: "💰 Deposit Request",
            description: `${p.name} · $${p.amount} via ${p.paymentMethod}`, duration: 12000 });
        } else if (p.type === "withdrawal") {
          toastRef.current({ title: "💸 Withdrawal Request",
            description: `${p.name} · $${p.amount} via ${p.paymentMethod}`, duration: 12000 });
        }
      } catch { /* malformed */ }
    };

    es.onerror = () => { es.close(); esRef.current = null; setTimeout(connect, 6000); };
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
      esRef.current?.close(); esRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
