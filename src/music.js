// Procedural background music: pumping four-on-the-floor beat + Hijaz-scale arpeggios.
// No audio files needed. Intensity rises with difficulty tier.
import { getCtx, unlock } from './audio.js';
import { storage } from './storage.js';

const ROOT = 73.42;                         // D2
const HIJAZ = [0, 1, 4, 5, 7, 8, 10];        // D Eb F# G A Bb C
const semi = (d) => HIJAZ[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7);
const freq = (s) => ROOT * Math.pow(2, s / 12);
const BAR_ROOT = [0, 0, 5, 7];               // D D G A

const LEAD = [
  [0, null, 2, null, 1, null, 0, null, 4, null, 3, null, 2, 1, 0, null],
  [0, 2, 4, 2, 0, 2, 4, 7, 6, 4, 2, 4, 5, 4, 2, 1],
  [7, null, 6, null, 5, null, 4, null, 2, null, 1, null, 0, null, 1, 2],
  [4, null, 5, null, 4, null, 2, null, 1, null, 2, null, 0, null, null, null],
];

let ctx, master, comp, bassBus, padBus, leadBus, drumBus, delay;
let timer = null, nextT = 0, step = 0, running = false, paused = false;
let bpm = 122, intensity = 0.2, tierBpm = 0, calm = false;
const VOL = 0.5;

function build() {
  ctx = getCtx();
  if (!ctx || master) return !!ctx;
  master = ctx.createGain(); master.gain.value = 0.0001;
  comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16; comp.ratio.value = 4;
  master.connect(comp).connect(ctx.destination);
  drumBus = ctx.createGain(); drumBus.gain.value = 0.9; drumBus.connect(master);
  bassBus = ctx.createGain(); bassBus.connect(master);
  padBus = ctx.createGain(); padBus.gain.value = 0.7; padBus.connect(master);
  leadBus = ctx.createGain(); leadBus.gain.value = 0.8; leadBus.connect(master);
  delay = ctx.createDelay(1); delay.delayTime.value = 0.36;
  const fb = ctx.createGain(); fb.gain.value = 0.34;
  const wet = ctx.createGain(); wet.gain.value = 0.35;
  leadBus.connect(delay); delay.connect(fb).connect(delay); delay.connect(wet).connect(master);
  return true;
}

let noiseBuf = null;
function noiseBuffer() {
  if (noiseBuf) return noiseBuf;
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return noiseBuf;
}

const beat = () => 60 / bpm;

function kick(t) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.frequency.setValueAtTime(165, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.13);
  g.gain.setValueAtTime(1, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
  o.connect(g).connect(drumBus); o.start(t); o.stop(t + 0.32);
  // sidechain "pump" on bass + pad
  for (const bus of [bassBus, padBus]) {
    bus.gain.cancelScheduledValues(t);
    bus.gain.setValueAtTime(0.18, t);
    bus.gain.linearRampToValueAtTime(bus === bassBus ? 1 : 0.7, t + beat() * 0.85);
  }
}

function noiseHit(t, { type, f, q = 1, vol, dur, bursts = 1 }) {
  for (let i = 0; i < bursts; i++) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuffer();
    const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    const g = ctx.createGain(); const tt = t + i * 0.012;
    g.gain.setValueAtTime(vol, tt); g.gain.exponentialRampToValueAtTime(0.001, tt + dur);
    s.connect(fl).connect(g).connect(drumBus); s.start(tt, Math.random() * 0.5); s.stop(tt + dur + 0.02);
  }
}
const clap = (t) => noiseHit(t, { type: 'bandpass', f: 1600, q: 0.9, vol: 0.55, dur: 0.16, bursts: 3 });
const hat = (t, open, vol = 0.22) => noiseHit(t, { type: 'highpass', f: 7500, vol, dur: open ? 0.14 : 0.04 });

function bass(t, s, dur) {
  const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  o.type = 'sawtooth'; o.frequency.value = freq(s);
  f.type = 'lowpass'; f.Q.value = 6;
  f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(180, t + dur);
  g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(f).connect(g).connect(bassBus); o.start(t); o.stop(t + dur + 0.02);
}

function pluck(t, s, dur = 0.2, vol = 0.14) {
  const o = ctx.createOscillator(), o2 = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  o.type = 'sawtooth'; o2.type = 'square';
  o.frequency.value = freq(s + 24); o2.frequency.value = freq(s + 24) * 1.006;
  f.type = 'lowpass'; f.frequency.setValueAtTime(4200, t); f.frequency.exponentialRampToValueAtTime(700, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(f); o2.connect(f); f.connect(g).connect(leadBus);
  o.start(t); o2.start(t); o.stop(t + dur + 0.02); o2.stop(t + dur + 0.02);
}

function pad(t, root, dur) {
  [0, 4, 7, 12].forEach((iv) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'triangle'; o.frequency.value = freq(root + iv + 12);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.05, t + 0.25);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(padBus); o.start(t); o.stop(t + dur + 0.02);
  });
}

function scheduleStep(s, t) {
  const bar = Math.floor(s / 16) % 4, i = s % 16;
  const root = BAR_ROOT[bar];
  const q = beat() / 4;

  if (i % 4 === 0) kick(t);
  if (intensity >= 0.35 && (i === 4 || i === 12)) clap(t);
  if (i % 4 === 2) hat(t, i === 14 && intensity >= 0.5);
  if (intensity >= 0.6 && i % 2 === 1) hat(t, false, 0.08);

  if (i % 4 === 2) bass(t, root + (i === 10 && intensity >= 0.5 ? 12 : 0), q * 3);
  if (intensity >= 0.7 && i === 15) bass(t, root + 7, q);

  if (intensity >= 0.25) {
    const pat = LEAD[intensity >= 0.6 && bar % 2 === 1 ? 1 : bar];
    const d = pat[i];
    if (d !== null) pluck(t, semi(d), q * 1.8, intensity >= 0.85 ? 0.16 : 0.12);
    if (intensity >= 0.85 && d !== null && i % 4 === 0) pluck(t, semi(d) + 12, q, 0.06);
  }
  if (intensity >= 0.4 && i === 0) pad(t, root, beat() * 4 * 0.95);
}

function tick() {
  if (!running || paused) return;
  const q = beat() / 4;
  while (nextT < ctx.currentTime + 0.14) {
    scheduleStep(step, nextT);
    nextT += q;
    step = (step + 1) % 64;
  }
}

function setBpm() { bpm = 120 + tierBpm * 3.5 - (calm ? 10 : 0); }

export const music = {
  start() {
    if (!storage.get().music) return;
    unlock();
    if (!build()) return;
    running = true; paused = false;
    step = 0; nextT = ctx.currentTime + 0.08;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(0.0001, ctx.currentTime);
    master.gain.linearRampToValueAtTime(VOL, ctx.currentTime + 0.6);
    clearInterval(timer);
    timer = setInterval(tick, 30);
  },
  stop(fade = 0.4) {
    if (!master) return;
    running = false;
    clearInterval(timer);
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + fade);
  },
  pause() {
    if (!running || paused) return;
    paused = true;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.15);
  },
  resume() {
    if (!running || !paused) return;
    paused = false;
    nextT = ctx.currentTime + 0.08;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.linearRampToValueAtTime(VOL, ctx.currentTime + 0.3);
  },
  setTier(t) {
    tierBpm = t;
    intensity = calm ? 0.2 : [0.2, 0.4, 0.55, 0.7, 0.85, 1][t] ?? 1;
    setBpm();
  },
  setCalm(on, tier = tierBpm) {
    calm = on;
    intensity = calm ? 0.2 : [0.2, 0.4, 0.55, 0.7, 0.85, 1][tier] ?? 1;
    setBpm();
  },
  setEnabled(on) {
    if (!on) this.stop(0.2);
  },
  get running() { return running; },
};
