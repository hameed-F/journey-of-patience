import * as THREE from 'three';
import { SURAHS } from './config.js';

function haloTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d');
  const gr = x.createRadialGradient(64, 64, 4, 64, 64, 62);
  gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}
const HALO = haloTexture();
const halo = (color, size) => {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: HALO, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.85 }));
  s.scale.set(size, size, 1);
  return s;
};
const lam = (c, e = 0) => new THREE.MeshLambertMaterial({ color: c, emissive: e });

function namePlate(s) {
  const c = document.createElement('canvas'); c.width = 320; c.height = 120;
  const x = c.getContext('2d');
  x.fillStyle = 'rgba(8,40,40,0.82)';
  x.beginPath(); x.roundRect ? x.roundRect(4, 4, 312, 112, 26) : x.rect(4, 4, 312, 112); x.fill();
  x.strokeStyle = '#ffd36b'; x.lineWidth = 5; x.stroke();
  x.fillStyle = '#fff3c4'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = 'bold 54px "Amiri","Noto Naskh Arabic","Traditional Arabic","Geeza Pro",serif';
  x.fillText(s.arabic, 160, 52);
  x.font = '600 24px system-ui, sans-serif';
  x.fillText(s.name, 160, 96);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
  sp.scale.set(1.9, 0.71, 1);
  return sp;
}

// Three unique designs: 0 hourglass (time), 1 crescent + star, 2 eight-pointed star
const DESIGNS = [
  () => { // Al-Asr: hourglass
    const g = new THREE.Group();
    const glass = lam(0x16c784, 0x063d2a), gold = lam(0xffd36b, 0x6b4a00);
    const top = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.62, 10), glass); top.position.y = 0.32; top.rotation.x = Math.PI;
    const bot = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.62, 10), glass); bot.position.y = -0.32;
    const capT = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.1, 10), gold); capT.position.y = 0.66;
    const capB = capT.clone(); capB.position.y = -0.66;
    const sand = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.3, 10), new THREE.MeshBasicMaterial({ color: 0xffe08a })); sand.position.y = -0.5;
    g.add(top, bot, capT, capB, sand);
    return { body: g, halo: 0x6dffb0 };
  },
  () => { // Ash-Sharh: crescent with star
    const g = new THREE.Group();
    const gold = lam(0xffd36b, 0x6b4a00);
    const cres = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.15, 8, 24, Math.PI * 1.6), gold);
    cres.rotation.z = Math.PI * 0.7;
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.2), new THREE.MeshBasicMaterial({ color: 0x6fb3ff }));
    star.position.set(0.12, 0, 0);
    g.add(cres, star);
    return { body: g, halo: 0x6fb3ff };
  },
  () => { // Al-Ikhlas: eight-pointed star
    const g = new THREE.Group();
    const a = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.85, 0.16), lam(0xfff3c4, 0x6b5a30));
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.85, 0.16), lam(0xffd36b, 0x6b4a00)); b.rotation.z = Math.PI / 4; b.position.z = 0.02;
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff6b8a })); core.position.z = 0.12;
    g.add(a, b, core);
    return { body: g, halo: 0xff9ab0 };
  },
];

export function makeSurah(s) {
  const g = new THREE.Group();
  const d = DESIGNS[s.id % DESIGNS.length]();
  d.body.scale.setScalar(1.25);
  const plate = namePlate(s); plate.position.y = 1.15;
  g.add(halo(d.halo, 3.0), d.body, plate);
  g.userData = { kind: 'surah', id: s.id, spin: d.body, baseY: 1.15, phase: Math.random() * 6, inUse: false };
  g.visible = false;
  return g;
}

export function makeZamzam() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.75, 12), new THREE.MeshLambertMaterial({ color: 0x3aa8ff, emissive: 0x0a3a66, transparent: true, opacity: 0.92 }));
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 0.2, 10), lam(0x3aa8ff)); neck.position.y = 0.47;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.1, 10), lam(0xffffff)); cap.position.y = 0.62;
  const bottle = new THREE.Group(); bottle.add(body, neck, cap); bottle.scale.setScalar(1.2);
  g.add(halo(0x6fd0ff, 2.6), bottle);
  g.userData = { kind: 'zamzam', spin: bottle, baseY: 1.0, phase: Math.random() * 6, inUse: false };
  g.visible = false;
  return g;
}

export const makeAllSurahs = () => SURAHS.map(makeSurah);
