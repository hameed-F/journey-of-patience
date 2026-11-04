import * as THREE from 'three';
import { CFG } from './config.js';

const L = CFG.segLength;
const COUNT = CFG.segCount;
const GROUND_LEN = 150;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const PI = Math.PI;

// ---------------------------------------------------------------- textures
function canvasTex(w, h, draw, rx, ry) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = CFG.aniso || 4;
  return t;
}

function speckle(x, w, h, n, colors, size) {
  for (let i = 0; i < n; i++) {
    x.fillStyle = colors[(Math.random() * colors.length) | 0];
    const s = 1 + Math.random() * size;
    x.fillRect(Math.random() * w, Math.random() * h, s, s);
  }
}

const roadTex = () => canvasTex(256, 768, (x, w, h) => {      // 8 m x 24 m, 32 px per metre
  x.fillStyle = '#3d4455'; x.fillRect(0, 0, w, h);
  speckle(x, w, h, 5000, ['#454d60', '#353b4a', '#4a5266', '#2f3541'], 3);
  for (const cx of [1.8, 4, 6.2]) {                              // faint tyre tracks in each lane
    for (const o of [-0.7, 0.7]) { x.fillStyle = 'rgba(0,0,0,.10)'; x.fillRect((cx + o) * 32 - 8, 0, 16, h); }
  }
  x.strokeStyle = 'rgba(20,22,30,.5)'; x.lineWidth = 1;          // a few cracks
  for (let i = 0; i < 6; i++) { x.beginPath(); let px = Math.random() * w, py = Math.random() * h; x.moveTo(px, py); for (let k = 0; k < 5; k++) { px += (Math.random() - 0.5) * 26; py += Math.random() * 18; x.lineTo(px, py); } x.stroke(); }
  x.fillStyle = '#f6edc8';
  for (const lx of [4 - 1.1, 4 + 1.1]) for (let k = 0; k < 4; k++) x.fillRect(lx * 32 - 2.5, k * 192 + 36, 5, 77);   // dashed lane lines
  x.fillRect(8, 0, 5, h); x.fillRect(w - 13, 0, 5, h);          // solid edge lines
}, 1, GROUND_LEN / L);

const tileTex = () => canvasTex(128, 128, (x, w, h) => {         // 1 m tile: eight-pointed star pattern
  x.fillStyle = '#e8dcbc'; x.fillRect(0, 0, w, h);
  x.strokeStyle = '#c9b78a'; x.lineWidth = 3; x.strokeRect(1.5, 1.5, w - 3, h - 3);
  x.save(); x.translate(w / 2, h / 2);
  x.fillStyle = '#f5ecd2'; x.strokeStyle = '#2a8f86'; x.lineWidth = 3;
  for (const r of [0, PI / 4]) { x.save(); x.rotate(r); x.beginPath(); x.rect(-34, -34, 68, 68); x.stroke(); x.restore(); }
  x.beginPath(); for (let i = 0; i < 8; i++) { const a = i * PI / 4 + PI / 8; x.lineTo(Math.cos(a) * 20, Math.sin(a) * 20); } x.closePath(); x.fill(); x.stroke();
  x.fillStyle = '#c4623c'; x.beginPath(); x.arc(0, 0, 6, 0, PI * 2); x.fill();
  x.restore();
  x.fillStyle = '#2a8f86'; for (const [px, py] of [[0, 0], [w, 0], [0, h], [w, h]]) { x.beginPath(); x.arc(px, py, 9, 0, PI * 2); x.fill(); }
}, 2, GROUND_LEN);

const grassTex = () => canvasTex(256, 256, (x, w, h) => {
  x.fillStyle = '#6cc070'; x.fillRect(0, 0, w, h);
  speckle(x, w, h, 900, ['#5fb464', '#79cf7c', '#52a85a', '#86d686'], 5);
  for (let i = 0; i < 70; i++) { x.fillStyle = pick(['#ffffff', '#ffe066', '#ff8fb3', '#c9a0ff']); x.beginPath(); x.arc(Math.random() * w, Math.random() * h, 1.6 + Math.random() * 1.2, 0, PI * 2); x.fill(); }
}, 4, GROUND_LEN / 8);

function radialTex() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 62);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}
const SOFT = radialTex();

// ---------------------------------------------------------------- materials / geometry (shared)
const lambert = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, ...o });
const M = {
  road: lambert(0xffffff, { map: roadTex() }),
  curb: lambert(0xffffff, { map: tileTex() }),
  grass: lambert(0xffffff, { map: grassTex() }),
  white: lambert(0xffffff),                                      // tinted per instance
  lamp: new THREE.MeshBasicMaterial({ color: 0x9a8f70 }),        // lanterns (instance colours; brightness follows the day/night cycle)
  glow: new THREE.MeshBasicMaterial({ color: 0xffc860, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
  pool: new THREE.MeshBasicMaterial({ color: 0xffd07a, map: SOFT, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
  window: new THREE.MeshBasicMaterial({ color: 0x3b465c, side: THREE.DoubleSide }),
  gold: new THREE.MeshBasicMaterial({ color: 0xffc94d }),
  shadow: new THREE.MeshBasicMaterial({ color: 0x000000, map: SOFT, transparent: true, opacity: 0.28, depthWrite: false }),
};
export const MAT = M;

const G = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cone4: new THREE.ConeGeometry(1, 1, 4),
  cone8: new THREE.ConeGeometry(1, 1, 14),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 14),
  ico: new THREE.IcosahedronGeometry(1, 2),
  dome: new THREE.SphereGeometry(1, 22, 12, 0, PI * 2, 0, PI / 2),
  ball: new THREE.SphereGeometry(1, 12, 8),
  win: new THREE.PlaneGeometry(0.55, 0.7),
  disc: new THREE.PlaneGeometry(1, 1).rotateX(-PI / 2),
  crescent: new THREE.TorusGeometry(0.42, 0.075, 8, 18, PI * 1.55),
};

const HOUSE = [0xf4d9a6, 0xf2c6a0, 0xe8e1cf, 0xcfe3d4, 0xf0b8a0, 0xd8e6f5, 0xf7e7b4, 0xe9cfa0].map((c) => new THREE.Color(c));
const ROOF = [0xc4623c, 0x2b6f8a, 0x8a3b3b, 0x2f8a6b, 0x9b5b2f].map((c) => new THREE.Color(c));
const LEAF = [0x3f9c4a, 0x58b35a, 0x2f8a55, 0x7cc46a, 0x4aa65a].map((c) => new THREE.Color(c));
const WOOD = new THREE.Color(0x7b4f2e), DOOR = new THREE.Color(0x5b3a22), CREAM = new THREE.Color(0xf8f2e0), TEAL = new THREE.Color(0x1f9d8a);
const GOLD = new THREE.Color(0xffd36b), WARM = new THREE.Color(1, 0.9, 0.6);
const FANOUS = [0xff5a5a, 0xffd36b, 0x6dff9a, 0x6fb3ff, 0xff9ae6].map((c) => new THREE.Color(c));
const STRIPES = [new THREE.Color(0xd94141), new THREE.Color(0xfff6e0)];

const dummy = new THREE.Object3D();
const tmp = new THREE.Color();

// capacity per segment
const CAP = { boxes: 220, cones4: 14, cones8: 12, cyls: 90, icos: 90, domes: 14, balls: 40, windows: 48, glows: 14, pools: 4, crescents: 4, shadows: 40 };

function makeSegment() {
  const group = new THREE.Group();
  const inst = (geo, mat, n) => {
    const m = new THREE.InstancedMesh(geo, mat, n);
    m.frustumCulled = false;
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    group.add(m);
    return m;
  };
  const p = {
    boxes: inst(G.box, M.white, CAP.boxes), cones4: inst(G.cone4, M.white, CAP.cones4), cones8: inst(G.cone8, M.white, CAP.cones8),
    cyls: inst(G.cyl, M.white, CAP.cyls), icos: inst(G.ico, M.white, CAP.icos), domes: inst(G.dome, M.white, CAP.domes),
    balls: inst(G.ball, M.lamp, CAP.balls), windows: inst(G.win, M.window, CAP.windows),
    glows: inst(G.ball, M.glow, CAP.glows), pools: inst(G.disc, M.pool, CAP.pools),
    crescents: inst(G.crescent, M.gold, CAP.crescents), shadows: inst(G.disc, M.shadow, CAP.shadows),
  };
  return { group, p, n: {}, gl: [] };
}

function add(seg, key, x, y, z, sx, sy, sz, ry = 0, color = null, rx = 0, rz = 0) {
  const i = seg.n[key]++;
  if (i >= CAP[key]) { seg.n[key] = CAP[key]; return; }
  if (key === 'glows') seg.gl.push({ i, x, y, z, s: sx });
  const m = seg.p[key];
  dummy.position.set(x, y, z); dummy.rotation.set(rx, ry, rz); dummy.scale.set(sx, sy, sz); dummy.updateMatrix();
  m.setMatrixAt(i, dummy.matrix);
  if (color !== null) m.setColorAt(i, color.isColor ? color : tmp.setHex(color));
}
const shade = (c, k) => new THREE.Color().copy(c).multiplyScalar(k);

function house(seg, s, x, z) {
  const type = Math.random();
  const w = rand(3, 4), d = rand(3, 4);
  const tower = type > 0.8, flat = type > 0.45 && !tower;
  const h = tower ? rand(6, 8) : rand(3.2, 5.2);
  const body = pick(HOUSE), roof = pick(ROOF), trim = shade(body, 0.78);
  const xf = x - s * (w / 2);                                   // wall facing the road

  add(seg, 'shadows', x - s * 0.4, -0.03, z, w * 1.5, 1, d * 1.4);
  add(seg, 'boxes', x, h / 2, z, w, h, d, 0, body);
  add(seg, 'boxes', x, 0.28, z, w + 0.16, 0.56, d + 0.16, 0, trim);          // plinth
  add(seg, 'boxes', x, h * 0.5, z, w + 0.06, 0.1, d + 0.06, 0, trim);        // floor band

  if (flat) {
    add(seg, 'boxes', x, h + 0.2, z, w + 0.24, 0.4, d + 0.24, 0, shade(body, 0.92));   // parapet
    add(seg, 'boxes', x, h + 0.42, z, w + 0.34, 0.08, d + 0.34, 0, trim);
    if (Math.random() < 0.55) {                                                          // little dome + finial
      const dx = x + rand(-0.4, 0.4), dz = z + rand(-0.6, 0.6);
      add(seg, 'cyls', dx, h + 0.55, dz, 0.75, 0.3, 0.75, 0, CREAM);
      add(seg, 'domes', dx, h + 0.7, dz, 0.85, 0.85, 0.85, 0, Math.random() < 0.5 ? TEAL : roof);
      add(seg, 'cyls', dx, h + 1.75, dz, 0.04, 0.55, 0.04, 0, GOLD);
    }
  } else {
    const rh = tower ? 2.4 : 1.6;
    add(seg, 'cones4', x, h + rh / 2, z, w * 0.84, rh, d * 0.84, PI / 4, roof);
    add(seg, 'boxes', x, h + 0.06, z, w + 0.34, 0.14, d + 0.34, 0, shade(roof, 0.8));  // eaves
    if (Math.random() < 0.5) add(seg, 'boxes', x + s * 0.5, h + 0.9, z + 0.6, 0.4, 1.1, 0.4, 0, shade(body, 0.85)); // chimney
  }

  // door + lintel + lantern
  add(seg, 'boxes', xf - s * 0.05, 1.0, z, 0.12, 2.0, 1.0, 0, DOOR);
  add(seg, 'boxes', xf - s * 0.08, 2.08, z, 0.18, 0.14, 1.3, 0, CREAM);
  add(seg, 'boxes', xf - s * 0.08, 0.1, z, 0.35, 0.2, 1.4, 0, CREAM);
  add(seg, 'balls', xf - s * 0.28, 2.45, z + 0.85, 0.11, 0.16, 0.11, 0, WARM);
  if (flat && Math.random() < 0.6) {                                                     // striped awning
    for (let k = 0; k < 4; k++) add(seg, 'boxes', xf - s * 0.55, 2.3, z - 0.75 + k * 0.5, 0.9, 0.06, 0.5, 0, STRIPES[k % 2], 0, -s * 0.28);
  }

  // windows (two floors on taller houses) with frames and shutters
  const rows = h > 4.3 ? [Math.max(1.5, h * 0.3), h * 0.72] : [Math.max(1.5, h * 0.62)];
  const ry = s > 0 ? -PI / 2 : PI / 2;
  for (const wy of rows) {
    for (const dz of [-d * 0.26, d * 0.26]) {
      const zz = z + dz;
      add(seg, 'boxes', xf - s * 0.02, wy, zz, 0.08, 0.92, 0.72, 0, CREAM);
      add(seg, 'windows', xf - s * 0.07, wy, zz, 1, 1, 1, ry);
      add(seg, 'boxes', xf - s * 0.1, wy - 0.5, zz, 0.2, 0.08, 0.8, 0, trim);        // sill
      if (!flat) { add(seg, 'boxes', xf - s * 0.07, wy, zz - 0.42, 0.05, 0.8, 0.18, 0, TEAL); add(seg, 'boxes', xf - s * 0.07, wy, zz + 0.42, 0.05, 0.8, 0.18, 0, TEAL); }
    }
  }
  if (tower) add(seg, 'boxes', xf - s * 0.4, h * 0.55, z, 0.8, 0.1, 2.0, 0, DOOR);    // balcony slab
}

function mosque(seg, s, x, z) {
  add(seg, 'shadows', x, -0.03, z, 11, 1, 11);
  add(seg, 'boxes', x, 2.3, z, 7, 4.6, 7, 0, CREAM);
  add(seg, 'boxes', x, 0.3, z, 7.35, 0.6, 7.35, 0, new THREE.Color(0xd9cfae));
  add(seg, 'boxes', x, 4.7, z, 7.2, 0.25, 7.2, 0, new THREE.Color(0xe7dcc0));
  add(seg, 'cyls', x, 5.1, z, 3.1, 0.7, 3.1, 0, CREAM);
  add(seg, 'domes', x, 5.4, z, 3.0, 3.1, 3.0, 0, TEAL);
  add(seg, 'cyls', x, 8.9, z, 0.07, 0.9, 0.07, 0, GOLD);
  add(seg, 'crescents', x, 9.6, z, 1.1, 1.1, 1.1, PI / 2, null, 0, PI * 0.2);
  for (const [dx, dz] of [[-2.4, -2.4], [2.4, -2.4], [-2.4, 2.4], [2.4, 2.4]]) {
    add(seg, 'cyls', x + dx, 4.9, z + dz, 1.0, 0.5, 1.0, 0, CREAM);
    add(seg, 'domes', x + dx, 5.15, z + dz, 1.0, 1.1, 1.0, 0, new THREE.Color(0x35b3a0));
  }
  const xf = x - s * 3.5, ry = s > 0 ? -PI / 2 : PI / 2;
  add(seg, 'boxes', xf - s * 0.1, 1.5, z, 0.2, 3.0, 2.4, 0, new THREE.Color(0xe7dcc0));   // portal
  add(seg, 'boxes', xf - s * 0.2, 1.3, z, 0.12, 2.6, 1.7, 0, new THREE.Color(0x244a52));
  add(seg, 'domes', xf - s * 0.2, 2.6, z, 0.12, 0.85, 0.85, 0, new THREE.Color(0x244a52), 0, 0);
  for (const dz of [-2.2, 2.2]) for (const wy of [1.6, 3.4]) { add(seg, 'windows', xf - s * 0.06, wy, z + dz, 1, 1.5, 1, ry); add(seg, 'boxes', xf - s * 0.02, wy, z + dz, 0.08, 1.2, 0.8, 0, CREAM); }
  for (const dz of [-3.9, 3.9]) {                                                            // two minarets
    const mx = x - s * 4.3, mz = z + dz;
    add(seg, 'cyls', mx, 4.6, mz, 0.55, 9.2, 0.55, 0, CREAM);
    add(seg, 'cyls', mx, 3.0, mz, 0.62, 0.22, 0.62, 0, TEAL);
    add(seg, 'cyls', mx, 7.2, mz, 0.62, 0.22, 0.62, 0, TEAL);
    add(seg, 'cyls', mx, 7.85, mz, 0.98, 0.18, 0.98, 0, CREAM);
    add(seg, 'cyls', mx, 8.8, mz, 0.42, 1.8, 0.42, 0, CREAM);
    add(seg, 'cones8', mx, 10.55, mz, 0.58, 1.9, 0.58, 0, TEAL);
    add(seg, 'crescents', mx, 11.9, mz, 0.7, 0.7, 0.7, PI / 2, null, 0, PI * 0.2);
    for (const wy of [2, 5.2, 6.4]) add(seg, 'balls', mx - s * 0.5, wy, mz, 0.1, 0.16, 0.1, 0, WARM);
  }
  add(seg, 'balls', xf - s * 0.4, 3.4, z - 1.3, 0.13, 0.2, 0.13, 0, WARM);
  add(seg, 'balls', xf - s * 0.4, 3.4, z + 1.3, 0.13, 0.2, 0.13, 0, WARM);
}

function plant(seg, s, x, z) {
  const r = Math.random();
  add(seg, 'shadows', x, -0.03, z, 2.6, 1, 2.6);
  if (r < 0.4) {                                                // round tree: trunk + three overlapping crowns
    add(seg, 'cyls', x, 0.8, z, 0.18, 1.6, 0.18, 0, WOOD);
    const k = rand(0.9, 1.3);
    add(seg, 'icos', x, 2.4 * k, z, 1.25 * k, 1.1 * k, 1.25 * k, 0, pick(LEAF));
    add(seg, 'icos', x + 0.6 * k, 2.0 * k, z + 0.3, 0.85 * k, 0.8 * k, 0.85 * k, 0, pick(LEAF));
    add(seg, 'icos', x - 0.5 * k, 2.1 * k, z - 0.4, 0.8 * k, 0.75 * k, 0.8 * k, 0, pick(LEAF));
  } else if (r < 0.75) {                                        // date palm
    const hgt = rand(3.4, 4.2);
    add(seg, 'cyls', x, hgt / 2, z, 0.17, hgt, 0.17, 0, WOOD);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * PI * 2 + rand(-0.15, 0.15);
      add(seg, 'boxes', x + Math.cos(a) * 0.95, hgt + 0.05, z + Math.sin(a) * 0.95, 2.1, 0.05, 0.38, -a, pick(LEAF), 0, -0.4);
    }
    for (let i = 0; i < 3; i++) add(seg, 'icos', x + rand(-0.25, 0.25), hgt - 0.2, z + rand(-0.25, 0.25), 0.16, 0.2, 0.16, 0, new THREE.Color(0x8a4b1f));
  } else {                                                      // cypress
    add(seg, 'cyls', x, 0.4, z, 0.14, 0.8, 0.14, 0, WOOD);
    add(seg, 'icos', x, 2.3, z, 0.6, 2.2, 0.6, 0, new THREE.Color(0x2f7a47));
  }
}

function bush(seg, s, x, z) {
  const k = rand(0.5, 0.85);
  add(seg, 'icos', x, k * 0.6, z, k, k * 0.75, k, 0, pick(LEAF));
  for (let i = 0; i < 4; i++) {
    const a = rand(0, PI * 2);
    add(seg, 'icos', x + Math.cos(a) * k * 0.8, k * (0.5 + Math.random() * 0.5), z + Math.sin(a) * k * 0.8, 0.1, 0.1, 0.1, 0, pick([0xff7aa8, 0xffd54a, 0xffffff, 0xb07cff]));
  }
}

function stall(seg, s, x, z) {
  add(seg, 'shadows', x, -0.03, z, 2.4, 1, 3);
  add(seg, 'boxes', x, 0.45, z, 0.9, 0.9, 2.0, 0, new THREE.Color(0xa5703a));
  add(seg, 'boxes', x + s * 0.5, 1.2, z, 0.08, 2.4, 2.1, 0, new THREE.Color(0x8a5a2b));            // back panel
  for (const dz of [-0.95, 0.95]) { add(seg, 'cyls', x - s * 0.42, 1.1, z + dz, 0.05, 2.2, 0.05, 0, WOOD); }
  for (let k = 0; k < 6; k++) add(seg, 'boxes', x - s * 0.02, 2.25 - 0.0, z - 0.93 + k * 0.372, 1.3, 0.06, 0.37, 0, STRIPES[k % 2], 0, s * 0.24);
  for (let i = 0; i < 6; i++) add(seg, 'icos', x - s * 0.05, 1.0, z - 0.8 + i * 0.32, 0.13, 0.13, 0.13, 0, pick([0xd94141, 0xff9f1c, 0x6cc070, 0xffd54a]));
  add(seg, 'balls', x - s * 0.45, 2.05, z, 0.1, 0.15, 0.1, 0, WARM);
}

function streetLamp(seg, s, z) {
  const x = s * 4.7;
  add(seg, 'cyls', x, 0.2, z, 0.2, 0.4, 0.2, 0, new THREE.Color(0x2f3b44));
  add(seg, 'cyls', x, 1.7, z, 0.065, 3.3, 0.065, 0, new THREE.Color(0x2f3b44));
  add(seg, 'boxes', x - s * 0.28, 3.28, z, 0.56, 0.06, 0.06, 0, new THREE.Color(0x2f3b44));
  add(seg, 'balls', x - s * 0.5, 3.05, z, 0.2, 0.3, 0.2, 0, WARM);
  add(seg, 'cones8', x - s * 0.5, 3.42, z, 0.26, 0.22, 0.26, 0, GOLD);
  add(seg, 'glows', x - s * 0.5, 3.05, z, 0.8, 0.8, 0.8);
  add(seg, 'pools', s * 3.3, 0.04, z, 5.6, 1, 5.6);
}

function fanousString(seg) {
  const z = rand(-7, 7);
  for (const s of [-1, 1]) add(seg, 'cyls', s * 5.0, 3.0, z, 0.07, 6, 0.07, 0, new THREE.Color(0x2f3b44));
  add(seg, 'boxes', 0, 5.95, z, 10, 0.035, 0.035, 0, new THREE.Color(0x222222));
  for (let i = 0; i < 9; i++) {
    const t = i / 8, x = -4.8 + t * 9.6, y = 5.85 - 0.45 * Math.sin(t * PI);
    add(seg, 'balls', x, y, z, 0.09, 0.09, 0.09, 0, FANOUS[i % 5]);
  }
  for (let i = 0; i < 4; i++) {                                   // hanging fanous lanterns
    const x = -3.2 + i * 2.1, c = FANOUS[(i + 1) % 5];
    add(seg, 'cyls', x, 5.35, z, 0.012, 0.6, 0.012, 0, new THREE.Color(0x222222));
    add(seg, 'balls', x, 4.85, z, 0.2, 0.3, 0.2, 0, c);
    add(seg, 'cones8', x, 5.15, z, 0.17, 0.16, 0.17, 0, GOLD);
    add(seg, 'glows', x, 4.85, z, 0.75, 0.75, 0.75);
  }
}

function randomize(seg) {
  for (const k of Object.keys(CAP)) seg.n[k] = 0;
  seg.gl.length = 0;
  for (const s of [-1, 1]) {
    for (let k = 0; k < 3; k++) house(seg, s, s * rand(11.8, 13.6), -L / 2 + (k + 0.5) * (L / 3) + rand(-1.2, 1.2));
    for (let k = 0; k < 4; k++) plant(seg, s, s * rand(7.0, 8.8), -L / 2 + (k + 0.5) * (L / 4) + rand(-1.2, 1.2));
    for (let k = 0; k < 3; k++) bush(seg, s, s * rand(6.25, 6.7), -L / 2 + (k + 0.5) * (L / 3) + rand(-2.5, 2.5));
    if (Math.random() < 0.5) stall(seg, s, s * 7.4, rand(-9, 9));
    streetLamp(seg, s, -L / 4 + s * 2.2);
    streetLamp(seg, s, L / 4 + s * 2.2);
  }
  if (Math.random() < 0.45) { const ms = Math.random() < 0.5 ? -1 : 1; mosque(seg, ms, ms * rand(17, 19), rand(-3, 3)); }
  if (Math.random() < 0.5) fanousString(seg);
  for (const [k, m] of Object.entries(seg.p)) {
    m.count = seg.n[k];
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }
}

// Glow halos shrink away as they pass the camera (a huge additive ball in your face looks wrong)
const CAM_Z = CFG.camDist;
function fadeGlows(seg) {
  const m = seg.p.glows;
  for (const g of seg.gl) {
    const d = CAM_Z - (seg.group.position.z + g.z);
    const f = Math.min(1, Math.max(0, (d - 3) / 9));
    dummy.position.set(g.x, g.y, g.z); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(g.s * f * 0.8 + 0.0001); dummy.updateMatrix();
    m.setMatrixAt(g.i, dummy.matrix);
  }
  m.instanceMatrix.needsUpdate = true;
}

export class World {
  constructor(scene) {
    // endless ground: three long strips whose textures scroll (far cheaper than moving geometry)
    const strip = (w, x, y, mat) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, GROUND_LEN).rotateX(-PI / 2), mat);
      m.position.set(x, y, 15 - GROUND_LEN / 2);
      m.frustumCulled = false;
      scene.add(m);
      return m;
    };
    strip(8, 0, 0, M.road);
    for (const s of [-1, 1]) { strip(2, s * 5, 0.05, M.curb); strip(34, s * 23, -0.05, M.grass); }
    this.scroll = [M.road.map, M.curb.map, M.grass.map];

    this.segs = [];
    for (let i = 0; i < COUNT; i++) {
      const s = makeSegment();
      s.group.position.z = 12 - i * L;
      randomize(s);
      scene.add(s.group);
      this.segs.push(s);
    }
  }

  update(dt, speed) {
    const dz = speed * dt;
    for (const t of this.scroll) { t.offset.y = (t.offset.y + dz * t.repeat.y / GROUND_LEN) % 1; }
    for (const s of this.segs) {
      s.group.position.z += dz;
      if (s.group.position.z > L + 2) {          // fully behind the camera -> recycle to the front
        s.group.position.z -= L * COUNT;
        randomize(s);
      }
      fadeGlows(s);
    }
  }
}
