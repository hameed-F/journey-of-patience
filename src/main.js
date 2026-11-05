import './style.css';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { CFG } from './config.js';
import { Game } from './game.js';
import { Env } from './env.js';
import { Particles } from './fx.js';
import { bindInput } from './input.js';
import * as UI from './ui.js';
import { unlock, sfx, tilawat } from './audio.js';
import { music } from './music.js';
import { unlocked } from './achievements.js';
import { storage } from './storage.js';

const $ = (id) => document.getElementById(id);
const canvas = $('game');
const isMobile = matchMedia('(pointer: coarse)').matches;

// ---------- renderer (mobile-friendly) ----------
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile, powerPreference: 'high-performance' });
let pixelRatio = Math.min(window.devicePixelRatio || 1, CFG.maxPixelRatio);
renderer.setPixelRatio(pixelRatio);
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = false;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9fd8ff);
scene.fog = new THREE.Fog(0x9fd8ff, 28, 78);
const hemi = new THREE.HemisphereLight(0xffffff, 0x88aa66, 1.9);
const sun = new THREE.DirectionalLight(0xfff1d0, 1.6);
sun.position.set(6, 12, 8);
const torch = new THREE.PointLight(0xffd9a0, 0, 16, 1.6);     // the boy's lantern light (night / fog)
scene.add(hemi, sun, torch);

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 110);
camera.position.set(0, CFG.camHeight, CFG.camDist);
scene.add(camera);

const env = new Env(scene, camera, hemi, sun, torch);
const fx = new Particles(scene);

addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
});
addEventListener('contextmenu', (e) => e.preventDefault());

// ---------- load character, then start ----------
function loadModel() {
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  return new Promise((resolve) => {
    loader.load(
      CFG.modelUrl,
      (gltf) => resolve(gltf),
      (e) => { if (e.total) UI.setLoad(e.loaded / e.total, 'Loading character…'); },
      (err) => { console.error('Could not load', CFG.modelUrl, err); resolve(null); }
    );
  });
}

let game;
let fpsEl = null;
if (new URLSearchParams(location.search).has('fps')) {
  fpsEl = $('fps');
  fpsEl.classList.remove('hidden');
}

(async function init() {
  UI.buildSlots();
  UI.setBest(storage.get().best);
  UI.setSoundLabel(storage.get().sound);
  UI.setLoad(0.05, 'Loading…');

  if (document.fonts && document.fonts.load) await Promise.race([document.fonts.load('bold 40px Amiri', 'بسم'), new Promise((r) => setTimeout(r, 1500))]).catch(() => {});
  const gltf = await loadModel();
  UI.setLoad(1, 'Ready');
  game = new Game(scene, camera, gltf, env, fx);
  window.__game = game;                       // handy for debugging in the console
  UI.modelWarning(!gltf);
  UI.show('menu');
  wireUI();
  requestAnimationFrame(frame);
})();

// ---------- UI wiring ----------
let level = 0;
function startGame(id) {
  if (typeof id === 'number') level = id;
  unlock();
  tilawat.stop();
  tilawat.prime();            // runs inside a tap, so Tilawat can autoplay on victory
  music.start();
  game.start(level);
}
function toggleSound() {
  const on = !storage.get().sound;
  storage.set({ sound: on });
  UI.setSoundLabel(on);
  music.setEnabled(on);                   // one switch controls music and effects
}

function wireUI() {
  const click = (id, fn) => $(id).addEventListener('click', () => { unlock(); sfx.click(); fn(); });

  const toLevels = () => { UI.buildLevels((id) => { unlock(); sfx.click(); startGame(id); }); UI.show('levels'); };
  click('btn-play', () => (storage.get().tutorialSeen ? toLevels() : UI.show('tutorial')));
  click('btn-levels-back', () => UI.show('menu'));
  click('btn-tutorial', () => UI.show('tutorial'));
  click('btn-tut-start', () => { storage.set({ tutorialSeen: true }); toLevels(); });
  click('btn-tut-back', () => UI.show('menu'));
  click('btn-ach', () => { UI.buildAch(unlocked()); UI.show('ach'); });
  click('btn-ach-back', () => UI.show('menu'));
  click('btn-sound', toggleSound);
  click('btn-sound-pause', toggleSound);
  click('btn-resume', () => game.resume());
  click('btn-restart', () => startGame());
  click('btn-quit', () => { UI.setBest(storage.get().best); game.toMenu(); });
  click('btn-retry', () => startGame());
  click('btn-again', () => startGame());
  const toLevelSelect = () => { UI.setBest(storage.get().best); game.toMenu(); toLevels(); };
  click('btn-over-levels', toLevelSelect);
  const toMenu = () => { UI.setBest(storage.get().best); game.toMenu(); };
  click('btn-over-menu', toMenu);
  click('btn-win-menu', toMenu);
  click('btn-tilawat', () => tilawat.start(UI.tilawatStatus, game.doneList));
  click('btn-over-tilawat', () => tilawat.start(UI.tilawatStatus, game.doneList));   // replay (a tap, so always allowed)

  bindInput(canvas, {
    left: () => game.moveLane(-1),
    right: () => game.moveLane(1),
    jump: () => game.jump(),
    slide: () => game.slide(),
    pause: () => (game.state === 'playing' ? game.pause() : game.state === 'paused' ? game.resume() : null),
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { game.pause(); music.hide(); } else music.show();
  });
}

// the music file starts on the very first tap/key (browsers block sound before that)
const firstGesture = () => { unlock(); music.start(); };
addEventListener('pointerdown', firstGesture, { once: true });
addEventListener('keydown', firstGesture, { once: true });

// ---------- main loop + adaptive resolution ----------
const clock = new THREE.Clock();
let avgMs = 16.7, lastAdjust = 0, lastLower = 0, fpsAcc = 0, fpsFrames = 0;

// Lower the resolution only when the phone really struggles, and win it back when things are smooth again
function adapt(ms, now) {
  avgMs = avgMs * 0.93 + Math.min(ms, 100) * 0.07;
  const maxPR = Math.min(window.devicePixelRatio || 1, CFG.maxPixelRatio);
  if (avgMs > 25 && pixelRatio > CFG.minPixelRatio && now - lastAdjust > 1500) {
    pixelRatio = Math.max(CFG.minPixelRatio, pixelRatio - 0.15); lastAdjust = lastLower = now;
  } else if (avgMs < 18.5 && pixelRatio < maxPR && now - lastLower > 10000 && now - lastAdjust > 4000) {
    pixelRatio = Math.min(maxPR, pixelRatio + 0.15); lastAdjust = now;
  } else return;
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(innerWidth, innerHeight);
}

function frame(now) {
  requestAnimationFrame(frame);
  const raw = clock.getDelta();
  const dt = Math.min(raw, 0.05);
  game.update(dt);
  renderer.render(scene, camera);

  if (game.state === 'playing') adapt(raw * 1000, now);
  if (fpsEl) {
    fpsAcc += raw; fpsFrames++;
    if (fpsAcc > 0.5) {
      fpsEl.textContent = `${Math.round(fpsFrames / fpsAcc)} fps · ×${pixelRatio.toFixed(2)} · ${renderer.info.render.calls} draws · ${game.state === 'playing' ? game.time.toFixed(0) + 's ' + game.events.cur : ''}`;
      fpsAcc = 0; fpsFrames = 0;
    }
  }
}
