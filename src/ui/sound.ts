// Tiny synthesized sound effects (no audio files). Off until the player switches it on.
const KEY = 'arkham.sound';

let ctx: AudioContext | null = null;
let on = false;
try { on = localStorage.getItem(KEY) === '1'; } catch { /* storage blocked */ }

export const soundOn = () => on;

function audio(): AudioContext | null {
  if (!on) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

export function setSound(v: boolean) {
  on = v;
  try { localStorage.setItem(KEY, v ? '1' : '0'); } catch { /* storage blocked */ }
  if (v) sfx.good(); // confirms it works and unlocks audio (needs the user's click)
}

function tone(c: AudioContext, freq: number, dur: number, type: OscillatorType, vol: number, delay = 0, slideTo?: number) {
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function click(c: AudioContext, delay: number, vol: number) {
  const t = c.currentTime + delay;
  const len = Math.floor(c.sampleRate * 0.03);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const s = c.createBufferSource();
  const f = c.createBiquadFilter();
  const g = c.createGain();
  f.type = 'bandpass';
  f.frequency.value = 1800 + Math.random() * 1500;
  g.gain.value = vol;
  s.buffer = buf;
  s.connect(f).connect(g).connect(c.destination);
  s.start(t);
}

export const sfx = {
  dice() {
    const c = audio();
    if (!c) return;
    for (let i = 0; i < 7; i++) click(c, i * 0.045 + Math.random() * 0.02, 0.5 - i * 0.04);
  },
  good() {
    const c = audio();
    if (!c) return;
    tone(c, 523, 0.18, 'triangle', 0.18);
    tone(c, 784, 0.28, 'triangle', 0.18, 0.12);
  },
  bad() {
    const c = audio();
    if (!c) return;
    tone(c, 220, 0.22, 'sawtooth', 0.12);
    tone(c, 165, 0.35, 'sawtooth', 0.12, 0.15);
  },
  doom() {
    const c = audio();
    if (!c) return;
    tone(c, 70, 1.4, 'sine', 0.35, 0, 45);
    tone(c, 105, 1.2, 'triangle', 0.1, 0.1, 60);
  },
  gate() {
    const c = audio();
    if (!c) return;
    tone(c, 160, 1.0, 'sawtooth', 0.1, 0, 640);
    tone(c, 640, 0.9, 'sine', 0.08, 0.3, 90);
  },
};
