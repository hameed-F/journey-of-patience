import * as THREE from 'three';
import { CFG } from './config.js';

const { damp, clamp } = THREE.MathUtils;
const ACTION_KEYS = ['run', 'jump', 'slide', 'hit', 'victory'];

function toLambert(m) {
  // Cheaper than PBR on phones and looks right for a stylised game.
  if (!m || !m.isMeshStandardMaterial) return m;
  const n = new THREE.MeshLambertMaterial({
    map: m.map,
    color: m.color,
    transparent: m.transparent,
    opacity: m.opacity,
    alphaTest: m.alphaTest,
    side: m.side,
    vertexColors: m.vertexColors,
    emissive: m.emissive,
    emissiveMap: m.emissiveMap,
  });
  n.name = m.name;
  return n;
}

export class Player {
  constructor(scene, gltf) {
    this.root = new THREE.Group();
    scene.add(this.root);

    this.mixer = null;
    this.actions = {};
    this.current = null;

    this.lane = 1;
    this.x = 0; this.y = 0; this.vy = 0; this.vx = 0;
    this.sliding = false; this.slideT = 0; this.slideOnLand = false;
    this.alive = true; this.celebrating = false;

    this.holder = new THREE.Group();
    this.root.add(this.holder);
    if (gltf) this.buildFromGLTF(gltf); else this.buildPlaceholder();

    // cheap blob shadow instead of real-time shadows
    const sg = new THREE.CircleGeometry(0.55, 16).rotateX(-Math.PI / 2);
    this.shadow = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false }));
    this.shadow.position.y = 0.04;
    scene.add(this.shadow);

    this.aura = new THREE.Mesh(new THREE.SphereGeometry(1.25, 20, 14), new THREE.MeshBasicMaterial({ color: 0xffd36b, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.aura.position.y = 0.95;
    this.aura.visible = false;
    this.root.add(this.aura);

    this.reset();
  }

  buildFromGLTF(gltf) {
    const model = gltf.scene;
    model.traverse((o) => {
      if (o.isMesh || o.isSkinnedMesh) {
        o.frustumCulled = false;
        o.castShadow = false;
        o.receiveShadow = false;
        o.material = Array.isArray(o.material) ? o.material.map(toLambert) : toLambert(o.material);
      }
    });

    // Auto-scale to CFG.charHeight and put the feet on y = 0
    model.updateMatrixWorld(true);
    const b1 = new THREE.Box3().setFromObject(model);
    const h = b1.max.y - b1.min.y;
    if (h > 0 && isFinite(h)) model.scale.multiplyScalar(CFG.charHeight / h);
    model.updateMatrixWorld(true);
    const b2 = new THREE.Box3().setFromObject(model);
    model.position.y -= b2.min.y;

    this.holder.add(model);
    this.holder.rotation.y = CFG.charFacing;
    this.model = model;

    this.mixer = new THREE.AnimationMixer(model);
    for (const clip of gltf.animations) {
      const name = clip.name.toLowerCase();
      const key = ACTION_KEYS.find((k) => name === k) || ACTION_KEYS.find((k) => name.includes(k));
      if (!key || this.actions[key]) continue;

      // Safety net: remove forward/sideways root motion if the export wasn't "In Place"
      for (const t of clip.tracks) {
        if (/hips\.position$/i.test(t.name)) {
          const v = t.values, x0 = v[0], z0 = v[2];
          for (let i = 0; i < v.length; i += 3) { v[i] = x0; v[i + 2] = z0; }
        }
      }

      const a = this.mixer.clipAction(clip);
      if (key === 'run' || key === 'victory') {
        a.setLoop(THREE.LoopRepeat, Infinity);
      } else {
        a.setLoop(THREE.LoopOnce, 1);
        a.clampWhenFinished = true;
      }
      if (key === 'jump') a.timeScale = clamp(clip.duration / 0.75, 0.7, 3);
      if (key === 'slide') a.timeScale = clamp(clip.duration / CFG.slideTime, 0.7, 3);
      this.actions[key] = a;
    }

    this.mixer.addEventListener('finished', (e) => {
      if (!this.alive || this.celebrating) return;
      if (e.action === this.actions.hit && this.current === e.action) this.play(this.y > 0 ? 'jump' : 'run');
    });

    if (!this.actions.run) console.warn('[Player] No "run" animation found. Clips:', gltf.animations.map((c) => c.name));
  }

  buildPlaceholder() {
    console.warn('[Player] Using placeholder character (GLB not loaded).');
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.8, 4, 8), new THREE.MeshLambertMaterial({ color: 0xff6b3d }));
    body.position.y = 0.75;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), new THREE.MeshLambertMaterial({ color: 0xf2c9a0 }));
    head.position.y = 1.5;
    this.holder.add(body, head);
    this.model = this.holder;
  }

  play(name, fade = 0.12) {
    const next = this.actions[name];
    if (!next) return;
    if (next === this.current) {
      if (next.loop === THREE.LoopOnce) next.reset().play();
      return;
    }
    if (!this.current || fade <= 0) {
      if (this.current) this.current.stop();
      next.reset().setEffectiveWeight(1).play();
    } else {
      next.reset().setEffectiveWeight(1).fadeIn(fade).play();
      this.current.fadeOut(fade);
    }
    this.current = next;
  }

  playingName() {
    return Object.keys(this.actions).find((k) => this.actions[k] === this.current);
  }

  reset() {
    this.lane = 1;
    this.x = CFG.lanes[1]; this.y = 0; this.vy = 0; this.vx = 0;
    this.sliding = false; this.slideT = 0; this.slideOnLand = false;
    this.alive = true; this.celebrating = false;
    if (this.mixer) this.mixer.stopAllAction();
    this.current = null;
    this.play('run', 0);
    this.model.visible = true;
  }

  setRunSpeed(speed) {
    if (this.actions.run) this.actions.run.timeScale = clamp(speed / 14, 0.6, 1.8);
  }

  moveLane(d) {
    if (!this.alive || this.celebrating) return false;
    const n = clamp(this.lane + d, 0, 2);
    if (n === this.lane) return false;
    this.lane = n;
    return true;
  }

  jump() {
    if (!this.alive || this.celebrating || this.y > 0) return false;
    this.sliding = false;
    this.vy = CFG.jumpVelocity;
    this.y = 0.001;
    this.play('jump');
    return true;
  }

  slide() {
    if (!this.alive || this.celebrating) return false;
    if (this.y > 0) { this.vy = -CFG.slamSpeed; this.slideOnLand = true; return true; }
    if (this.sliding) return false;
    this.startSlide();
    return true;
  }

  startSlide() {
    this.sliding = true;
    this.slideT = CFG.slideTime;
    this.play('slide');
  }

  hit() { this.play('hit', 0.05); }

  die() { this.alive = false; this.sliding = false; this.play('hit', 0.05); }

  celebrate() {
    this.celebrating = true;
    this.sliding = false;
    this.y = 0; this.vy = 0;
    this.play('victory', 0.25);
  }

  update(dt, invincible, shield = 0) {
    const prevX = this.x;
    this.x = damp(this.x, CFG.lanes[this.lane], CFG.laneDamp, dt);
    this.vx = (this.x - prevX) / Math.max(dt, 1e-4);

    if (this.y > 0 || this.vy !== 0) {
      this.vy -= CFG.gravity * dt;
      this.y += this.vy * dt;
      if (this.y <= 0) {
        this.y = 0; this.vy = 0;
        if (this.alive && !this.celebrating) {
          if (this.slideOnLand) { this.slideOnLand = false; this.startSlide(); }
          else if (this.playingName() === 'jump') this.play('run');
        }
      }
    }

    if (this.sliding) {
      this.slideT -= dt;
      if (this.slideT <= 0) {
        this.sliding = false;
        if (this.alive && !this.celebrating && this.playingName() === 'slide') this.play('run');
      }
    }

    // drift feel: turn + lean into lane changes
    const lean = this.alive && !this.celebrating ? this.vx : 0;
    this.root.position.set(this.x, this.y, 0);
    this.root.rotation.y = clamp(-lean * 0.03, -0.35, 0.35);
    this.root.rotation.z = clamp(-lean * 0.02, -0.25, 0.25);

    if (this.mixer) this.mixer.update(dt);

    // blink while invincible
    this.model.visible = !(invincible > 0 && this.alive) || Math.floor(invincible * 12) % 2 === 0;

    this.aura.visible = shield > 0;
    if (shield > 0) {
      const k = 1 + Math.sin(performance.now() * 0.008) * 0.06;
      this.aura.scale.setScalar(k);
      this.aura.material.opacity = shield < 1 ? 0.1 + 0.1 * (Math.floor(shield * 10) % 2) : 0.22;
    }

    this.shadow.position.x = this.x;
    const s = 1 - Math.min(this.y / 3, 0.6);
    this.shadow.scale.set(s, 1, s);
  }
}
