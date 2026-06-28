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
  C4: 261.63, D4: 293.66, E4: 329.63, G4: 392.00, A4: 440.00, B4: 493.88,
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

// ─── Single trumpet voice ─────────────────────────────────────────────────────
function trumpetVoice(ctx: AudioContext, dest: AudioNode, t0: number, t: number,
                      freq: number, dur: number, vol: number, detune: number) {
  const partials = [
    { r: 1, g: 0.20 }, { r: 2, g: 0.82 }, { r: 3, g: 0.72 },
    { r: 4, g: 0.55 }, { r: 5, g: 0.40 }, { r: 6, g: 0.26 },
    { r: 7, g: 0.14 }, { r: 8, g: 0.07 },
  ];
  const att  = Math.min(0.07, dur * 0.14);
  const rel  = Math.min(0.16, dur * 0.18);
  const hold = Math.max(att + 0.01, dur - rel);
  partials.forEach(({ r, g }) => {
    const osc = ctx.createOscillator();
    const gn  = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq * r;
    osc.detune.value = detune;
    gn.gain.setValueAtTime(0, t0 + t);
    gn.gain.linearRampToValueAtTime(g * vol * 0.36, t0 + t + att);
    gn.gain.setValueAtTime(g * vol * 0.36, t0 + t + hold);
    gn.gain.linearRampToValueAtTime(0, t0 + t + dur);
    osc.connect(gn); gn.connect(dest);
    osc.start(t0 + t); osc.stop(t0 + t + dur + 0.05);
  });
}

// ─── Ensemble trumpets (3 voices, slightly detuned for fullness) ──────────────
function brass(ctx: AudioContext, dest: AudioNode, t0: number, t: number,
               freq: number, dur: number, vol = 1.0) {
  trumpetVoice(ctx, dest, t0, t, freq, dur, vol * 1.00,   0);
  trumpetVoice(ctx, dest, t0, t, freq, dur, vol * 0.72, +10);
  trumpetVoice(ctx, dest, t0, t, freq, dur, vol * 0.68, -10);
}

// ─── Piano (bright attack, harmonic ring-down) ────────────────────────────────
function piano(ctx: AudioContext, dest: AudioNode, t0: number, t: number,
               freq: number, dur: number, vol = 1.0) {
  [{ r: 1, g: 0.70 }, { r: 2, g: 0.28 }, { r: 3, g: 0.12 }, { r: 4, g: 0.06 }]
    .forEach(({ r, g }) => {
      const osc = ctx.createOscillator();
      const gn  = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq * r;
      const peak = g * vol * 0.30;
      gn.gain.setValueAtTime(0, t0 + t);
      gn.gain.linearRampToValueAtTime(peak, t0 + t + 0.010);
      gn.gain.exponentialRampToValueAtTime(peak * 0.32, t0 + t + Math.min(dur * 0.55, 1.4));
      gn.gain.linearRampToValueAtTime(0, t0 + t + dur);
      osc.connect(gn); gn.connect(dest);
      osc.start(t0 + t); osc.stop(t0 + t + dur + 0.05);
    });
}

// ─── Violin (bowed strings: slow attack + vibrato + lowpass) ─────────────────
function violin(ctx: AudioContext, dest: AudioNode, t0: number, t: number,
                freq: number, dur: number, vol = 1.0) {
  const filt = ctx.createBiquadFilter();
  filt.type = "lowpass";
  filt.frequency.value = freq * 6;
  filt.Q.value = 0.7;
  filt.connect(dest);

  const osc    = ctx.createOscillator();
  const lfo    = ctx.createOscillator();
  const lfogn  = ctx.createGain();
  osc.type = "sawtooth";
  osc.frequency.value = freq;
  lfo.frequency.value = 5.8;
  lfogn.gain.value    = freq * 0.011;
  lfo.connect(lfogn); lfogn.connect(osc.frequency);

  const gn    = ctx.createGain();
  const bowAtt = Math.min(0.24, dur * 0.28);
  const peak   = vol * 0.17;
  gn.gain.setValueAtTime(0, t0 + t);
  gn.gain.linearRampToValueAtTime(peak, t0 + t + bowAtt);
  gn.gain.setValueAtTime(peak, t0 + t + Math.max(bowAtt, dur - 0.16));
  gn.gain.linearRampToValueAtTime(0, t0 + t + dur);

  osc.connect(gn); gn.connect(filt);
  lfo.start(t0 + t); lfo.stop(t0 + t + dur + 0.1);
  osc.start(t0 + t); osc.stop(t0 + t + dur + 0.1);
}

// ─── Tuba (low brass: deep, slow attack, heavy fundamental) ──────────────────
function tuba(ctx: AudioContext, dest: AudioNode, t0: number, t: number,
              freq: number, dur: number, vol = 1.0) {
  [{ r: 1, g: 0.88 }, { r: 2, g: 0.38 }, { r: 3, g: 0.16 }].forEach(({ r, g }) => {
    const osc = ctx.createOscillator();
    const gn  = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq * r;
    const att  = Math.min(0.22, dur * 0.26);
    const hold = Math.max(att + 0.01, dur - 0.24);
    const peak = g * vol * 0.36;
    gn.gain.setValueAtTime(0, t0 + t);
    gn.gain.linearRampToValueAtTime(peak, t0 + t + att);
    gn.gain.setValueAtTime(peak, t0 + t + hold);
    gn.gain.linearRampToValueAtTime(0, t0 + t + dur);
    osc.connect(gn); gn.connect(dest);
    osc.start(t0 + t); osc.stop(t0 + t + dur + 0.05);
  });
}

// ─── Silent Night — Full orchestra, ~65 seconds ───────────────────────────────
// Key: C major  |  BPM: 72 (0.833 s/beat)  |  3/4 time
async function playSilentNight(ctx: AudioContext) {
  if (ctx.state === "suspended") {
    try { await ctx.resume(); } catch { return; }
  }
  if (ctx.state !== "running") return;

  const { dry, wet } = makeReverb(ctx);
  const t0  = ctx.currentTime;
  const b   = 60 / 72; // 0.833 s per beat

  // Global fade-out over the last 8 beats (~80 beats total)
  dry.gain.setValueAtTime(0.84, t0 + 72 * b);
  dry.gain.linearRampToValueAtTime(0,  t0 + 80 * b);
  wet.gain.setValueAtTime(0.26, t0 + 72 * b);
  wet.gain.linearRampToValueAtTime(0,  t0 + 80 * b);

  const Br = (bt: number, freq: number, bd: number, vol = 0.88) =>
    brass (ctx, dry, t0, bt * b, freq, bd * b, vol);
  const Pn = (bt: number, freq: number, bd: number, vol = 0.68) =>
    piano (ctx, dry, t0, bt * b, freq, bd * b, vol);
  const Vi = (bt: number, freq: number, bd: number, vol = 0.58) =>
    violin(ctx, dry, t0, bt * b, freq, bd * b, vol);
  const Tu = (bt: number, freq: number, bd: number, vol = 0.72) =>
    tuba  (ctx, dry, t0, bt * b, freq, bd * b, vol);

  const { C3, G3, E4, G4, A4, B4, C5, D5, E5, G5 } = N;

  // ── VERSE 1 ────────────────────────────────────────────────────────────────

  // "Silent night, holy night"
  Br(0,  G4,1.5);   Br(1.5,A4,0.5);  Br(2, G4,1.0);  Br(3, E4,3.0);
  Pn(0,  G4,1.5);   Pn(1.5,A4,0.5);  Pn(2, G4,1.0);  Pn(3, E4,3.0);
  Vi(0,  E4,6.0,0.45);
  Tu(0,  G3,3.0);   Tu(3, G3,3.0);

  // "All is calm, all is bright"
  Br(6,  G4,1.5);   Br(7.5,A4,0.5);  Br(8, G4,1.0);  Br(9, E4,3.0);
  Pn(6,  G4,1.5);   Pn(7.5,A4,0.5);  Pn(8, G4,1.0);  Pn(9, E4,3.0);
  Vi(6,  E4,6.0,0.45);
  Tu(6,  G3,3.0);   Tu(9, G3,3.0);

  // "Round yon Virgin, Mother and Child"
  Br(12, D5,3.0);
  Br(15, D5,1.5);   Br(16.5,B4,0.5); Br(17,G4,1.0);  Br(18,G4,3.0);
  Pn(12, D5,3.0);
  Pn(15, D5,1.5);   Pn(16.5,B4,0.5); Pn(17,G4,1.0);  Pn(18,G4,3.0);
  Vi(12, B4,9.0,0.52);
  Tu(12, G3,3.0);   Tu(15,G3,3.0);   Tu(18,G3,3.0);

  // "Holy Infant so tender and mild"
  Br(21, C5,3.0);
  Br(24, C5,1.5);   Br(25.5,G4,0.5); Br(26,E4,1.0);  Br(27,E4,3.0);
  Pn(21, C5,3.0);
  Pn(24, C5,1.5);   Pn(25.5,G4,0.5); Pn(26,E4,1.0);  Pn(27,E4,3.0);
  Vi(21, N.C4,9.0,0.52);
  Tu(21, C3,3.0);   Tu(24,C3,3.0);   Tu(27,C3,3.0);

  // "Sleep in heavenly peace"
  Br(30, D5,2.0);   Br(32,D5,1.0);
  Br(33, C5,1.5);   Br(34.5,A4,0.5); Br(35,G4,1.0);  Br(36,G4,3.0,0.92);
  Pn(30, D5,2.0);   Pn(32,D5,1.0);
  Pn(33, C5,1.5);   Pn(34.5,A4,0.5); Pn(35,G4,1.0);  Pn(36,G4,3.0);
  Vi(30, B4,9.0,0.58);
  Tu(30, G3,3.0);   Tu(33,G3,3.0);   Tu(36,G3,3.0);

  // "Sleep in heavenly peace" — climactic repeat
  Br(39, G4,1.5,0.95); Br(40.5,A4,0.5,0.95); Br(41,G4,1.0,0.95);
  Br(42, D5,2.0,1.00); Br(44, E5,1.0,1.00);
  Br(45, D5,1.5,0.96); Br(46.5,B4,0.5,0.92); Br(47,G4,1.0,0.90);
  Br(48, E5,5.0,1.00);
  Pn(39, G4,1.5,0.90); Pn(40.5,A4,0.5,0.90); Pn(41,G4,1.0,0.90);
  Pn(42, D5,2.0,0.95); Pn(44, E5,1.0,0.95);
  Pn(45, D5,1.5,0.90); Pn(46.5,B4,0.5,0.88); Pn(47,G4,1.0,0.85);
  Pn(48, E5,5.0,0.95);
  Vi(39, B4,9.0,0.68); Vi(48,E5,5.0,0.72);
  Tu(39, G3,3.0); Tu(42,G3,3.0); Tu(45,G3,3.0); Tu(48,C3,5.0);

  // ── VERSE 2 (full orchestra, triumphant) ──────────────────────────────────
  const v = 54;

  // "Silent night, holy night"
  Br(v+0,  G4,1.5,0.95); Br(v+1.5,A4,0.5,0.95);
  Br(v+2,  G4,1.0,0.95); Br(v+3,  E4,3.0,0.95);
  Pn(v+0,  G4,1.5,0.90); Pn(v+1.5,A4,0.5,0.90);
  Pn(v+2,  G4,1.0,0.90); Pn(v+3,  E4,3.0,0.90);
  Vi(v+0,  E4,6.0,0.62);
  Tu(v+0,  G3,3.0);  Tu(v+3,G3,3.0);

  // "All is calm, all is bright"
  Br(v+6,  G4,1.5,0.95); Br(v+7.5,A4,0.5,0.95);
  Br(v+8,  G4,1.0,0.95); Br(v+9,  E4,3.0,0.95);
  Pn(v+6,  G4,1.5,0.90); Pn(v+7.5,A4,0.5,0.90);
  Pn(v+8,  G4,1.0,0.90); Pn(v+9,  E4,3.0,0.90);
  Vi(v+6,  E4,6.0,0.62);
  Tu(v+6,  G3,3.0);  Tu(v+9,G3,3.0);

  // Triumphant closing — soaring to G5
  Br(v+12, D5,3.0,1.00);
  Br(v+15, E5,3.0,1.00);
  Br(v+18, G5,4.0,1.00);
  Br(v+22, E5,2.5,0.92);
  Br(v+24.5,C5,5.0,0.82);
  Pn(v+12, D5,3.0,0.95);
  Pn(v+15, E5,3.0,0.95);
  Pn(v+18, G5,4.0,1.00);
  Pn(v+22, E5,2.5,0.90);
  Pn(v+24.5,C5,5.0,0.85);
  Vi(v+12, B4,9.0,0.80); Vi(v+21,C5,8.5,0.85);
  Tu(v+12, G3,3.0); Tu(v+15,C3,3.0); Tu(v+18,C3,4.0);
  Tu(v+22, C3,2.5); Tu(v+24.5,C3,5.0);
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
