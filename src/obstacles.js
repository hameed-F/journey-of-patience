// Obstacle catalogue: 6 categories, 30 obstacles, all built from simple primitives (low-poly).
// act:  'low'  -> jump over it   'high' -> slide under it   'full' -> change lane
// hd:   half-depth along z      spin: looks fine rotating   long/gantry: not moved sideways
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const gcache = new Map();
const G = (k, mk) => { let g = gcache.get(k); if (!g) { g = mk(); gcache.set(k, g); } return g; };
const mcache = new Map();
const M = (c, o = {}) => {
  const k = `${c}|${o.b ? 1 : 0}|${o.e || 0}|${o.op || 1}`;
  let m = mcache.get(k);
  if (!m) {
    const t = (o.op || 1) < 1;
    m = o.b
      ? new THREE.MeshBasicMaterial({ color: c, transparent: t, opacity: o.op || 1 })
      : new THREE.MeshLambertMaterial({ color: c, emissive: o.e || 0, transparent: t, opacity: o.op || 1 });
    mcache.set(k, m);
  }
  return m;
};
const put = (m, x, y, z, o) => {
  m.position.set(x, y, z);
  if (o.rx) m.rotation.x = o.rx;
  if (o.ry) m.rotation.y = o.ry;
  if (o.rz) m.rotation.z = o.rz;
  if (o.s) m.scale.set(...o.s);
  return m;
};
const box = (w, h, d, c, x = 0, y = 0, z = 0, o = {}) => put(new THREE.Mesh(G(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d)), M(c, o)), x, y, z, o);
const cyl = (rt, rb, h, c, x = 0, y = 0, z = 0, o = {}) => put(new THREE.Mesh(G(`c${rt},${rb},${h}`, () => new THREE.CylinderGeometry(rt, rb, h, 12)), M(c, o)), x, y, z, o);
const sph = (r, c, x = 0, y = 0, z = 0, o = {}) => put(new THREE.Mesh(G(`s${r}`, () => new THREE.SphereGeometry(r, 10, 8)), M(c, o)), x, y, z, o);
const cone = (r, h, c, x = 0, y = 0, z = 0, o = {}) => put(new THREE.Mesh(G(`n${r},${h}`, () => new THREE.ConeGeometry(r, h, 8)), M(c, o)), x, y, z, o);
const tor = (R, r, c, x = 0, y = 0, z = 0, o = {}, arc = Math.PI * 2) => put(new THREE.Mesh(G(`t${R},${r},${arc}`, () => new THREE.TorusGeometry(R, r, 8, 16, arc)), M(c, o)), x, y, z, o);
const oct = (r, c, x = 0, y = 0, z = 0, o = {}) => put(new THREE.Mesh(G(`o${r}`, () => new THREE.OctahedronGeometry(r)), M(c, o)), x, y, z, o);
const pln = (w, h, c, x = 0, y = 0, z = 0, o = {}) => put(new THREE.Mesh(G(`p${w},${h}`, () => new THREE.PlaneGeometry(w, h)), M(c, o)), x, y, z, o);
const grp = (...a) => { const g = new THREE.Group(); g.add(...a); return g; };
const posts = (w, h = 1.2, c = 0x2b2f36) => [box(0.12, h, 0.12, c, -w / 2 + 0.1, h / 2, 0), box(0.12, h, 0.12, c, w / 2 - 0.1, h / 2, 0)];

function car(color, taxi = false) {
  const parts = [
    box(1.7, 0.9, 3.0, color, 0, 0.75, 0),
    box(1.5, 0.8, 1.8, color, 0, 1.6, -0.1),
    box(1.52, 0.5, 1.5, 0x1c2a3a, 0, 1.62, -0.1),
    sph(0.16, 0xfff3a0, -0.55, 0.8, 1.5, { b: 1 }), sph(0.16, 0xfff3a0, 0.55, 0.8, 1.5, { b: 1 }),
    box(1.6, 0.14, 0.1, 0x222222, 0, 0.4, 1.52),
  ];
  for (const x of [-0.88, 0.88]) for (const z of [-1.0, 1.0]) parts.push(cyl(0.34, 0.34, 0.3, 0x15171c, x, 0.34, z, { rz: Math.PI / 2 }));
  if (taxi) parts.push(box(0.6, 0.22, 0.3, 0xffffff, 0, 2.1, -0.1), box(0.5, 0.12, 0.05, 0x111111, 0, 2.1, 0.06, { b: 1 }));
  return grp(...parts);
}

export const CATS = {
  digital: 'Digital addiction', habits: 'Harmful habits', material: 'Materialistic distraction',
  negative: 'Negative behaviour', neglect: 'Neglect & procrastination', env: 'Environmental',
};

// ---------- the rolling sin rock ----------
export const ROCK_SINS = ['GOSSIP', 'LYING', 'ANGER', 'ARROGANCE', 'GREED', 'ENVY', 'LAZINESS', 'WASTE'];
export const ROCK_LABEL = ['gossip', 'lying', 'anger', 'arrogance', 'greed', 'envy', 'laziness', 'wastefulness'];

function rockTexture(text) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = '#76767c'; x.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 1400; i++) { x.fillStyle = ['#8a8a90', '#66666b', '#7e7e84', '#5b5b60'][i % 4]; x.fillRect(Math.random() * 512, Math.random() * 256, 2 + Math.random() * 6, 2 + Math.random() * 6); }
  for (let i = 0; i < 18; i++) { x.fillStyle = 'rgba(70,110,60,.22)'; x.beginPath(); x.arc(Math.random() * 512, Math.random() * 256, 8 + Math.random() * 22, 0, 7); x.fill(); }
  x.strokeStyle = 'rgba(30,30,34,.55)'; x.lineWidth = 2;
  for (let i = 0; i < 9; i++) { x.beginPath(); let px = Math.random() * 512, py = Math.random() * 256; x.moveTo(px, py); for (let k = 0; k < 6; k++) { px += (Math.random() - 0.5) * 40; py += (Math.random() - 0.5) * 40; x.lineTo(px, py); } x.stroke(); }
  x.textAlign = 'center'; x.textBaseline = 'middle';
  for (const u of [0.25, 0.75]) {                       // the text runs pole-to-pole so it reads upright as the rock rolls
    x.save(); x.translate(u * 512, 128); x.rotate(ROCK_ROT);
    let size = 58; x.font = `900 ${size}px system-ui, Arial, sans-serif`;
    const w = x.measureText(text).width; if (w > 165) { size = Math.floor(size * 165 / w); x.font = `900 ${size}px system-ui, Arial, sans-serif`; }
    x.lineJoin = 'round'; x.lineWidth = 10; x.strokeStyle = '#6b0d0d'; x.strokeText(text, 0, 0);
    x.fillStyle = '#fff1e0'; x.fillText(text, 0, 0);
    x.restore();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
const ROCK_ROT = Math.PI / 2;
export const ROCK_MATS = ROCK_SINS.map((s) => new THREE.MeshLambertMaterial({ map: rockTexture(s) }));
function rockMesh() {
  const g = new THREE.SphereGeometry(1, 22, 16);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {                   // lumpy but seamless (depends only on position)
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = 1 + 0.07 * Math.sin(x * 5 + y * 3) * Math.cos(z * 4 + x * 2) + 0.03 * Math.sin(y * 9 + z * 7);
    p.setXYZ(i, x * k, y * k, z * k);
  }
  g.computeVertexNormals();
  g.rotateZ(Math.PI / 2);                               // poles on the x axis = the rolling axis
  const m = new THREE.Mesh(g, ROCK_MATS[0]);
  m.scale.setScalar(0.95);
  m.position.y = 0.95;
  return m;
}

// act: 'low' jump over, 'high' slide under, 'full' change lane. Only a few, all obviously hostile.
export const ENTRIES = [
  { id: 'phone', cat: 'digital', act: 'full', cue: 'notify', build: () => grp(
      box(1.3, 2.2, 0.3, 0x1b1f2a, 0, 1.1, 0), pln(1.1, 1.9, 0x4aa3ff, 0, 1.1, 0.16, { b: 1 }), sph(0.2, 0xff3b3b, 0.5, 1.9, 0.2, { b: 1 }),
      box(0.5, 0.08, 0.02, 0xffffff, 0, 1.5, 0.17, { b: 1 }), box(0.7, 0.08, 0.02, 0xffffff, 0, 1.25, 0.17, { b: 1 })) },
  { id: 'tv', cat: 'digital', act: 'high', gantry: true, build: () => grp(
      ...posts(1.6), box(1.6, 0.95, 0.25, 0x15181d, 0, 1.55, 0), pln(1.4, 0.75, 0x6fd0ff, 0, 1.55, 0.13, { b: 1 }), box(0.5, 0.06, 0.02, 0xffffff, 0, 1.4, 0.14, { b: 1 })) },
  { id: 'bottle', cat: 'habits', act: 'low', build: () => { const g = grp(
      cyl(0.3, 0.3, 0.55, 0xb5651d, 0, 0.275, 0), cyl(0.12, 0.16, 0.25, 0xb5651d, 0, 0.675, 0), cyl(0.14, 0.14, 0.06, 0xc0392b, 0, 0.8, 0), cyl(0.305, 0.305, 0.2, 0xf4ecd8, 0, 0.28, 0)); g.scale.setScalar(1.1); return g; } },
  { id: 'cigarette', cat: 'habits', act: 'low', build: () => grp(
      cyl(0.15, 0.15, 1.5, 0xf4f4f4, 0, 0.17, 0, { rz: Math.PI / 2 }), cyl(0.155, 0.155, 0.45, 0xe0a050, 0.55, 0.17, 0, { rz: Math.PI / 2 }),
      cyl(0.155, 0.155, 0.08, 0xff5a1f, -0.78, 0.17, 0, { rz: Math.PI / 2, b: 1 }), sph(0.16, 0x9a9a9a, -0.85, 0.55, 0, { op: 0.5 }), sph(0.12, 0x9a9a9a, -0.95, 0.78, 0, { op: 0.4 })) },
  { id: 'slot', cat: 'habits', act: 'full', build: () => grp(
      box(1.5, 2.2, 0.8, 0xb01e3c, 0, 1.1, 0), box(1.1, 0.6, 0.1, 0x111111, 0, 1.5, 0.42),
      box(0.3, 0.45, 0.05, 0xffffff, -0.35, 1.5, 0.48, { b: 1 }), box(0.3, 0.45, 0.05, 0xffd36b, 0, 1.5, 0.48, { b: 1 }), box(0.3, 0.45, 0.05, 0xffffff, 0.35, 1.5, 0.48, { b: 1 }),
      sph(0.2, 0xffd36b, 0, 2.3, 0, { b: 1 }), cyl(0.04, 0.04, 0.9, 0x888888, 0.85, 1.4, 0), sph(0.12, 0xff3b3b, 0.85, 1.9, 0, { b: 1 })) },
  { id: 'cart', cat: 'material', act: 'full', build: () => grp(
      box(1.3, 0.9, 0.9, 0xaab4bd, 0, 0.95, 0, { op: 0.55 }), box(1.3, 0.06, 0.06, 0x888888, 0, 1.45, 0.45), box(0.06, 0.5, 0.06, 0x888888, -0.6, 0.35, 0.3), box(0.06, 0.5, 0.06, 0x888888, 0.6, 0.35, 0.3),
      box(0.8, 0.5, 0.6, 0xe0409a, 0, 1.65, 0), box(0.6, 0.5, 0.5, 0xffd36b, 0, 2.15, 0), sph(0.1, 0x222222, -0.6, 0.1, 0.3), sph(0.1, 0x222222, 0.6, 0.1, 0.3)) },
  { id: 'anger', cat: 'negative', act: 'high', spin: true, build: () => grp(
      sph(0.5, 0x2e1a28, -0.5, 1.5, 0), sph(0.65, 0x241320, 0, 1.7, 0.1), sph(0.5, 0x2e1a28, 0.5, 1.5, 0), sph(0.4, 0x3a1c2a, 0, 1.4, 0.3),
      box(0.3, 0.08, 0.05, 0xff3b3b, -0.25, 1.65, 0.7, { rz: -0.5, b: 1 }), box(0.3, 0.08, 0.05, 0xff3b3b, 0.25, 1.65, 0.7, { rz: 0.5, b: 1 }),
      sph(0.07, 0xff3b3b, -0.25, 1.5, 0.72, { b: 1 }), sph(0.07, 0xff3b3b, 0.25, 1.5, 0.72, { b: 1 }), box(0.12, 0.5, 0.1, 0xffe14d, 0, 1.05, 0.5, { rz: 0.4, b: 1 })) },
  { id: 'alarm', cat: 'neglect', act: 'low', spin: true, build: () => grp(
      cyl(0.36, 0.36, 0.3, 0xd62828, 0, 0.38, 0, { rx: Math.PI / 2 }), cyl(0.3, 0.3, 0.02, 0xffffff, 0, 0.38, 0.16, { rx: Math.PI / 2, b: 1 }),
      box(0.04, 0.25, 0.02, 0x111111, 0, 0.45, 0.18, { b: 1 }), sph(0.12, 0xffd36b, -0.25, 0.68, 0), sph(0.12, 0xffd36b, 0.25, 0.68, 0), box(0.05, 0.5, 0.03, 0x111111, 0.12, 0.38, 0.19, { rz: 0.6, b: 1 })) },
  { id: 'barrier', cat: 'env', act: 'low', hd: 0.25, build: () => grp(
      box(1.9, 0.7, 0.5, 0xff7a2f, 0, 0.55, 0), box(0.3, 0.72, 0.52, 0xffffff, -0.5, 0.55, 0), box(0.3, 0.72, 0.52, 0xffffff, 0.5, 0.55, 0), box(0.12, 0.3, 0.4, 0x333a44, -0.7, 0.15, 0), box(0.12, 0.3, 0.4, 0x333a44, 0.7, 0.15, 0)) },
  { id: 'car', cat: 'env', act: 'full', hd: 1.4, long: true, cue: 'horn', build: () => car(0xd62839) },
  { id: 'cratestack', cat: 'env', act: 'full', build: () => grp(
      box(1.0, 1.0, 1.0, 0xc79a5a, -0.2, 0.5, 0), box(1.0, 1.0, 1.0, 0xb8894a, 0.3, 0.5, 0.05, { ry: 0.15 }), box(1.0, 1.0, 1.0, 0xc79a5a, 0.05, 1.5, 0, { ry: -0.1 }), box(0.9, 0.9, 0.9, 0xb8894a, 0.05, 2.45, 0, { ry: 0.2 })) },
  { id: 'construction', cat: 'env', act: 'high', gantry: true, build: () => grp(
      ...posts(1.9, 1.4, 0x555555), box(1.9, 0.35, 0.3, 0xffd400, 0, 1.55, 0), box(0.3, 0.37, 0.32, 0x111111, -0.55, 1.55, 0), box(0.3, 0.37, 0.32, 0x111111, 0.05, 1.55, 0), box(0.3, 0.37, 0.32, 0x111111, 0.65, 1.55, 0),
      sph(0.14, 0xff8a00, -0.8, 1.85, 0, { b: 1 }), sph(0.14, 0xff8a00, 0.8, 1.85, 0, { b: 1 })) },
  { id: 'rock', cat: 'negative', act: 'full', hd: 0.95, rock: true, cue: 'rumble', build: rockMesh },
];

const LABEL = {
  phone: 'digital addiction', tv: 'digital addiction', bottle: 'a harmful habit', cigarette: 'a harmful habit', slot: 'gambling',
  cart: 'materialism', anger: 'anger', alarm: 'procrastination', barrier: 'a road hazard', car: 'traffic', cratestack: 'a road hazard', construction: 'a road hazard',
  rock: 'a sin',
};
for (const e of ENTRIES) e.label = LABEL[e.id] || 'a distraction';

export const BY_ACT = { low: [], high: [], full: [] };
for (const e of ENTRIES) { e.hd = e.hd || 0.35; BY_ACT[e.act].push(e); }

// Merge every obstacle into one mesh per material (3-6 draw calls instead of 10-20) - important on phones.
export function bake(group) {
  const byMat = new Map();
  for (const c of [...group.children]) {
    if (!c.isMesh) continue;
    c.updateMatrix();
    const g = (c.geometry.index ? c.geometry.toNonIndexed() : c.geometry.clone()).applyMatrix4(c.matrix);
    g.deleteAttribute('uv');
    if (!byMat.has(c.material)) byMat.set(c.material, []);
    byMat.get(c.material).push(g);
    group.remove(c);
  }
  for (const [mat, geos] of byMat) {
    const merged = mergeGeometries(geos);
    if (merged) group.add(new THREE.Mesh(merged, mat));
  }
  return group;
}
