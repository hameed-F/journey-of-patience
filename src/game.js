import * as THREE from 'three';
import { CFG, SURAHS, TIERS, tierFor, speedFor } from './config.js';
import { Player } from './player.js';
import { World } from './world.js';
import { Spawner } from './spawner.js';
import { Events } from './events.js';
import * as UI from './ui.js';
import * as ACH from './achievements.js';
import { sfx, ambience, tilawat } from './audio.js';
import { music } from './music.js';
import { storage } from './storage.js';

const { damp, clamp } = THREE.MathUtils;
const FW_COLORS = [0xffd36b, 0x6dffb0, 0xffffff, 0xff9ab0, 0x6fb3ff];
const defaultMods = () => ({ gapMul: 1, calm: false, forceCat: null, rush: false, surahMul: 1 });

export class Game {
  constructor(scene, camera, gltf, env, fx) {
    this.scene = scene; this.camera = camera; this.env = env; this.fx = fx;
    this.world = new World(scene);
    this.player = new Player(scene, gltf);
    this.spawner = new Spawner(scene);
    this.events = new Events(this);
    env.follow = this.player.root;

    const q = new URLSearchParams(location.search);
    this.startOffset = Number(q.get('t')) || 0;      // debug: ?t=75 starts 75 s into the run

    this.state = 'menu';       // menu | playing | paused | over | victory
    this.camX = 0; this.camY = CFG.camHeight; this.camZ = CFG.camDist;
    this.lookX = 0; this.lookY = 1.1; this.lookZ = -9;
    this.bank = 0; this.fov = camera.fov; this.fovKick = 0; this.shake = 0; this.slow = 0;
    this.reset();
  }

  reset() {
    this.speed = CFG.menuSpeed;
    this.time = 0; this.tier = 0;
    this.distance = 0;
    this.lives = CFG.maxLives;
    this.collected = new Set();                 // finished Surahs (ids)
    this.startSurah = this.startSurah || 0;
    this.order = [0, 1, 2].map((i) => (this.startSurah + i) % SURAHS.length);   // chosen level first, then the other two
    this.step = 0; this.doneList = []; this.totalAyahs = 0;
    this.surah = this.order[0]; this.ayahGot = new Set();   // current Surah and its collected ayah numbers
    this.usedZam = false;
    this.invincible = 0; this.shield = 0; this.sabr = 0;
    this.vt = 0; this.fwT = 0; this.victoryShown = false;
    this.mods = defaultMods();
    this.player.reset();
    this.spawner.reset();
    this.events.reset();
    UI.setHearts(this.lives, true);
    UI.setSurahs(this.collected);
    UI.setAyahs(this.surah, this.ayahGot);
    UI.setTotalAyahs(0);
    UI.setSabr(0, false);
    UI.setDistance(0);
    UI.setTier(TIERS[0].name, true);
  }

  // ----- state changes -----
  start(surahId) {
    if (surahId !== undefined) this.startSurah = surahId;
    this.env.reset();
    this.reset();
    this.time = this.startOffset;
    this.env.tod = (this.env.tod + this.time / CFG.dayCycle) % 1;
    this.tier = tierFor(this.time);
    this.speed = speedFor(this.time);
    UI.setTier(TIERS[this.tier].name, true);
    this.state = 'playing';
    UI.show(null);
    UI.hud(true);
    music.restart();
    this.enterLevel(true);
  }

  // glow + chime when a Surah level begins
  enterLevel(first) {
    const S = SURAHS[this.surah], p = this.player;
    UI.levelGlow(S, this.step + 1);
    if (!first) {
      sfx.level();
      UI.flash('rgba(255,236,160,.5)');
      this.fovKick = 14;
      this.fx.emit(p.x, 1.2, -1, 90, 0xfff3c4, { speed: 9, up: 3, life: 1.6, grav: -1, spread: 4 });
      this.fx.emit(p.x, 0.3, -2, 60, 0x7ac0ff, { speed: 5, up: 5, life: 1.8, grav: -2, spread: 3 });
    }
  }

  toMenu() {
    tilawat.stop();
    this.env.reset();
    this.reset();
    this.state = 'menu';
    UI.hud(false);
    UI.setLevelGlow(false);
    UI.show('menu');
  }

  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    ambience.rain(false);
    UI.show('pause');
  }

  resume() {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    if (this.events.cur === 'rain') ambience.rain(true);
    UI.show(null);
  }

  gameOver() {
    this.state = 'over';
    this.player.die();
    this.events.end(true);
    sfx.over();
    UI.flash('rgba(120,0,0,.45)');
    const score = Math.floor(this.distance);
    if (score > storage.get().best) storage.set({ best: score });
    setTimeout(() => {
      if (this.state === 'over') {
        UI.hud(false);
        UI.showOver({ score, best: storage.get().best, surahs: this.collected.size, recap: this.recap(), names: this.doneList.map((i) => SURAHS[i].name) });
        if (this.doneList.length) {
          if (storage.get().sound) tilawat.start(UI.tilawatStatus, this.doneList);
          else UI.tilawatStatus('Sound is off. Tap Listen to hear the Surah you completed.');
        }
      }
    }, 1000);
  }

  victory() {
    this.state = 'victory';
    this.player.celebrate();
    this.events.end(true);
    sfx.win();
    UI.flash('rgba(255,211,107,.55)');
    UI.banner('الحمد لله', 'Journey complete');
    ACH.unlock('journey');
    if (this.lives >= CFG.maxLives) ACH.unlock('perfect');
    if (!this.usedZam) ACH.unlock('independent');
    if (this.time >= 90) ACH.unlock('resilient');
    const score = Math.floor(this.distance);
    if (score > storage.get().best) storage.set({ best: score });
  }

  // every ayah of the Surahs finished (or being finished) in this run, for the end screens
  recap() {
    const out = [];
    for (const id of this.order) {
      const S = SURAHS[id];
      const got = id === this.surah && !this.collected.has(id) ? this.ayahGot : this.collected.has(id) ? new Set(S.ayat.map((_, i) => i + 1)) : new Set();
      for (const n of [...got].sort((a, b) => a - b)) out.push({ s: S.name, n, ...S.ayat[n - 1] });
    }
    return out;
  }

  // ----- input -----
  moveLane(d) { if (this.state === 'playing' && this.player.moveLane(d)) sfx.click(); }
  jump() { if (this.state === 'playing' && this.player.jump()) sfx.jump(); }
  slide() { if (this.state === 'playing' && this.player.slide()) sfx.slide(); }

  // ----- events coming from the spawner -----
  handle(ev) {
    const p = this.player;
    switch (ev.kind) {
      case 'hit':
        this.lives--;
        UI.setHearts(this.lives);
        sfx.hit(ev.cat);
        this.shake = 1; this.slow = 0.14;
        this.fx.emit(p.x, 1.0, 0.2, 38, 0xff8a3d, { speed: 6, up: 2, life: 0.7 });
        this.fx.emit(p.x, 1.0, 0.2, 14, 0xffffff, { speed: 4, up: 1, life: 0.5 });
        UI.flash('rgba(255,60,60,.38)');
        UI.hitNote(`You were hit by ${ev.label || 'a distraction'}`, ev.cat);
        if (this.lives <= 0) { this.gameOver(); return; }
        p.hit();
        this.invincible = CFG.invincible;
        break;
      case 'near':
        UI.toast('شكراً لله', true);
        sfx.near();
        this.fovKick = 6;
        this.fx.emit(p.x, 1.1, 0.4, 10, 0xffffff, { speed: 3, up: 0.5, life: 0.4, grav: 0 });
        break;
      case 'ayah': {
        const S = SURAHS[ev.surah];
        if (ev.surah !== this.surah || this.ayahGot.has(ev.n)) break;
        this.ayahGot.add(ev.n);
        this.totalAyahs++;
        UI.setTotalAyahs(this.totalAyahs);
        UI.showAyah(S, ev.n);
        UI.setAyahs(this.surah, this.ayahGot, ev.n);
        sfx.ayah(ev.n);
        this.fx.emit(ev.x, ev.y, ev.z, 40, 0xffd36b, { speed: 5, up: 2, life: 1.0, grav: 4 });
        this.fx.emit(p.x, 1.2, 0, 16, 0xfff3c4, { speed: 3, up: 3, life: 0.9, grav: 2 });
        if (this.ayahGot.size >= S.ayahs) {                      // the whole Surah is complete
          this.collected.add(this.surah);
          this.doneList.push(this.surah);
          storage.set({ done: { ...storage.get().done, [this.surah]: true } });
          UI.setSurahs(this.collected, this.surah);
          UI.toast(`${S.name} complete`);
          sfx.collect();
          this.fx.emit(p.x, 1.2, 0, 70, 0xffd36b, { speed: 6, up: 3, life: 1.2, grav: 3 });
          UI.flash('rgba(255,211,107,.28)');
          if (this.collected.size === 1) ACH.unlock('first');
          if (this.collected.size === 2) ACH.unlock('determined');
          if (this.collected.size >= SURAHS.length) { this.victory(); break; }
          this.step++; this.surah = this.order[this.step]; this.ayahGot = new Set();
          UI.setAyahs(this.surah, this.ayahGot);
          this.enterLevel(false);
        }
        break;
      }
      case 'zamzam':
        this.lives = Math.min(CFG.maxLives, this.lives + 1);
        this.usedZam = true;
        UI.setHearts(this.lives);
        UI.toast('Zamzam: +1 life');
        UI.flash('rgba(90,190,255,.32)');
        sfx.zamzam();
        this.fx.emit(p.x, 0.2, 0, 50, 0x6fd0ff, { speed: 1.6, up: 3.5, life: 1.3, grav: -1.5, spread: 3 });
        this.fx.emit(p.x, 1.0, 0, 18, 0xffffff, { speed: 2, up: 2, life: 0.9, grav: -0.5 });
        break;
      case 'date':
        if (this.shield > 0) { sfx.date(9); break; }
        this.sabr++;
        sfx.date(this.sabr);
        this.fx.emit(ev.x, ev.y, ev.z, 6, 0xffd36b, { speed: 2, up: 1.5, life: 0.5, grav: 2 });
        if (this.sabr >= CFG.sabrMax) {
          this.sabr = 0; this.shield = CFG.sabrShield;
          UI.toast('Sabr: patience protects you');
          UI.flash('rgba(255,211,107,.35)');
          sfx.sabr();
          this.fx.emit(p.x, 0.3, 0, 60, 0xffd36b, { speed: 5, up: 3, life: 1.2, grav: 1 });
          ACH.unlock('sabr');
        }
        UI.setSabr(this.sabr / CFG.sabrMax, this.shield > 0);
        break;
      case 'cue': sfx.cue(ev.name); break;
      case 'land': sfx.land(); this.shake = Math.max(this.shake, 0.2); break;
      default: break;
    }
  }

  // ----- per frame -----
  update(rawDt) {
    if (this.state === 'paused') return;
    let dt = rawDt;
    if (this.slow > 0) { this.slow -= rawDt; dt *= 0.35; }
    const s = this.state;

    if (s === 'playing') {
      this.time += dt;
      const ti = tierFor(this.time);
      if (ti !== this.tier) {
        this.tier = ti;
        UI.setTier(TIERS[ti].name);
        UI.toast(`Difficulty: ${TIERS[ti].name}`);
      }
      this.speed = speedFor(this.time);
      this.distance += this.speed * dt;
      this.invincible = Math.max(0, this.invincible - dt);
      if (this.shield > 0) {
        this.shield = Math.max(0, this.shield - dt);
        if (this.shield === 0) UI.setSabr(0, false);
      }
      UI.setDistance(Math.floor(this.distance));
      if (this.time >= 60 && !this.beginnerDone) { this.beginnerDone = true; ACH.unlock('beginner'); }
      this.events.update(dt);
    } else if (s === 'menu') {
      this.speed = CFG.menuSpeed;
    } else {
      this.speed = Math.max(0, this.speed - CFG.stopDecel * dt);   // over / victory: glide to a stop
    }
    if (s !== 'playing') this.beginnerDone = this.time >= 60;

    this.world.update(dt, this.speed);
    this.player.setRunSpeed(this.speed);
    this.player.update(dt, this.invincible, this.shield);

    const ctx = {
      ti: this.tier, mods: this.mods, speed: this.speed, lives: this.lives, collected: this.collected, surah: Math.min(this.surah, SURAHS.length - 1), ayahGot: this.ayahGot,
    };
    if (s === 'playing') {
      for (const ev of this.spawner.update(dt, this.speed, ctx, true)) this.handle(ev);
      if (this.state === 'playing') {
        for (const ev of this.spawner.collide(this.player, this.invincible <= 0 && this.shield <= 0)) {
          this.handle(ev);
          if (this.state !== 'playing') break;
        }
      }
    } else if (s === 'over' || s === 'victory') {
      this.spawner.update(dt, this.speed, ctx, false);
    }

    if (this.state === 'victory') this.victoryTick(dt);

    if (s === 'playing') {
      this.sparkT = (this.sparkT || 0) - dt;
      const a = this.spawner.ayahOnField();
      if (a && this.sparkT <= 0) {
        this.sparkT = 0.12;
        this.fx.emit(a.position.x + (Math.random() - 0.5) * 1.2, a.position.y + (Math.random() - 0.5) * 1.2, a.position.z, 1, a.userData.theme, { speed: 0.6, up: 0.8, life: 0.8, grav: -0.5 });
      }
    }
    this.env.update(dt);
    this.fx.update(dt);
    this.updateCamera(dt);
  }

  victoryTick(dt) {
    this.vt += dt;
    this.fwT -= dt;
    if (this.fwT <= 0 && this.vt > 0.4) {
      this.fwT = 0.35 + Math.random() * 0.25;
      const c = FW_COLORS[Math.floor(Math.random() * FW_COLORS.length)];
      this.fx.firework(this.player.x + (Math.random() - 0.5) * 8, 3 + Math.random() * 4, -3 - Math.random() * 6, c);
      sfx.firework();
    }
    if (this.vt > 0.3 && Math.random() < dt * 14) this.fx.emit(this.player.x, 0.2, 0, 2, 0xffd36b, { speed: 1.5, up: 3, life: 1.2, grav: -1 });
    if (this.vt > 2.6 && !this.victoryShown) {
      this.victoryShown = true;
      UI.hud(false);
      UI.showVictory({ score: Math.floor(this.distance), recap: this.recap() });
      if (storage.get().sound) tilawat.start(UI.tilawatStatus, this.doneList);   // autoplay; the button replays it
      else UI.tilawatStatus('Sound is off. Tap Replay Tilawat to listen.');
    }
  }

  updateCamera(dt) {
    const p = this.player, cam = this.camera;
    const win = this.state === 'victory';
    this.fovKick = damp(this.fovKick, 0, 6, dt);

    if (win) {
      // victory: slow orbit around the boy
      const a = 0.25 + this.vt * 0.5;
      const tx = p.x + Math.sin(a) * 4.4, ty = 1.6 + Math.sin(this.vt * 0.8) * 0.25, tz = Math.cos(a) * 4.4;
      this.camX = damp(this.camX, tx, 3, dt); this.camY = damp(this.camY, ty, 3, dt); this.camZ = damp(this.camZ, tz, 3, dt);
      this.lookX = damp(this.lookX, p.x, 6, dt); this.lookY = damp(this.lookY, 1.0, 6, dt); this.lookZ = damp(this.lookZ, 0, 6, dt);
      cam.position.set(this.camX, this.camY, this.camZ);
      cam.lookAt(this.lookX, this.lookY, this.lookZ);
      this.bank = damp(this.bank, 0, 6, dt);
      this.fov = damp(this.fov, 55, 3, dt);
    } else {
      const tx = p.x * 0.65, ty = CFG.camHeight + p.y * 0.35;
      this.camX = damp(this.camX, tx, 5, dt); this.camY = damp(this.camY, ty, 5, dt); this.camZ = damp(this.camZ, CFG.camDist, 5, dt);
      this.lookX = damp(this.lookX, p.x * 0.8, 6, dt); this.lookY = damp(this.lookY, 1.1 + p.y * 0.3, 6, dt); this.lookZ = damp(this.lookZ, -9, 4, dt);
      let sx = 0, sy = 0;
      if (this.shake > 0) {
        this.shake = Math.max(0, this.shake - dt * 1.6);
        sx = (Math.random() - 0.5) * this.shake * 0.7; sy = (Math.random() - 0.5) * this.shake * 0.7;
      }
      cam.position.set(this.camX + sx, this.camY + sy, this.camZ);
      cam.lookAt(this.lookX, this.lookY, this.lookZ);
      this.bank = damp(this.bank, clamp(-p.vx * 0.012, -0.14, 0.14), 6, dt);
      cam.rotateZ(this.bank);
      this.fov = damp(this.fov, 60 + (this.speed - 14) * 0.4, 3, dt);
    }
    const f = this.fov + this.fovKick;
    if (Math.abs(cam.fov - f) > 0.02) { cam.fov = f; cam.updateProjectionMatrix(); }
  }
}
