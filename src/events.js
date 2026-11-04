// Special gameplay events: Foggy Path, Rainstorm, Distraction Rush, Peaceful Stretch
import * as UI from './ui.js';
import { sfx, ambience } from './audio.js';
import { music } from './music.js';

const DEFS = {
  fog:   { name: 'Foggy Path',       sub: 'Visibility reduced',      dur: 13 },
  rain:  { name: 'Rainstorm',        sub: 'Slippery and dark',       dur: 15 },
  rush:  { name: 'Distraction Rush', sub: 'Stay focused',            dur: 12 },
  peace: { name: 'Peaceful Stretch', sub: 'Take a breath',           dur: 12 },
};
const NOTES = [
  ['💬', '3 new messages'], ['🔔', 'Someone liked your post'], ['📱', 'Breaking news!'], ['🎮', 'Your friends are online'],
  ['📧', '99+ unread emails'], ['🛒', 'Flash sale: 70% off'], ['▶️', 'New video for you'], ['📣', 'You were mentioned'],
];

export class Events {
  constructor(game) { this.game = game; this.reset(); }

  reset() {
    if (this.cur) this.end(true);
    this.cur = null; this.t = 0; this.nt = 0; this.last = null;
    this.wait = 20;
  }

  start(name) {
    const g = this.game, d = DEFS[name];
    this.cur = name; this.t = d.dur; this.last = name;
    UI.banner(d.name, d.sub); sfx.banner();
    if (name === 'fog') g.env.target.fog = 1;
    if (name === 'rain') { g.env.target.rain = 1; ambience.rain(true); }
    if (name === 'rush') { g.mods.forceCat = 'digital'; g.mods.gapMul = 0.85; g.mods.rush = true; this.nt = 0.3; }
    if (name === 'peace') { g.env.target.peace = 1; g.mods.calm = true; g.mods.gapMul = 1.7; g.mods.surahMul = 0.6; music.setCalm(true, g.tier); }
  }

  end(silent = false) {
    const g = this.game;
    g.env.target.fog = 0; g.env.target.rain = 0; g.env.target.peace = 0;
    ambience.rain(false);
    if (this.cur === 'peace') music.setCalm(false, g.tier);
    g.mods = { gapMul: 1, calm: false, forceCat: null, rush: false, surahMul: 1 };
    this.cur = null;
    this.wait = 14 + Math.random() * 9;
    if (!silent) UI.toast('Back to the road');
  }

  update(dt) {
    if (this.cur) {
      this.t -= dt;
      if (this.cur === 'rush') {
        this.nt -= dt;
        if (this.nt <= 0) { const n = NOTES[Math.floor(Math.random() * NOTES.length)]; UI.notify(n[0], n[1]); sfx.cue('notify'); this.nt = 0.5 + Math.random() * 0.5; }
      }
      if (this.t <= 0) this.end();
    } else {
      this.wait -= dt;
      if (this.wait <= 0) {
        const names = Object.keys(DEFS).filter((n) => n !== this.last);
        this.start(names[Math.floor(Math.random() * names.length)]);
      }
    }
  }
}
