import * as THREE from 'three';
import { CFG, SURAHS, TIERS } from './config.js';
import { ENTRIES, BY_ACT, bake, ROCK_MATS, ROCK_LABEL } from './obstacles.js';
import { makeAyahMarkers, makeZamzam, SOFT } from './collectibles.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const ri = (n) => Math.floor(Math.random() * n);
const pick = (a) => a[ri(a.length)];
const clamp = THREE.MathUtils.clamp;
function weighted(w) {
  const e = Object.entries(w);
  let t = 0; for (const [, v] of e) t += v;
  let r = Math.random() * t;
  for (const [k, v] of e) if ((r -= v) <= 0) return k;
  return e[0][0];
}
const randAct = () => { const r = Math.random(); return r < 0.4 ? 'low' : r < 0.65 ? 'high' : 'full'; };
const shuffle = (a) => a.sort(() => Math.random() - 0.5);

const MARKER_GEO = new THREE.RingGeometry(0.55, 0.85, 20).rotateX(-Math.PI / 2);
const MARKER_MAT = new THREE.MeshBasicMaterial({ color: 0xff4040, transparent: true, opacity: 0.75, depthWrite: false });

// dates (Sabr): all dates in the game are drawn with three instanced meshes (3 draw calls in total)
const DATE_MAT = new THREE.MeshLambertMaterial({ color: 0x7a4a1e, emissive: 0x3a1a05 });
const LEAF_MAT = new THREE.MeshLambertMaterial({ color: 0x4aa65a, emissive: 0x143a1a });
const HALO_MAT = new THREE.MeshBasicMaterial({ map: SOFT, color: 0xffd36b, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.85 });
const dummy = new THREE.Object3D();
const DATES = 28;

const compat = (e, b) => (b === 'rotating' ? !!e.spin : b === 'sliding' ? !e.long && !e.gantry : b === 'expanding' ? !e.long : true);
const ayahKey = (s, n) => s * 100 + n;

export class Spawner {
  constructor(scene) {
    this.scene = scene;
    this.pools = new Map();
    for (const e of ENTRIES) this.pools.set(e.id, [this.make(e), this.make(e)]);
    this.ayahObjs = makeAyahMarkers();
    this.zamObjs = [makeZamzam(), makeZamzam()];
    [...this.ayahObjs, ...this.zamObjs].forEach((o) => scene.add(o));

    this.dateObjs = Array.from({ length: DATES }, () => {
      const o = new THREE.Object3D();
      o.userData = { kind: 'date', inUse: false, baseY: 0.9, phase: Math.random() * 6 };
      return o;
    });
    const mesh = (geo, mat, n) => { const m = new THREE.InstancedMesh(geo, mat, n); m.frustumCulled = false; m.count = 0; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(m); return m; };
    this.dateMesh = mesh(new THREE.SphereGeometry(1, 10, 8), DATE_MAT, DATES * 2);
    this.leafMesh = mesh(new THREE.BoxGeometry(1, 1, 1), LEAF_MAT, DATES);
    this.haloMesh = mesh(new THREE.PlaneGeometry(1, 1), HALO_MAT, DATES);
    this._dl = [];

    this.active = [];
    this.onField = new Set();
    this.cool = {};
    this.reset();
  }

  make(e) {
    const o = e.rock ? e.build() : bake(e.build());
    const g = e.rock ? new THREE.Group() : o;
    if (e.rock) g.add(o);
    const marker = new THREE.Mesh(MARKER_GEO, MARKER_MAT);
    marker.visible = false;
    g.add(marker);
    g.userData = { kind: 'obstacle', entry: e, act: e.act, hd: e.hd, cat: e.cat, inUse: false, marker, s0: g.scale.x, rockMesh: e.rock ? o : null };
    g.visible = false;
    this.scene.add(g);
    return g;
  }

  take(e) {
    const pool = this.pools.get(e.id);
    let o = pool.find((x) => !x.userData.inUse);
    if (!o && pool.length < 4) { o = this.make(e); pool.push(o); }
    return o || null;
  }

  reset() {
    for (const o of this.active) { o.visible = false; o.userData.inUse = false; }
    this.active = [];
    this.onField.clear();
    this.cool = {};
    this.first = true;
    this.frontier = -999;
    this.ayahWait = CFG.ayahFirstAt;
    this.zamWait = 8;
    this.dateMesh.count = this.leafMesh.count = this.haloMesh.count = 0;
  }

  zamActive() { return this.zamObjs.some((o) => o.userData.inUse); }

  // where the ayah currently on the field is (for sparkles)
  ayahOnField() { return this.ayahObjs.find((o) => o.userData.inUse && !o.userData.knock) || null; }

  // ---------- placing things ----------
  arm(o, lane, z, beh) {
    const u = o.userData;
    u.inUse = true; o.visible = true;
    o.position.set(CFG.lanes[lane], 0, z);
    o.rotation.set(0, 0, 0);
    o.scale.setScalar(u.s0);
    Object.assign(u, { lane, beh, t: 0, extraV: 0, hs: 1, solid: true, falling: false, knock: 0, counted: false, cued: false, prevZ: z, spinV: 0, label: null });
    u.marker.visible = false;
    switch (beh) {
      case 'moving': u.extraV = rnd(6, 9); break;
      case 'falling': o.position.y = 10; u.falling = true; u.fallAt = -40; u.marker.visible = true; break;
      case 'sliding': u.sw = rnd(1.1, 1.7); u.sp = rnd(0, 6.28); u.amp = 2.2; o.position.x = Math.sin(u.sp) * u.amp; break;
      case 'rotating': u.spinV = (Math.random() < 0.5 ? -1 : 1) * rnd(2.5, 4); break;
      case 'expanding': u.ep = rnd(0, 6.28); break;
      case 'temporary': u.tp = rnd(0, 1.9); break;
      case 'rolling': {                       // the sin rock: rolls toward you fast
        u.extraV = rnd(7, 10);
        const i = ri(ROCK_MATS.length);
        u.rockMesh.material = ROCK_MATS[i];
        u.rockMesh.rotation.x = rnd(0, 6.28);
        u.label = ROCK_LABEL[i];
        break;
      }
      default: break;
    }
    this.active.push(o);
  }

  placeCollectible(o, lane, z, y) {
    const u = o.userData;
    u.inUse = true; u.baseY = y; u.knock = 0; u.prevZ = z; u.hs = 1;
    o.visible = true;
    o.position.set(CFG.lanes[lane], y, z);
    this.active.push(o);
  }

  pickEntry(act, cat, plain) {
    let list = BY_ACT[act];
    if (plain) list = list.filter((e) => !e.rock);       // fixed-timing patterns never contain the fast rock
    const f = cat ? list.filter((e) => e.cat === cat) : list;
    return pick(f.length ? f : list);
  }

  behFor(e, ctx, allowed) {
    if (e.rock) return 'rolling';
    const T = TIERS[ctx.ti];
    if (ctx.mods.calm || !T.beh.length || Math.random() > T.pBeh) return 'static';
    const list = T.beh.filter((b) => allowed.includes(b) && compat(e, b));
    return list.length ? pick(list) : 'static';
  }

  // ---------- pattern planning ----------
  planRows(ctx) {
    const T = TIERS[ctx.ti], m = ctx.mods;
    const cat = m.forceCat || null;
    const ALL = T.beh, SOFTB = ['rotating', 'temporary'];
    let type = weighted(m.calm ? { single: 70, pair: 30 } : T.w);
    if (m.rush && Math.random() < 0.7) type = 'rush';
    const lanes = [0, 1, 2];
    const rows = [];
    const wall = (a) => ({ items: lanes.map((l) => ({ lane: l, act: a, cat, allow: SOFTB, plain: true })), safe: [0, 1, 2] });
    const narrow = (n) => {
      let s = ri(3);
      for (let i = 0; i < n; i++) {
        if (i > 0) s = clamp(s + pick([-1, 0, 1]), 0, 2);
        rows.push({ items: lanes.filter((l) => l !== s).map((l) => ({ lane: l, act: 'full', cat, allow: [], plain: true })), safe: [s] });
      }
    };

    switch (type) {
      case 'pair': {
        const ls = shuffle([0, 1, 2]);
        rows.push({ items: [{ lane: ls[0], act: randAct(), cat, allow: ALL }, { lane: ls[1], act: randAct(), cat, allow: ALL }], safe: [ls[2]] });
        break;
      }
      case 'wall': rows.push(wall(Math.random() < 0.5 ? 'low' : 'high')); break;
      case 'seq': {
        const n = 2 + ri(Math.max(1, T.seq - 1));
        let a = Math.random() < 0.5 ? 'low' : 'high';
        const acts = [a];
        for (let i = 1; i < n; i++) { if (Math.random() < 0.7) a = a === 'low' ? 'high' : 'low'; acts.push(a); }
        if (acts.every((x) => x === acts[0])) acts[acts.length - 1] = acts[0] === 'low' ? 'high' : 'low';
        acts.forEach((x) => rows.push(wall(x)));
        break;
      }
      case 'narrow': narrow(2 + ri(Math.max(1, T.narrow - 1))); break;
      case 'combo': narrow(2); rows.push(wall(Math.random() < 0.5 ? 'low' : 'high')); break;
      case 'sweeper': {
        const n = 1 + ri(2), base = rnd(0, 6.28);
        for (let i = 0; i < n; i++) rows.push({ items: [{ lane: 1, act: Math.random() < 0.5 ? 'low' : 'full', cat, beh: 'sliding', phase: base + i * Math.PI, plain: true }], safe: [0, 1, 2] });
        break;
      }
      case 'rush': {
        const n = 2 + ri(3);
        for (let i = 0; i < n; i++) { const l = ri(3); rows.push({ items: [{ lane: l, act: randAct(), cat: 'digital', allow: ALL, plain: true }], safe: lanes.filter((x) => x !== l) }); }
        break;
      }
      default: {
        const l = ri(3);
        rows.push({ items: [{ lane: l, act: randAct(), cat, allow: ALL }], safe: lanes.filter((x) => x !== l) });
      }
    }
    return rows;
  }

  spawnEvent(ctx, z0) {
    const T = TIERS[ctx.ti];
    const rows = this.planRows(ctx);
    const step = Math.max(10, T.step * ctx.speed);
    rows.forEach((row, k) => {
      const z = z0 - k * step;
      for (const it of row.items) {
        const e = this.pickEntry(it.act, it.cat, it.plain);
        const o = this.take(e);
        if (!o) continue;
        const beh = it.beh || this.behFor(e, ctx, it.allow || []);
        this.arm(o, it.lane, z, beh);
        if (it.phase !== undefined) { o.userData.sp = it.phase; o.position.x = Math.sin(it.phase) * o.userData.amp; }
      }
    });
    let last = z0 - (rows.length - 1) * step;

    // ----- trails of dates (Sabr) in the lane you will need next -----
    const trail = (lane, zc) => {
      for (let j = -1; j <= 1; j++) {
        const d = this.dateObjs.find((x) => !x.userData.inUse);
        if (d) this.placeCollectible(d, lane, zc + j * 2.2, 0.9);
      }
    };
    const safeOf = (r) => (r.safe && r.safe.length ? r.safe : [0, 1, 2]);
    if (ctx.mods.calm || Math.random() < 0.8) trail(pick(safeOf(rows[0])), z0 + step * 0.5);
    for (let i = 0; i < rows.length - 1; i++) {
      if (ctx.mods.calm || Math.random() < 0.75) trail(pick(safeOf(rows[i + 1])), z0 - (i + 0.5) * step);
    }

    // ----- reward row after the sequence: the next ayah first, Zamzam if a life is missing -----
    const S = SURAHS[ctx.surah];
    const marker = this.ayahObjs[ctx.surah];
    let nextN = 0;
    for (let n = 1; n <= S.ayahs; n++) {
      const k = ayahKey(ctx.surah, n);
      if (!ctx.ayahGot.has(n) && !this.onField.has(k) && !(this.cool[k] > 0)) { nextN = n; break; }
    }
    const wantAyah = this.ayahWait <= 0 && nextN > 0 && !marker.userData.inUse;
    const wantZam = !wantAyah && ctx.lives < CFG.maxLives && this.zamWait <= 0 && !this.zamActive();
    if (wantAyah || wantZam) {
      const safe = rows[rows.length - 1].safe || [0, 1, 2];
      const reach = [0, 1, 2].filter((l) => safe.some((s) => Math.abs(l - s) <= 1));
      const off = reach.filter((l) => !safe.includes(l));           // prefer a lane that needs a switch
      const R = pick(ctx.ti >= 1 && off.length ? off : reach);
      const zr = last - step;
      if (wantAyah) {
        const air = ctx.ti >= 2 && Math.random() < 0.35;               // grab it mid-jump over an obstacle
        marker.userData.setNumber(nextN);
        this.placeCollectible(marker, R, zr, air ? 3.2 : 1.4);
        this.onField.add(ayahKey(ctx.surah, nextN));
        this.ayahWait = CFG.ayahInterval * ctx.mods.surahMul;
        if (air) { const o = this.take(pick(BY_ACT.low)); if (o) this.arm(o, R, zr, 'static'); }
        else if (ctx.ti >= 1 && Math.random() < 0.5) {                  // tighter placement: other lanes blocked
          for (const l of [0, 1, 2].filter((x) => x !== R)) { const o = this.take(this.pickEntry('full', null, true)); if (o) this.arm(o, l, zr, 'static'); }
        }
      } else {
        const o = this.zamObjs.find((x) => !x.userData.inUse);
        if (o) { this.placeCollectible(o, R, zr, 0.2); this.zamWait = CFG.zamzamInterval; }
      }
      last = zr;
    }
    this.frontier = last;
  }

  release(o, i, missed) {
    const u = o.userData;
    o.visible = false; u.inUse = false;
    this.active.splice(i, 1);
    if (u.kind === 'ayah') {
      const k = ayahKey(u.surah, u.n);
      this.onField.delete(k);
      if (missed) this.cool[k] = CFG.ayahCooldown;
    }
  }

  knockOut(o) {
    const u = o.userData;
    u.knock = 0.7;
    u.kv = new THREE.Vector3((Math.random() - 0.5) * 8, 9, -10);
    u.marker.visible = false;
  }

  syncDates() {
    let n = 0;
    for (const o of this._dl) {
      const x = o.position.x, y = o.position.y, z = o.position.z;
      for (let k = 0; k < 2; k++) {
        dummy.position.set(x + (k ? 0.15 : -0.15), y + (k ? 0.03 : -0.03), z);
        dummy.rotation.set(0, 0, k ? -0.5 : 0.5);
        dummy.scale.set(0.2, 0.38, 0.2); dummy.updateMatrix();
        this.dateMesh.setMatrixAt(n * 2 + k, dummy.matrix);
      }
      dummy.position.set(x, y + 0.42, z); dummy.rotation.set(0, 0.4, 0.55); dummy.scale.set(0.62, 0.04, 0.2); dummy.updateMatrix();
      this.leafMesh.setMatrixAt(n, dummy.matrix);
      dummy.position.set(x, y, z + 0.05); dummy.rotation.set(0, 0, 0); dummy.scale.set(1.4, 1.4, 1); dummy.updateMatrix();
      this.haloMesh.setMatrixAt(n, dummy.matrix);
      n++;
    }
    this.dateMesh.count = n * 2; this.leafMesh.count = n; this.haloMesh.count = n;
    this.dateMesh.instanceMatrix.needsUpdate = this.leafMesh.instanceMatrix.needsUpdate = this.haloMesh.instanceMatrix.needsUpdate = true;
  }

  // ---------- per frame ----------
  update(dt, speed, ctx, spawn = true) {
    const ev = [];
    for (const k in this.cool) if (this.cool[k] > 0) this.cool[k] -= dt;
    if (spawn) {
      this.ayahWait -= dt; this.zamWait -= dt;
      this.frontier += speed * dt;
      const gapM = TIERS[ctx.ti].gap * speed * ctx.mods.gapMul;
      if (this.first) { this.first = false; this.spawnEvent(ctx, -45); }
      else if (this.frontier >= CFG.spawnZ + gapM) this.spawnEvent(ctx, CFG.spawnZ);
    }

    const t = performance.now() * 0.001;
    this._dl.length = 0;
    for (let i = this.active.length - 1; i >= 0; i--) {
      const o = this.active[i], u = o.userData;
      u.prevZ = o.position.z;

      if (u.knock > 0) {                          // tumbling away after a hit
        u.knock -= dt;
        o.position.x += u.kv.x * dt; o.position.y += u.kv.y * dt; o.position.z += (speed + u.kv.z) * dt;
        u.kv.y -= 28 * dt;
        o.rotation.x += 8 * dt; o.rotation.z += 5 * dt;
        o.scale.setScalar(Math.max(0.01, u.s0 * (u.knock / 0.7)));
        if (u.knock <= 0) this.release(o, i, false);
        continue;
      }

      o.position.z += (speed + (u.extraV || 0)) * dt;

      if (u.kind === 'obstacle') {
        u.t += dt;
        if (u.falling && o.position.z > u.fallAt) {
          o.position.y -= 24 * dt;
          if (o.position.y <= 0) { o.position.y = 0; u.falling = false; u.marker.visible = false; ev.push({ kind: 'land' }); }
        }
        if (u.marker.visible) u.marker.position.y = 0.04 - o.position.y;
        if (u.beh === 'sliding') o.position.x = Math.sin(u.sp + u.t * u.sw) * u.amp;
        else if (u.beh === 'rotating') o.rotation.y += u.spinV * dt;
        else if (u.beh === 'rolling') u.rockMesh.rotation.x += ((speed + u.extraV) / 0.95) * dt;
        else if (u.beh === 'expanding') { const s = 1.05 + 0.3 * Math.sin(u.ep + u.t * 3); u.hs = s; o.scale.setScalar(u.s0 * s); }
        else if (u.beh === 'temporary') { const on = ((u.t + u.tp) % 1.9) / 1.9 < 0.62; u.solid = on; o.visible = on; }
        if (u.entry.cue && !u.cued && o.position.z > -34) { u.cued = true; ev.push({ kind: 'cue', name: u.entry.cue }); }
      } else if (u.kind === 'date') {
        o.position.y = u.baseY + Math.sin(t * 4 + u.phase) * 0.1;
        this._dl.push(o);
      } else {
        o.position.y = u.baseY + Math.sin(t * 3 + u.phase) * 0.14;
        u.animate(t, o);
      }

      if (o.position.z > CFG.despawnZ) this.release(o, i, true);
    }
    this.syncDates();
    return ev;
  }

  // events: hit | near | ayah | zamzam | date
  collide(player, canHit) {
    const ev = [];
    for (let i = this.active.length - 1; i >= 0; i--) {
      const o = this.active[i], u = o.userData;
      if (u.knock > 0) continue;
      const z = o.position.z, pz = u.prevZ;
      const lo = Math.min(pz, z), hi = Math.max(pz, z);
      const dx = Math.abs(o.position.x - player.x);

      if (u.kind === 'obstacle') {
        const reach = u.hd * u.hs + 0.4;
        const solid = u.solid && !(u.falling && o.position.y > 0.5);
        if (!solid || !canHit) continue;
        const lim = 0.95 * u.hs;
        if (hi >= -reach && lo <= reach && dx < lim) {
          let hit = true;
          if (u.act === 'low') hit = player.y < 0.9 * u.hs;
          else if (u.act === 'high') hit = !player.sliding;
          if (hit) { ev.push({ kind: 'hit', cat: u.cat, label: u.label || u.entry.label, x: o.position.x, y: o.position.y + 1, z }); this.knockOut(o); continue; }
        }
        if (!u.counted && pz < reach && z >= reach) {       // just went past the player
          u.counted = true;
          if ((dx >= lim && dx < lim + 0.75) || (u.act === 'low' && dx < lim && player.y < 1.3)) ev.push({ kind: 'near', x: player.x });
        }
      } else if (hi >= -1.1 && lo <= 1.1 && dx < 1.15) {
        const cy = o.position.y + (u.cyOff || 0);
        const top = player.y + (player.sliding ? 0.8 : 1.8);
        if (top >= cy - 0.7 && player.y <= cy + 0.7) {
          ev.push({ kind: u.kind, surah: u.surah, n: u.n, x: o.position.x, y: cy, z });
          this.release(o, i, false);
        }
      }
    }
    return ev;
  }
}
