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

// ─── Note frequencies (Hz) ────────────────────────────────────────────────────
const N = {
  C3: 130.81, G3: 196.00,
  C4: 261.63, E4: 329.63, G4: 392.00, A4: 440.00, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99,
};

// ─── Reverb ───────────────────────────────────────────────────────────────────
function makeReverb(ctx: AudioContext) {
  const dly = ctx.createDelay(0.6);
  const fb  = ctx.createGain();
  const wet = ctx.createGain();
  dly.delayTime.value = 0.28;
  fb.gain.value       = 0.35;
  wet.gain.value      = 0.26;
  dly.connect(fb); fb.connect(dly); dly.connect(wet); wet.connect(ctx.destination);
  const dry = ctx.createGain();
  dry.gain.value = 0.84;
  dry.connect(ctx.destination);
  dry.connect(dly);
  return { dry, wet };
}

// ─── Instruments ──────────────────────────────────────────────────────────────

function trumpetVoice(ctx: AudioContext, dest: AudioNode, t0: number, t: number,
                      freq: number, dur: number, vol: number, detune: number) {
  [{ r: 1, g: 0.20 }, { r: 2, g: 0.80 }, { r: 3, g: 0.70 },
   { r: 4, g: 0.52 }, { r: 5, g: 0.36 }, { r: 6, g: 0.22 }]
    .forEach(({ r, g }) => {
      const osc = ctx.createOscillator();
      const gn  = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq * r;
      osc.detune.value = detune;
      const att  = Math.min(0.07, dur * 0.14);
      const hold = Math.max(att + 0.01, dur - Math.min(0.16, dur * 0.18));
      const peak = g * vol * 0.36;
      gn.gain.setValueAtTime(0, t0 + t);
      gn.gain.linearRampToValueAtTime(peak, t0 + t + att);
      gn.gain.setValueAtTime(peak, t0 + t + hold);
      gn.gain.linearRampToValueAtTime(0, t0 + t + dur);
      osc.connect(gn); gn.connect(dest);
      osc.start(t0 + t); osc.stop(t0 + t + dur + 0.05);
    });
}

// Ensemble: 3 voices slightly detuned
function brass(ctx: AudioContext, dest: AudioNode, t0: number, t: number,
               freq: number, dur: number, vol = 1.0) {
  trumpetVoice(ctx, dest, t0, t, freq, dur, vol * 1.00,   0);
  trumpetVoice(ctx, dest, t0, t, freq, dur, vol * 0.70, +10);
  trumpetVoice(ctx, dest, t0, t, freq, dur, vol * 0.65, -10);
}

function piano(ctx: AudioContext, dest: AudioNode, t0: number, t: number,
               freq: number, dur: number, vol = 1.0) {
  [{ r: 1, g: 0.70 }, { r: 2, g: 0.28 }, { r: 3, g: 0.10 }].forEach(({ r, g }) => {
    const osc = ctx.createOscillator();
    const gn  = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq * r;
    const peak = g * vol * 0.28;
    gn.gain.setValueAtTime(0, t0 + t);
    gn.gain.linearRampToValueAtTime(peak, t0 + t + 0.010);
    gn.gain.exponentialRampToValueAtTime(peak * 0.30, t0 + t + Math.min(dur * 0.55, 1.4));
    gn.gain.linearRampToValueAtTime(0, t0 + t + dur);
    osc.connect(gn); gn.connect(dest);
    osc.start(t0 + t); osc.stop(t0 + t + dur + 0.05);
  });
}

function violin(ctx: AudioContext, dest: AudioNode, t0: number, t: number,
                freq: number, dur: number, vol = 1.0) {
  const filt = ctx.createBiquadFilter();
  filt.type = "lowpass";
  filt.frequency.value = freq * 5.5;
  filt.connect(dest);
  const osc  = ctx.createOscillator();
  const gn   = ctx.createGain();
  osc.type = "sawtooth";
  osc.frequency.value = freq;
  const att  = Math.min(0.22, dur * 0.28);
  const peak = vol * 0.16;
  gn.gain.setValueAtTime(0, t0 + t);
  gn.gain.linearRampToValueAtTime(peak, t0 + t + att);
  gn.gain.setValueAtTime(peak, t0 + t + Math.max(att, dur - 0.16));
  gn.gain.linearRampToValueAtTime(0, t0 + t + dur);
  osc.connect(gn); gn.connect(filt);
  osc.start(t0 + t); osc.stop(t0 + t + dur + 0.05);
}

function tuba(ctx: AudioContext, dest: AudioNode, t0: number, t: number,
              freq: number, dur: number, vol = 1.0) {
  [{ r: 1, g: 0.88 }, { r: 2, g: 0.36 }].forEach(({ r, g }) => {
    const osc = ctx.createOscillator();
    const gn  = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq * r;
    const att  = Math.min(0.22, dur * 0.26);
    const hold = Math.max(att + 0.01, dur - 0.24);
    const peak = g * vol * 0.34;
    gn.gain.setValueAtTime(0, t0 + t);
    gn.gain.linearRampToValueAtTime(peak, t0 + t + att);
    gn.gain.setValueAtTime(peak, t0 + t + hold);
    gn.gain.linearRampToValueAtTime(0, t0 + t + dur);
    osc.connect(gn); gn.connect(dest);
    osc.start(t0 + t); osc.stop(t0 + t + dur + 0.05);
  });
}

// ─── Dynamic scheduler — creates oscillators 250 ms before play time ──────────
// This keeps peak AudioNode count low on mobile instead of creating all at once.
let _stopScheduler: (() => void) | null = null;

async function playSilentNight(ctx: AudioContext) {
  if (ctx.state === "suspended") {
    try { await ctx.resume(); } catch { return; }
  }
  if (ctx.state !== "running") return;

  // Cancel any previous playback
  _stopScheduler?.();

  const { dry, wet } = makeReverb(ctx);
  const t0 = ctx.currentTime;
  const b  = 60 / 72; // BPM 72 — 0.833 s/beat

  dry.gain.setValueAtTime(0.84, t0 + 72 * b);
  dry.gain.linearRampToValueAtTime(0,  t0 + 80 * b);
  wet.gain.setValueAtTime(0.26, t0 + 72 * b);
  wet.gain.linearRampToValueAtTime(0,  t0 + 80 * b);

  // Build note queue — each entry: { at: seconds-from-t0, play: () => void }
  const queue: Array<{ at: number; play: () => void }> = [];

  const Br = (bt: number, fr: number, bd: number, v = 0.88) =>
    queue.push({ at: bt * b, play: () => brass (ctx, dry, t0, bt * b, fr, bd * b, v) });
  const Pn = (bt: number, fr: number, bd: number, v = 0.68) =>
    queue.push({ at: bt * b, play: () => piano (ctx, dry, t0, bt * b, fr, bd * b, v) });
  const Vi = (bt: number, fr: number, bd: number, v = 0.55) =>
    queue.push({ at: bt * b, play: () => violin(ctx, dry, t0, bt * b, fr, bd * b, v) });
  const Tu = (bt: number, fr: number, bd: number, v = 0.70) =>
    queue.push({ at: bt * b, play: () => tuba  (ctx, dry, t0, bt * b, fr, bd * b, v) });

  const { C3, G3, E4, G4, A4, B4, C5, D5, E5, G5 } = N;
  const C4 = N.C4;

  // ── VERSE 1 ──────────────────────────────────────────────────────────────
  // "Silent night, holy night"
  Br(0,G4,1.5);  Br(1.5,A4,0.5); Br(2,G4,1); Br(3,E4,3);
  Pn(0,G4,1.5);  Pn(1.5,A4,0.5); Pn(2,G4,1); Pn(3,E4,3);
  Vi(0,E4,6,0.44); Tu(0,G3,3); Tu(3,G3,3);

  // "All is calm, all is bright"
  Br(6,G4,1.5);  Br(7.5,A4,0.5); Br(8,G4,1); Br(9,E4,3);
  Pn(6,G4,1.5);  Pn(7.5,A4,0.5); Pn(8,G4,1); Pn(9,E4,3);
  Vi(6,E4,6,0.44); Tu(6,G3,3); Tu(9,G3,3);

  // "Round yon Virgin, Mother and Child"
  Br(12,D5,3); Br(15,D5,1.5); Br(16.5,B4,0.5); Br(17,G4,1); Br(18,G4,3);
  Pn(12,D5,3); Pn(15,D5,1.5); Pn(16.5,B4,0.5); Pn(17,G4,1); Pn(18,G4,3);
  Vi(12,B4,9,0.50); Tu(12,G3,3); Tu(15,G3,3); Tu(18,G3,3);

  // "Holy Infant so tender and mild"
  Br(21,C5,3); Br(24,C5,1.5); Br(25.5,G4,0.5); Br(26,E4,1); Br(27,E4,3);
  Pn(21,C5,3); Pn(24,C5,1.5); Pn(25.5,G4,0.5); Pn(26,E4,1); Pn(27,E4,3);
  Vi(21,C4,9,0.50); Tu(21,C3,3); Tu(24,C3,3); Tu(27,C3,3);

  // "Sleep in heavenly peace"
  Br(30,D5,2); Br(32,D5,1); Br(33,C5,1.5); Br(34.5,A4,0.5); Br(35,G4,1); Br(36,G4,3,0.92);
  Pn(30,D5,2); Pn(32,D5,1); Pn(33,C5,1.5); Pn(34.5,A4,0.5); Pn(35,G4,1); Pn(36,G4,3);
  Vi(30,B4,9,0.56); Tu(30,G3,3); Tu(33,G3,3); Tu(36,G3,3);

  // "Sleep in heavenly peace" — climactic repeat
  Br(39,G4,1.5,0.95); Br(40.5,A4,0.5,0.95); Br(41,G4,1,0.95);
  Br(42,D5,2,1.00);   Br(44,E5,1,1.00);
  Br(45,D5,1.5,0.96); Br(46.5,B4,0.5,0.92); Br(47,G4,1,0.90);
  Br(48,E5,5,1.00);
  Pn(39,G4,1.5,0.90); Pn(40.5,A4,0.5,0.90); Pn(41,G4,1,0.90);
  Pn(42,D5,2,0.95);   Pn(44,E5,1,0.95);
  Pn(45,D5,1.5,0.90); Pn(46.5,B4,0.5,0.88); Pn(47,G4,1,0.85);
  Pn(48,E5,5,0.95);
  Vi(39,B4,9,0.66);   Vi(48,E5,5,0.70);
  Tu(39,G3,3); Tu(42,G3,3); Tu(45,G3,3); Tu(48,C3,5);

  // ── VERSE 2 — full orchestra, triumphant ─────────────────────────────────
  const v = 54;
  Br(v+0,G4,1.5,0.95); Br(v+1.5,A4,0.5,0.95); Br(v+2,G4,1,0.95); Br(v+3,E4,3,0.95);
  Pn(v+0,G4,1.5,0.90); Pn(v+1.5,A4,0.5,0.90); Pn(v+2,G4,1,0.90); Pn(v+3,E4,3,0.90);
  Vi(v+0,E4,6,0.60);   Tu(v+0,G3,3); Tu(v+3,G3,3);

  Br(v+6,G4,1.5,0.95); Br(v+7.5,A4,0.5,0.95); Br(v+8,G4,1,0.95); Br(v+9,E4,3,0.95);
  Pn(v+6,G4,1.5,0.90); Pn(v+7.5,A4,0.5,0.90); Pn(v+8,G4,1,0.90); Pn(v+9,E4,3,0.90);
  Vi(v+6,E4,6,0.60);   Tu(v+6,G3,3); Tu(v+9,G3,3);

  // Triumphant close — soaring to G5
  Br(v+12,D5,3,1.00); Br(v+15,E5,3,1.00); Br(v+18,G5,4,1.00);
  Br(v+22,E5,2.5,0.92); Br(v+24.5,C5,5,0.82);
  Pn(v+12,D5,3,0.95); Pn(v+15,E5,3,0.95); Pn(v+18,G5,4,1.00);
  Pn(v+22,E5,2.5,0.90); Pn(v+24.5,C5,5,0.85);
  Vi(v+12,B4,9,0.78); Vi(v+21,C5,8.5,0.82);
  Tu(v+12,G3,3); Tu(v+15,C3,3); Tu(v+18,C3,4); Tu(v+22,C3,2.5); Tu(v+24.5,C3,5);

  // Sort by play time
  queue.sort((a, b_) => a.at - b_.at);

  // ─── Scheduler: fire every 80 ms, create notes 250 ms ahead ─────────────
  // This ensures only a small batch of AudioNodes exist at any moment.
  let idx = 0;
  let cancelled = false;
  let tid: ReturnType<typeof setTimeout> | null = null;

  _stopScheduler = () => {
    cancelled = true;
    if (tid !== null) clearTimeout(tid);
    _stopScheduler = null;
  };

  function tick() {
    if (cancelled) return;
    const now = ctx.currentTime - t0;
    const ahead = now + 0.25; // 250 ms lookahead
    while (idx < queue.length && queue[idx].at <= ahead) {
      queue[idx].play();
      idx++;
    }
    if (idx < queue.length) {
      tid = setTimeout(tick, 80);
    } else {
      _stopScheduler = null;
    }
  }

  tick();
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
