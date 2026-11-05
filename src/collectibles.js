import * as THREE from 'three';
import { SURAHS } from './config.js';

const PI = Math.PI;
const NUM = '٠١٢٣٤٥٦٧٨٩';
const arNum = (n) => String(n).split('').map((d) => NUM[+d]).join('');

function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 2, 64, 64, 62);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}
export const SOFT = glowTexture();

// ---------------------------------------------------------------- ayah markers
// A circled Arabic number (the end-of-ayah ornament), one colour theme per Surah.
const THEMES = [
  { a: '#17b890', b: '#8ff5cf', glow: 0x6dffb0 },   // Al-Asr
  { a: '#2f86e8', b: '#9fe0ff', glow: 0x7ac0ff },   // Ash-Sharh
  { a: '#d9487a', b: '#ffb3cf', glow: 0xff9ab0 },   // Al-Ikhlas
];

const FONT = '"Amiri","Noto Naskh Arabic","Traditional Arabic","Geeza Pro",serif';
function wrap(x, text, maxW) {
  const words = text.split(' '), lines = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (cur && x.measureText(t).width > maxW) { lines.push(cur); cur = w; } else cur = t; }
  lines.push(cur); return lines;
}
// A glowing crystal that carries the real ayah text
function crystal(theme, text, n) {
  const W = 256, H = 320, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  const path = () => { x.beginPath(); x.moveTo(128, 6); x.lineTo(236, 70); x.lineTo(236, 250); x.lineTo(128, 314); x.lineTo(20, 250); x.lineTo(20, 70); x.closePath(); };
  const g = x.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, theme.a); g.addColorStop(0.5, theme.b); g.addColorStop(1, theme.a);
  path(); x.fillStyle = g; x.globalAlpha = 0.88; x.fill(); x.globalAlpha = 1;
  x.save(); path(); x.clip();
  x.fillStyle = 'rgba(255,255,255,.22)'; x.beginPath(); x.moveTo(128, 6); x.lineTo(236, 70); x.lineTo(128, 160); x.lineTo(20, 70); x.fill();
  x.fillStyle = 'rgba(255,255,255,.1)'; x.beginPath(); x.moveTo(20, 70); x.lineTo(128, 160); x.lineTo(128, 314); x.lineTo(20, 250); x.fill();
  x.restore();
  path(); x.lineWidth = 7; x.strokeStyle = '#ffffff'; x.stroke(); x.lineWidth = 2.5; x.strokeStyle = '#ffd36b'; x.translate(128, 160); x.scale(0.93, 0.93); x.translate(-128, -160); path(); x.stroke();
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.fillStyle = '#ffffff'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.direction = 'rtl';
  x.shadowColor = 'rgba(0,40,70,.85)'; x.shadowBlur = 6;
  let size = 46, lines;
  for (; size >= 20; size -= 2) { x.font = `bold ${size}px ${FONT}`; lines = wrap(x, text, 150); if (lines.length * size * 1.45 <= 170) break; }
  const lh = size * 1.45, y0 = 150 - ((lines.length - 1) * lh) / 2;
  lines.forEach((l, i) => x.fillText(l, 128, y0 + i * lh));
  x.shadowBlur = 0; x.fillStyle = '#ffe9a8'; x.font = `bold 30px ${FONT}`;
  x.fillText('\u06DD' + arNum(n), 128, 268);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
const cache = {};
const texFor = (si, n) => cache[si * 100 + n] || (cache[si * 100 + n] = crystal(THEMES[si], SURAHS[si].ayat[n - 1].ar, n));

function beamTexture() {
  const c = document.createElement('canvas'); c.width = 8; c.height = 128;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, '#000'); g.addColorStop(1, '#777');
  x.fillStyle = g; x.fillRect(0, 0, 8, 128);
  return new THREE.CanvasTexture(c);
}
const BEAM = beamTexture();

export function makeAyahMarkers() {
  return THEMES.map((th, si) => {
    const g = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ map: texFor(si, 1), transparent: true, depthWrite: false, side: THREE.DoubleSide });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 2.5), mat);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: SOFT, color: th.glow, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.6 }));
    halo.scale.set(4.4, 4.4, 1);
    const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: SOFT, color: 0xffffff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.3 }));
    core.scale.set(2.0, 2.0, 1);
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.6, 7, 18, 1, true),
      new THREE.MeshBasicMaterial({ map: BEAM, color: th.glow, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide, opacity: 0.4 }));
    plane.renderOrder = 5; halo.renderOrder = 2; core.renderOrder = 3; beam.renderOrder = 1;
    g.add(beam, halo, core, plane);
    g.userData = {
      kind: 'ayah', surah: si, n: 1, baseY: 1.4, phase: Math.random() * 6, inUse: false,
      theme: th.glow,
      setNumber(n) { this.n = n; mat.map = texFor(si, n); },
      animate(t, o) {
        plane.rotation.y = Math.sin(t * 0.7) * 0.28;
        const k = 1 + 0.12 * Math.sin(t * 3.2);
        halo.scale.set(4.4 * k, 4.4 * k, 1);
        core.material.opacity = 0.25 + 0.1 * Math.sin(t * 4.5);
        beam.position.y = 3.5 - o.position.y;          // always stands on the ground
        beam.material.opacity = 0.36 + 0.08 * Math.sin(t * 2.4);
      },
    };
    g.visible = false;
    return g;
  });
}

// ---------------------------------------------------------------- Zamzam
function labelTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, 256, 128);
  x.fillStyle = '#1b6fd1'; x.fillRect(0, 0, 256, 18); x.fillRect(0, 110, 256, 18);
  x.fillStyle = '#0d4aa0'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = 'bold 50px "Amiri","Noto Naskh Arabic","Traditional Arabic","Geeza Pro",serif';
  x.fillText('زمزم', 128, 48);
  x.font = '800 21px system-ui, Arial, sans-serif';
  x.fillText('ZAMZAM', 128, 88);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

export function makeZamzam() {
  const g = new THREE.Group();
  const water = new THREE.MeshLambertMaterial({ color: 0x8fd6ff, emissive: 0x1f6fb0, transparent: true, opacity: 0.88 });
  const white = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x335577 });
  const bottle = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.85, 18), water); body.position.y = 0.45;
  const shoulder = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.32, 0.22, 18), water); shoulder.position.y = 1.0;
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.1, 12), water); neck.position.y = 1.16;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.12, 12), new THREE.MeshLambertMaterial({ color: 0x1b6fd1, emissive: 0x0a2a5a })); cap.position.y = 1.27;
  const label = new THREE.Mesh(new THREE.CylinderGeometry(0.335, 0.335, 0.4, 24, 1, true), new THREE.MeshBasicMaterial({ map: labelTexture(), side: THREE.DoubleSide }));
  label.position.y = 0.5; label.rotation.y = PI;
  bottle.add(body, shoulder, neck, cap, label);
  bottle.scale.setScalar(1.7);

  // floating water drop above the bottle so it reads as "water / health"
  const drop = new THREE.Group();
  const dm = new THREE.MeshBasicMaterial({ color: 0x3aa8ff });
  const dcone = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.42, 16), dm); dcone.position.y = 0.2;
  const dball = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), dm);
  drop.add(dcone, dball); drop.position.y = 2.9;

  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: SOFT, color: 0x6fd0ff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.9 }));
  halo.scale.set(3.6, 3.6, 1); halo.position.y = 0.9;
  g.add(halo, bottle, drop);
  g.userData = {
    kind: 'zamzam', baseY: 0.2, cyOff: 0.8, phase: Math.random() * 6, inUse: false,
    animate(t) {
      bottle.rotation.y = Math.sin(t * 0.6) * 0.3;
      drop.position.y = 2.9 + Math.sin(t * 3) * 0.12;
      const k = 1 + 0.1 * Math.sin(t * 3);
      halo.scale.set(4.4 * k, 4.4 * k, 1);
    },
  };
  g.visible = false;
  return g;
}
