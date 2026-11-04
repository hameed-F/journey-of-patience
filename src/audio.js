import { SURAHS } from './config.js';
import { storage } from './storage.js';

// ---------- Web Audio context ----------
let ctx = null;
export const getCtx = () => ctx;

export function unlock() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) ctx = new AC();
  }
  if (ctx && ctx.state === 'suspended') ctx.resume();
  return ctx;
}

let exclusive = false;                      // while Tilawat plays, nothing else makes sound
export const setExclusive = (b) => { exclusive = b; };
const sfxOn = () => ctx && storage.get().sound && !exclusive;

function tone(freq, dur, { type = 'sine', vol = 0.18, delay = 0, to = null } = {}) {
  if (!sfxOn()) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

let noiseBuf = null;
function noiseBuffer() {
  if (noiseBuf) return noiseBuf;
  const n = ctx.sampleRate * 2;
  noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  return noiseBuf;
}
export const getNoise = () => noiseBuffer();

function noise(dur, { vol = 0.25, filter = null, freq = 1000, delay = 0, decay = true } = {}) {
  if (!sfxOn()) return;
  const t = ctx.currentTime + delay;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer();
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  if (decay) g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let node = src;
  if (filter) {
    const f = ctx.createBiquadFilter();
    f.type = filter; f.frequency.value = freq;
    src.connect(f); node = f;
  }
  node.connect(g).connect(ctx.destination);
  src.start(t, Math.random());
  src.stop(t + dur + 0.02);
}

// rate limit so a busy screen never turns into noise
const last = {};
const gate = (k, ms) => { const n = performance.now(); if (last[k] && n - last[k] < ms) return false; last[k] = n; return true; };

// ---------- Sound effects (generated) ----------
const HIT_BY_CAT = {
  digital:  () => { tone(880, 0.07, { type: 'square', vol: 0.12 }); tone(440, 0.09, { type: 'square', vol: 0.12, delay: 0.06 }); tone(1320, 0.07, { type: 'square', vol: 0.1, delay: 0.14 }); noise(0.2, { vol: 0.12, filter: 'highpass', freq: 3000 }); },
  habits:   () => { noise(0.35, { vol: 0.28, filter: 'highpass', freq: 2500 }); tone(1800, 0.12, { vol: 0.08 }); tone(2400, 0.1, { vol: 0.06, delay: 0.04 }); },
  material: () => { [1568, 2093, 1319].forEach((f, i) => tone(f, 0.18, { type: 'triangle', vol: 0.12, delay: i * 0.05 })); noise(0.15, { vol: 0.1, filter: 'highpass', freq: 5000 }); },
  negative: () => { tone(110, 0.45, { type: 'sawtooth', vol: 0.2, to: 55 }); tone(165, 0.4, { type: 'square', vol: 0.08, to: 70 }); },
  neglect:  () => { for (let i = 0; i < 5; i++) tone(1400, 0.05, { type: 'square', vol: 0.1, delay: i * 0.07 }); },
  env:      () => { noise(0.3, { vol: 0.32, filter: 'lowpass', freq: 600 }); tone(120, 0.25, { type: 'sine', vol: 0.3, to: 40 }); },
};
const CUE_BY_NAME = {
  notify: () => gate('notify', 700) && (tone(1175, 0.09, { vol: 0.07 }), tone(1568, 0.14, { vol: 0.07, delay: 0.09 })),
  horn:   () => gate('horn', 1500) && (tone(392, 0.28, { type: 'sawtooth', vol: 0.06 }), tone(494, 0.28, { type: 'sawtooth', vol: 0.05 })),
};

export const sfx = {
  click: () => tone(520, 0.06, { type: 'triangle', vol: 0.12 }),
  jump: () => tone(300, 0.18, { type: 'triangle', vol: 0.14, to: 620 }),
  slide: () => noise(0.22, { vol: 0.12, filter: 'bandpass', freq: 1200 }),
  hit: (cat) => (HIT_BY_CAT[cat] || HIT_BY_CAT.env)(),
  cue: (name) => CUE_BY_NAME[name] && CUE_BY_NAME[name](),
  near: () => gate('near', 400) && noise(0.25, { vol: 0.14, filter: 'bandpass', freq: 2200 }),
  land: () => gate('land', 300) && tone(90, 0.18, { vol: 0.2, to: 45 }),
  collect: () => { tone(660, 0.12, { vol: 0.16 }); tone(990, 0.2, { vol: 0.16, delay: 0.09 }); tone(1320, 0.3, { vol: 0.14, delay: 0.18 }); },
  zamzam: () => { [520, 660, 880, 1320].forEach((f, i) => tone(f, 0.28, { vol: 0.13, delay: i * 0.08 })); },
  win: () => { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.45, { vol: 0.15, delay: i * 0.13 })); },
  over: () => tone(330, 0.6, { type: 'triangle', vol: 0.16, to: 100 }),
  firework: () => { noise(0.35, { vol: 0.16, filter: 'highpass', freq: 1500 }); tone(900, 0.25, { vol: 0.06, to: 300 }); },
  ach: () => { [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.22, { type: 'triangle', vol: 0.12, delay: i * 0.08 })); },
  banner: () => tone(300, 0.3, { type: 'triangle', vol: 0.1, to: 450 }),
  date: (n = 0) => tone(900 + n * 70, 0.09, { type: 'triangle', vol: 0.09 }),
  sabr: () => { [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, 0.5, { type: 'sine', vol: 0.11, delay: i * 0.07 })); },
  thunder: () => { noise(1.6, { vol: 0.3, filter: 'lowpass', freq: 220 }); },
};

// ---------- Rain ambience ----------
let rain = null;
export const ambience = {
  rain(on) {
    if (!ctx) return;
    if (on && !rain && storage.get().sound && !exclusive) {
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer(); src.loop = true;
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 700;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 7000;
      const g = ctx.createGain(); g.gain.value = 0.0001;
      src.connect(hp).connect(lp).connect(g).connect(ctx.destination);
      src.start();
      g.gain.linearRampToValueAtTime(0.11, ctx.currentTime + 1.5);
      rain = { src, g };
    } else if (!on && rain) {
      const r = rain; rain = null;
      r.g.gain.cancelScheduledValues(ctx.currentTime);
      r.g.gain.setValueAtTime(r.g.gain.value, ctx.currentTime);
      r.g.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 1.2);
      r.src.stop(ctx.currentTime + 1.3);
    }
  },
};

// ---------- Tilawat (3 recordings, played one after another) ----------
// One <audio> element is reused so mobile browsers keep the user's tap permission.
const SILENT = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
const player = new Audio();
player.preload = 'auto';
let index = 0;
let active = false;
let onStatus = () => {};

function playCurrent() {
  const s = SURAHS[index];
  if (!s) { onStatus('Tilawat finished. You can play it again.'); active = false; exclusive = false; return; }
  onStatus(`Playing ${index + 1}/${SURAHS.length}: ${s.name}`);
  player.src = s.file;
  const p = player.play();
  if (p && p.catch) p.catch(() => { onStatus('Tap "Replay Tilawat" to listen.'); active = false; exclusive = false; });
}

player.addEventListener('ended', () => { if (!active) return; index++; playCurrent(); });
player.addEventListener('error', () => {
  if (!active) return;
  const s = SURAHS[index];
  if (s) { onStatus(`Missing audio file: ${s.file} (add it to public/audio/)`); exclusive = false; }
});

export const tilawat = {
  // call inside a tap/click (the Play button) so mobile browsers allow autoplay later
  prime() {
    active = false;
    player.src = SILENT;
    const p = player.play();
    if (p && p.then) p.then(() => player.pause()).catch(() => {});
  },
  start(statusCb) { active = true; exclusive = true; onStatus = statusCb || (() => {}); index = 0; playCurrent(); },
  stop() { active = false; exclusive = false; player.pause(); },
};
