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

export const ENTRIES = [
  // ---------- Digital addiction ----------
  { id: 'phone', cat: 'digital', act: 'full', cue: 'notify', build: () => grp(
      box(1.3, 2.2, 0.3, 0x1b1f2a, 0, 1.1, 0), pln(1.1, 1.9, 0x4aa3ff, 0, 1.1, 0.16, { b: 1 }), sph(0.16, 0xff3b3b, 0.45, 1.85, 0.2, { b: 1 })) },
  { id: 'tv', cat: 'digital', act: 'high', gantry: true, build: () => grp(
      ...posts(1.6), box(1.6, 0.95, 0.25, 0x15181d, 0, 1.55, 0), pln(1.4, 0.75, 0x6fd0ff, 0, 1.55, 0.13, { b: 1 })) },
  { id: 'console', cat: 'digital', act: 'low', build: () => grp(
      box(1.3, 0.32, 0.8, 0x20242d, 0, 0.2, 0), box(1.1, 0.04, 0.05, 0x3a8bff, 0, 0.37, 0.4, { b: 1 }),
      box(0.45, 0.16, 0.3, 0x2b2f3a, -0.35, 0.5, 0.1, { ry: 0.3 }), sph(0.06, 0xff4d6d, -0.25, 0.6, 0.1, { b: 1 }), sph(0.06, 0x4dd0ff, -0.45, 0.6, 0.1, { b: 1 })) },
  { id: 'headphones', cat: 'digital', act: 'low', spin: true, build: () => grp(
      tor(0.5, 0.08, 0x222222, 0, 0.32, 0, {}, Math.PI), cyl(0.2, 0.2, 0.16, 0xff5e5e, -0.5, 0.3, 0, { rz: Math.PI / 2 }), cyl(0.2, 0.2, 0.16, 0xff5e5e, 0.5, 0.3, 0, { rz: Math.PI / 2 })) },
  { id: 'social', cat: 'digital', act: 'high', gantry: true, build: () => grp(
      ...posts(1.6), box(1.5, 0.85, 0.15, 0x7a4bd6, 0, 1.55, 0), sph(0.17, 0xff4d6d, -0.13, 1.62, 0.1, { b: 1 }), sph(0.17, 0xff4d6d, 0.13, 1.62, 0.1, { b: 1 }),
      cone(0.3, 0.4, 0xff4d6d, 0, 1.35, 0.1, { rx: Math.PI, b: 1 }), sph(0.22, 0xff3b3b, 0.7, 1.95, 0.1, { b: 1 })) },

  // ---------- Harmful habits ----------
  { id: 'bottle', cat: 'habits', act: 'low', spin: true, build: () => { const g = grp(
      cyl(0.3, 0.3, 0.55, 0xb5651d, 0, 0.275, 0), cyl(0.12, 0.16, 0.25, 0xb5651d, 0, 0.675, 0), cyl(0.14, 0.14, 0.06, 0xc0392b, 0, 0.8, 0), cyl(0.305, 0.305, 0.2, 0xf4ecd8, 0, 0.28, 0)); g.scale.setScalar(1.1); return g; } },
  { id: 'cigarette', cat: 'habits', act: 'low', build: () => grp(
      cyl(0.15, 0.15, 1.5, 0xf4f4f4, 0, 0.17, 0, { rz: Math.PI / 2 }), cyl(0.155, 0.155, 0.45, 0xe0a050, 0.55, 0.17, 0, { rz: Math.PI / 2 }),
      cyl(0.155, 0.155, 0.08, 0xff5a1f, -0.78, 0.17, 0, { rz: Math.PI / 2, b: 1 }), sph(0.16, 0x9a9a9a, -0.85, 0.55, 0, { op: 0.5 }), sph(0.12, 0x9a9a9a, -0.95, 0.78, 0, { op: 0.4 })) },
  { id: 'vape', cat: 'habits', act: 'full', spin: true, build: () => grp(
      cyl(0.3, 0.3, 1.6, 0x5b2a86, 0, 0.8, 0), cyl(0.31, 0.31, 0.12, 0x2ee6c8, 0, 1.0, 0, { b: 1 }), cyl(0.14, 0.2, 0.45, 0x222222, 0, 1.85, 0),
      sph(0.35, 0xffffff, 0, 2.5, 0, { op: 0.6 }), sph(0.25, 0xffffff, 0.3, 2.85, 0, { op: 0.45 })) },
  { id: 'slot', cat: 'habits', act: 'full', build: () => grp(
      box(1.5, 2.2, 0.8, 0xb01e3c, 0, 1.1, 0), box(1.1, 0.6, 0.1, 0x111111, 0, 1.5, 0.42),
      box(0.3, 0.45, 0.05, 0xffffff, -0.35, 1.5, 0.48, { b: 1 }), box(0.3, 0.45, 0.05, 0xffd36b, 0, 1.5, 0.48, { b: 1 }), box(0.3, 0.45, 0.05, 0xffffff, 0.35, 1.5, 0.48, { b: 1 }),
      sph(0.2, 0xffd36b, 0, 2.3, 0, { b: 1 }), cyl(0.04, 0.04, 0.9, 0x888888, 0.85, 1.4, 0), sph(0.12, 0xff3b3b, 0.85, 1.9, 0, { b: 1 })) },
  { id: 'cards', cat: 'habits', act: 'low', build: () => grp(
      box(0.8, 0.04, 1.1, 0xffffff, -0.2, 0.05, 0, { ry: 0.3 }), box(0.8, 0.04, 1.1, 0xffffff, 0.1, 0.1, 0, { ry: -0.2 }), box(0.8, 0.04, 1.1, 0xf4f4f4, 0.3, 0.15, 0, { ry: 0.5 }),
      sph(0.1, 0xd62828, 0.3, 0.2, 0, { b: 1 }), cyl(0.25, 0.25, 0.12, 0xd62828, -0.65, 0.07, 0.3), cyl(0.25, 0.25, 0.12, 0x1d6fd6, -0.65, 0.19, 0.3), cyl(0.25, 0.25, 0.12, 0x222222, -0.65, 0.31, 0.3)) },

  // ---------- Materialistic distractions ----------
  { id: 'money', cat: 'material', act: 'low', build: () => grp(
      box(1.3, 0.25, 0.7, 0x2fa84f, 0, 0.125, 0), box(1.1, 0.25, 0.6, 0x3dbb5e, 0.05, 0.375, 0, { ry: 0.2 }), box(0.9, 0.25, 0.5, 0x2fa84f, -0.05, 0.625, 0, { ry: -0.2 }),
      cyl(0.22, 0.22, 0.06, 0xffd36b, 0.7, 0.06, 0.4, { e: 0x6b4a00 }), cyl(0.22, 0.22, 0.06, 0xffd36b, -0.6, 0.06, 0.45, { e: 0x6b4a00 })) },
  { id: 'luxury', cat: 'material', act: 'full', spin: true, build: () => grp(
      box(1.2, 0.6, 1.2, 0x1b1b1b, 0, 0.3, 0), oct(0.9, 0xffd36b, 0, 1.65, 0, { e: 0x7a5200, s: [1, 1.3, 1] })) },
  { id: 'bags', cat: 'material', act: 'low', build: () => grp(
      box(0.6, 0.6, 0.35, 0xe0409a, -0.35, 0.3, 0, { ry: 0.2 }), box(0.55, 0.55, 0.35, 0x1fb7c4, 0.35, 0.28, 0.05, { ry: -0.25 }),
      tor(0.16, 0.03, 0xffffff, -0.35, 0.6, 0, {}, Math.PI), tor(0.15, 0.03, 0xffffff, 0.35, 0.56, 0.05, {}, Math.PI)) },
  { id: 'cart', cat: 'material', act: 'full', build: () => grp(
      box(1.3, 0.9, 0.9, 0xaab4bd, 0, 0.95, 0, { op: 0.55 }), box(1.3, 0.06, 0.06, 0x888888, 0, 1.45, 0.45), box(0.06, 0.5, 0.06, 0x888888, -0.6, 0.35, 0.3), box(0.06, 0.5, 0.06, 0x888888, 0.6, 0.35, 0.3),
      box(0.8, 0.5, 0.6, 0xe0409a, 0, 1.65, 0), box(0.6, 0.5, 0.5, 0xffd36b, 0, 2.15, 0), sph(0.1, 0x222222, -0.6, 0.1, 0.3), sph(0.1, 0x222222, 0.6, 0.1, 0.3)) },
  { id: 'ad', cat: 'material', act: 'high', gantry: true, build: () => grp(
      ...posts(1.8, 1.3), box(1.8, 0.8, 0.15, 0xffd600, 0, 1.6, 0), box(1.6, 0.28, 0.17, 0xe63946, 0, 1.6, 0.01), box(0.9, 0.08, 0.18, 0xffffff, 0, 1.6, 0.02, { b: 1 })) },

  // ---------- Negative behaviours ----------
  { id: 'anger', cat: 'negative', act: 'high', spin: true, build: () => grp(
      sph(0.5, 0x4a2a3a, -0.5, 1.5, 0), sph(0.65, 0x3a2030, 0, 1.7, 0.1), sph(0.5, 0x4a2a3a, 0.5, 1.5, 0), sph(0.4, 0x5a2a3a, 0, 1.4, 0.3),
      box(0.3, 0.08, 0.05, 0xff3b3b, -0.25, 1.65, 0.7, { rz: -0.5, b: 1 }), box(0.3, 0.08, 0.05, 0xff3b3b, 0.25, 1.65, 0.7, { rz: 0.5, b: 1 }), box(0.12, 0.5, 0.1, 0xffe14d, 0, 1.05, 0.5, { rz: 0.4, b: 1 })) },
  { id: 'gossip', cat: 'negative', act: 'high', build: () => grp(
      sph(0.4, 0xffffff, -0.5, 1.5, 0, { s: [1.3, 0.9, 0.6] }), cone(0.12, 0.25, 0xffffff, -0.3, 1.2, 0, { rx: Math.PI }),
      sph(0.4, 0xd9b8ff, 0.4, 1.8, 0, { s: [1.3, 0.9, 0.6] }), cone(0.12, 0.25, 0xd9b8ff, 0.2, 1.5, 0, { rx: Math.PI }),
      sph(0.35, 0xffc0d9, 0.0, 1.25, 0.2, { s: [1.3, 0.9, 0.6] }), sph(0.05, 0x333333, -0.65, 1.5, 0.2), sph(0.05, 0x333333, -0.5, 1.5, 0.2), sph(0.05, 0x333333, -0.35, 1.5, 0.2)) },
  { id: 'mirror', cat: 'negative', act: 'full', build: () => grp(
      box(1.3, 2.1, 0.15, 0x2ecc71, 0, 1.15, 0, { e: 0x0a5c2e }), box(1.05, 1.85, 0.17, 0xd7f0ff, 0, 1.15, 0, { b: 1 }), box(1.0, 0.1, 0.5, 0x1f7a44, 0, 0.05, 0), sph(0.18, 0x2ecc71, 0, 1.15, 0.12, { b: 1 })) },
  { id: 'crown', cat: 'negative', act: 'low', spin: true, build: () => { const g = grp(
      box(1.1, 0.25, 1.1, 0x6b2d8a, 0, 0.13, 0), cyl(0.45, 0.5, 0.3, 0xffd36b, 0, 0.4, 0, { e: 0x6b4a00 }));
      for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; g.add(cone(0.12, 0.3, 0xffd36b, Math.cos(a) * 0.4, 0.7, Math.sin(a) * 0.4, { e: 0x6b4a00 })); }
      return g; } },
  { id: 'lie', cat: 'negative', act: 'full', build: () => grp(
      cyl(0.07, 0.07, 2.2, 0x555555, 0, 1.1, 0), box(1.5, 1.1, 0.12, 0xffffff, 0, 1.7, 0), box(1.0, 0.14, 0.14, 0xd62828, 0, 1.7, 0.08, { rz: 0.7, b: 1 }), box(1.0, 0.14, 0.14, 0xd62828, 0, 1.7, 0.08, { rz: -0.7, b: 1 }),
      cone(0.14, 0.8, 0xd62828, 0, 1.4, 0.5, { rx: Math.PI / 2 })) },

  // ---------- Neglect & procrastination ----------
  { id: 'alarm', cat: 'neglect', act: 'low', spin: true, build: () => grp(
      cyl(0.36, 0.36, 0.3, 0xd62828, 0, 0.38, 0, { rx: Math.PI / 2 }), cyl(0.3, 0.3, 0.02, 0xffffff, 0, 0.38, 0.16, { rx: Math.PI / 2, b: 1 }),
      box(0.04, 0.25, 0.02, 0x111111, 0, 0.45, 0.18, { b: 1 }), sph(0.12, 0xffd36b, -0.25, 0.68, 0), sph(0.12, 0xffd36b, 0.25, 0.68, 0), box(0.05, 0.5, 0.03, 0x111111, 0.12, 0.38, 0.19, { rz: 0.6, b: 1 })) },
  { id: 'snooze', cat: 'neglect', act: 'low', spin: true, build: () => grp(
      cyl(0.7, 0.75, 0.2, 0x1e3a8a, 0, 0.1, 0), cyl(0.55, 0.6, 0.25, 0x3b6fd8, 0, 0.32, 0),
      box(0.3, 0.02, 0.06, 0xffffff, 0, 0.46, 0.18, { b: 1 }), box(0.3, 0.02, 0.06, 0xffffff, 0, 0.46, -0.12, { b: 1 }), box(0.34, 0.02, 0.06, 0xffffff, 0, 0.46, 0.03, { ry: 0.9, b: 1 })) },
  { id: 'pillow', cat: 'neglect', act: 'low', build: () => grp(
      box(1.6, 0.12, 1.1, 0x6f5bd6, 0, 0.06, 0), sph(0.7, 0xc9bcff, -0.1, 0.32, 0, { s: [1.15, 0.36, 0.85] }), sph(0.2, 0x6f5bd6, 0.55, 0.2, 0.3),
      box(0.22, 0.04, 0.05, 0xffffff, 0.5, 0.95, 0, { b: 1 }), box(0.22, 0.04, 0.05, 0xffffff, 0.5, 0.78, 0, { b: 1 }), box(0.28, 0.04, 0.05, 0xffffff, 0.5, 0.865, 0, { rz: 0.8, b: 1 })) },
  { id: 'desk', cat: 'neglect', act: 'full', build: () => grp(
      box(1.8, 0.12, 1.0, 0x8b5a2b, 0, 0.9, 0), box(0.1, 0.9, 0.1, 0x6b4420, -0.8, 0.45, -0.4), box(0.1, 0.9, 0.1, 0x6b4420, 0.8, 0.45, -0.4), box(0.1, 0.9, 0.1, 0x6b4420, -0.8, 0.45, 0.4), box(0.1, 0.9, 0.1, 0x6b4420, 0.8, 0.45, 0.4),
      box(0.6, 0.9, 0.5, 0xffffff, -0.3, 1.4, 0), box(0.5, 0.5, 0.45, 0xe8d9a0, -0.3, 2.1, 0, { ry: 0.2 }), cyl(0.12, 0.12, 0.2, 0xd62828, 0.6, 1.06, 0.2)) },

  // ---------- Environmental ----------
  { id: 'barrier', cat: 'env', act: 'low', hd: 0.25, build: () => grp(
      box(1.9, 0.7, 0.5, 0xff7a2f, 0, 0.55, 0), box(0.3, 0.72, 0.52, 0xffffff, -0.5, 0.55, 0), box(0.3, 0.72, 0.52, 0xffffff, 0.5, 0.55, 0), box(0.12, 0.3, 0.4, 0x333a44, -0.7, 0.15, 0), box(0.12, 0.3, 0.4, 0x333a44, 0.7, 0.15, 0)) },
  { id: 'car', cat: 'env', act: 'full', hd: 1.4, long: true, cue: 'horn', build: () => car(0xd62839) },
  { id: 'taxi', cat: 'env', act: 'full', hd: 1.4, long: true, cue: 'horn', build: () => car(0xffc400, true) },
  { id: 'crate', cat: 'env', act: 'low', build: () => grp(
      box(0.85, 0.85, 0.85, 0xc79a5a, 0, 0.43, 0), box(0.9, 0.08, 0.9, 0x8a6a3a, 0, 0.82, 0), box(0.06, 1.1, 0.06, 0x8a6a3a, 0, 0.43, 0.44, { rz: 0.8 })) },
  { id: 'cratestack', cat: 'env', act: 'full', build: () => grp(
      box(1.0, 1.0, 1.0, 0xc79a5a, -0.2, 0.5, 0), box(1.0, 1.0, 1.0, 0xb8894a, 0.3, 0.5, 0.05, { ry: 0.15 }), box(1.0, 1.0, 1.0, 0xc79a5a, 0.05, 1.5, 0, { ry: -0.1 }), box(0.9, 0.9, 0.9, 0xb8894a, 0.05, 2.45, 0, { ry: 0.2 })) },
  { id: 'construction', cat: 'env', act: 'high', gantry: true, build: () => grp(
      ...posts(1.9, 1.4, 0x555555), box(1.9, 0.35, 0.3, 0xffd400, 0, 1.55, 0), box(0.3, 0.37, 0.32, 0x111111, -0.55, 1.55, 0), box(0.3, 0.37, 0.32, 0x111111, 0.05, 1.55, 0), box(0.3, 0.37, 0.32, 0x111111, 0.65, 1.55, 0),
      sph(0.14, 0xff8a00, -0.8, 1.85, 0, { b: 1 }), sph(0.14, 0xff8a00, 0.8, 1.85, 0, { b: 1 })) },
];

const LABEL = {
  phone: 'digital addiction', tv: 'digital addiction', console: 'digital addiction', headphones: 'digital addiction', social: 'social media addiction',
  bottle: 'a harmful habit', cigarette: 'a harmful habit', vape: 'a harmful habit', slot: 'gambling', cards: 'gambling',
  money: 'materialism', luxury: 'materialism', bags: 'materialism', cart: 'materialism', ad: 'consumerism',
  anger: 'anger', gossip: 'gossip', mirror: 'jealousy', crown: 'arrogance', lie: 'dishonesty',
  alarm: 'procrastination', snooze: 'procrastination', pillow: 'laziness', desk: 'neglect',
  barrier: 'a road hazard', car: 'traffic', taxi: 'traffic', crate: 'a road hazard', cratestack: 'a road hazard', construction: 'a road hazard',
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
