// Day/night cycle, weather (fog, rain, lightning), lamps, moon, stars, player torch.
import * as THREE from 'three';
import { CFG } from './config.js';
import { MAT } from './world.js';
import { sfx } from './audio.js';

const { damp, lerp } = THREE.MathUtils;
const C = (h) => new THREE.Color(h);

const KEYS = [
  { t: 0.00, sky: C(0xf2b38a), hs: C(0xffd9b8), hg: C(0x8a7a5a), hi: 1.3, sc: C(0xffc08a), si: 1.0, night: 0.25 },
  { t: 0.12, sky: C(0x9fd8ff), hs: C(0xffffff), hg: C(0x88aa66), hi: 1.9, sc: C(0xfff1d0), si: 1.6, night: 0 },
  { t: 0.40, sky: C(0x8fd0ff), hs: C(0xffffff), hg: C(0x88aa66), hi: 1.9, sc: C(0xfff1d0), si: 1.6, night: 0 },
  { t: 0.52, sky: C(0xf0905a), hs: C(0xffc9a0), hg: C(0x7a6a4a), hi: 1.35, sc: C(0xff9a5a), si: 1.0, night: 0.4 },
  { t: 0.62, sky: C(0x1a2350), hs: C(0x6a7bb8), hg: C(0x2a3050), hi: 0.75, sc: C(0x8aa0e8), si: 0.35, night: 1 },
  { t: 0.88, sky: C(0x0b1535), hs: C(0x6a7bb8), hg: C(0x2a3050), hi: 0.7, sc: C(0x8aa0e8), si: 0.3, night: 1 },
  { t: 1.00, sky: C(0xf2b38a), hs: C(0xffd9b8), hg: C(0x8a7a5a), hi: 1.3, sc: C(0xffc08a), si: 1.0, night: 0.25 },
];

const sky = new THREE.Color(), hs = new THREE.Color(), hg = new THREE.Color(), sc = new THREE.Color();
const GRAY_RAIN = C(0x59636f), GRAY_FOG = C(0xb4bcc2), WARM = C(0xffe6b8);
const LAMP_DIM = C(0x9a8f70), LAMP_ON = C(0xffe9a0);
const WIN_OFF = C(0x3b465c), WIN_ON = C(0xffd98a);

const TORCH_I = 26;
const HILL_FAR = new THREE.Color(0x5f8f86), HILL_NEAR = new THREE.Color(0x3f7a5a);

class Rain {
  constructor(scene) {
    this.n = (typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches) ? 420 : 700;
    this.p = new Float32Array(this.n * 6);
    this.v = new Float32Array(this.n);
    for (let i = 0; i < this.n; i++) this.reset(i, true);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.p, 3));
    this.geo = g;
    this.mat = new THREE.LineBasicMaterial({ color: 0xbcd3ea, transparent: true, opacity: 0, depthWrite: false, fog: false });
    this.lines = new THREE.LineSegments(g, this.mat);
    this.lines.frustumCulled = false;
    this.lines.visible = false;
    scene.add(this.lines);
  }
  reset(i, init) {
    const x = (Math.random() - 0.5) * 34, z = -45 + Math.random() * 55, y = init ? Math.random() * 18 : 18 + Math.random() * 3;
    const o = i * 6;
    this.p[o] = x; this.p[o + 1] = y; this.p[o + 2] = z;
    this.p[o + 3] = x; this.p[o + 4] = y + 0.8; this.p[o + 5] = z;
    this.v[i] = 24 + Math.random() * 8;
  }
  update(dt, amount) {
    this.mat.opacity = amount * 0.5;
    this.lines.visible = amount > 0.02;
    if (!this.lines.visible) return;
    for (let i = 0; i < this.n; i++) {
      const o = i * 6, dy = this.v[i] * dt;
      this.p[o + 1] -= dy; this.p[o + 4] -= dy;
      if (this.p[o + 1] < 0) this.reset(i, false);
    }
    this.geo.attributes.position.needsUpdate = true;
  }
}

export class Env {
  constructor(scene, camera, hemi, sun, torch) {
    this.scene = scene; this.camera = camera; this.hemi = hemi; this.sun = sun; this.torch = torch;
    this.tod = CFG.startTod;
    const q = new URLSearchParams(location.search).get('tod');
    if (q !== null && !isNaN(+q)) this.tod = +q % 1;
    this.target = { fog: 0, rain: 0, peace: 0 };
    this.w = { fog: 0, rain: 0, peace: 0 };
    this.flash = 0; this.nextBolt = 3;
    this.night = 0;
    this.follow = null;

    this.rain = new Rain(scene);

    // sky objects (follow the camera so they look infinitely far away)
    this.sky = new THREE.Group();
    const mk = (r, c) => new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), new THREE.MeshBasicMaterial({ color: c, fog: false, transparent: true, depthWrite: false }));
    this.sunMesh = mk(5, 0xfff2b0); this.sunMesh.position.set(34, 25, -92);
    this.moon = mk(4.2, 0xf1f5ff); this.moon.position.set(-30, 27, -92);
    const sg = new THREE.BufferGeometry(), N = 320, sp = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const az = (Math.random() - 0.5) * Math.PI * 1.6, el = 0.12 + Math.random() * 0.9, r = 96;
      sp[i * 3] = Math.sin(az) * Math.cos(el) * r; sp[i * 3 + 1] = Math.sin(el) * r; sp[i * 3 + 2] = -Math.cos(az) * Math.cos(el) * r;
    }
    sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
    // distant hills (two layers) and drifting clouds
    const hillMat = () => new THREE.MeshBasicMaterial({ color: 0x7aa890, fog: false });
    this.hillFar = hillMat(); this.hillNear = hillMat();
    const hg = new THREE.SphereGeometry(1, 18, 10);
    for (let i = 0; i < 6; i++) {
      const m = new THREE.Mesh(hg, this.hillFar);
      m.scale.set(38 + Math.random() * 20, 9 + Math.random() * 8, 10); m.position.set(-95 + i * 38 + Math.random() * 10, -1, -103);
      this.sky.add(m);
    }
    for (let i = 0; i < 7; i++) {
      const m = new THREE.Mesh(hg, this.hillNear);
      m.scale.set(22 + Math.random() * 14, 5 + Math.random() * 4, 8); m.position.set(-90 + i * 30 + Math.random() * 12, -1.5, -96);
      this.sky.add(m);
    }
    const cc = document.createElement('canvas'); cc.width = 256; cc.height = 128;
    const cx = cc.getContext('2d');
    for (const [px, py, r] of [[70, 76, 46], [120, 62, 56], [176, 76, 44], [100, 86, 40], [150, 88, 38]]) {
      const g = cx.createRadialGradient(px, py, 0, px, py, r);
      g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      cx.fillStyle = g; cx.fillRect(0, 0, 256, 128);
    }
    const cloudTex = new THREE.CanvasTexture(cc);
    this.cloudMat = new THREE.SpriteMaterial({ map: cloudTex, transparent: true, depthWrite: false, fog: false, opacity: 0.9 });
    this.clouds = [];
    for (let i = 0; i < 8; i++) {
      const sp = new THREE.Sprite(this.cloudMat);
      sp.scale.set(26 + Math.random() * 16, 11 + Math.random() * 6, 1);
      sp.position.set(-95 + i * 26 + Math.random() * 10, 15 + Math.random() * 14, -88 + Math.random() * 14);
      this.sky.add(sp); this.clouds.push(sp);
    }
    this.sky.add(this.sunMesh, this.moon, this.stars);
    this.sky.renderOrder = -1;
    scene.add(this.sky);
  }

  reset() {
    this.tod = CFG.startTod;
    const q = new URLSearchParams(location.search).get('tod');
    if (q !== null && !isNaN(+q)) this.tod = +q % 1;
    this.target = { fog: 0, rain: 0, peace: 0 };
    this.w = { fog: 0, rain: 0, peace: 0 };
  }

  sample() {
    const t = this.tod;
    let i = 0;
    while (i < KEYS.length - 2 && t >= KEYS[i + 1].t) i++;
    const a = KEYS[i], b = KEYS[i + 1], f = (t - a.t) / (b.t - a.t);
    sky.lerpColors(a.sky, b.sky, f); hs.lerpColors(a.hs, b.hs, f); hg.lerpColors(a.hg, b.hg, f); sc.lerpColors(a.sc, b.sc, f);
    return { hi: lerp(a.hi, b.hi, f), si: lerp(a.si, b.si, f), night: lerp(a.night, b.night, f) };
  }

  update(dt, state) {
    // time of day runs everywhere except pause (caller skips us when paused)
    this.tod = (this.tod + dt / CFG.dayCycle) % 1;
    const s = this.sample();
    this.night = s.night;
    const w = this.w, t = this.target;
    w.fog = damp(w.fog, t.fog, 1.6, dt); w.rain = damp(w.rain, t.rain, 1.2, dt); w.peace = damp(w.peace, t.peace, 1.6, dt);

    // weather tints
    sky.lerp(GRAY_RAIN.clone().multiplyScalar(1 - 0.7 * s.night), 0.7 * w.rain);
    sky.lerp(GRAY_FOG.clone().multiplyScalar(1 - 0.8 * s.night), 0.6 * w.fog);
    sky.lerp(WARM.clone().multiplyScalar(1 - 0.6 * s.night), 0.22 * w.peace * (1 - s.night));
    this.scene.background.copy(sky);
    this.scene.fog.color.copy(sky);
    this.scene.fog.near = lerp(lerp(lerp(28, 8, w.fog), 18, w.rain), 34, w.peace);
    this.scene.fog.far = lerp(lerp(lerp(78, 46, w.fog), 62, w.rain), 100, w.peace);

    // lightning
    if (w.rain > 0.6) {
      this.nextBolt -= dt;
      if (this.nextBolt <= 0) { this.flash = 1; this.nextBolt = 4 + Math.random() * 5; setTimeout(sfx.thunder, 350 + Math.random() * 500); }
    }
    this.flash = Math.max(0, this.flash - dt * 6);

    // lights
    this.hemi.color.copy(hs); this.hemi.groundColor.copy(hg);
    this.hemi.intensity = s.hi * (1 - 0.3 * w.rain) * (1 - 0.12 * w.fog) + this.flash * 2.2;
    this.sun.color.copy(sc);
    this.sun.intensity = s.si * (1 - 0.45 * w.rain) * (1 - 0.2 * w.fog) + this.flash * 1.5;

    // lamps / windows / glow turn on with darkness, fog and rain
    const on = Math.max(s.night, 0.65 * w.fog, 0.45 * w.rain);
    MAT.lamp.color.lerpColors(LAMP_DIM, LAMP_ON, on);
    MAT.glow.opacity = on * 0.85;
    MAT.pool.opacity = on * 0.16;
    MAT.window.color.lerpColors(WIN_OFF, WIN_ON, Math.max(s.night, 0.5 * w.rain));
    this.torch.intensity = TORCH_I * Math.max(s.night, 0.5 * w.fog);
    if (this.follow) this.torch.position.set(this.follow.position.x, 2.8, 1.6);

    // sky dome
    this.sky.position.copy(this.camera.position);
    this.stars.material.opacity = Math.max(0, s.night - 0.2) * 1.2 * (1 - 0.8 * w.rain) * (1 - w.fog);
    this.moon.material.opacity = Math.min(1, s.night * 1.4) * (1 - 0.85 * w.rain) * (1 - w.fog);
    this.sunMesh.material.opacity = Math.max(0, 1 - s.night * 2.2) * (1 - 0.9 * w.rain) * (1 - w.fog);
    this.sunMesh.material.color.set(0xfff2b0).lerp(C(0xff8a4a), Math.min(1, s.night * 2.2));

    // hills + clouds follow the light
    this.hillFar.color.copy(sky).lerp(HILL_FAR, 0.55).multiplyScalar(1 - 0.5 * s.night);
    this.hillNear.color.copy(sky).lerp(HILL_NEAR, 0.6).multiplyScalar(1 - 0.55 * s.night);
    this.cloudMat.color.set(0xffffff).lerp(sky, 0.35 + 0.4 * s.night + 0.3 * w.rain).multiplyScalar(1 - 0.35 * w.rain);
    this.cloudMat.opacity = (0.92 - 0.6 * s.night) * (1 - 0.5 * w.fog) + 0.08 * w.rain;
    for (const c of this.clouds) { c.position.x += dt * 0.9; if (c.position.x > 110) c.position.x = -110; }
    MAT.road.color.setScalar(1 - 0.32 * w.rain);                 // wet road is darker

    this.rain.update(dt, w.rain);
  }
}
