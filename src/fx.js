import * as THREE from 'three';

// One pooled Points object for every burst in the game (gold collect, red hit sparks, fireworks, healing...)
function dotTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 30);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export class Particles {
  constructor(scene, max = 480) {
    this.max = max; this.i = 0;
    this.pos = new Float32Array(max * 3).fill(-999);
    this.col = new Float32Array(max * 3);
    this.base = new Float32Array(max * 3);
    this.vel = new Float32Array(max * 3);
    this.life = new Float32Array(max);
    this.maxLife = new Float32Array(max).fill(1);
    this.grav = new Float32Array(max);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    this.geo = g;
    this.points = new THREE.Points(g, new THREE.PointsMaterial({
      size: 0.4, map: dotTexture(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    }));
    this.points.frustumCulled = false;
    scene.add(this.points);
    this.c = new THREE.Color();
  }

  emit(x, y, z, n, color, { speed = 4, up = 2, life = 0.9, grav = 7, spread = 1 } = {}) {
    this.c.set(color);
    for (let k = 0; k < n; k++) {
      const i = this.i; this.i = (this.i + 1) % this.max;
      const a = Math.random() * Math.PI * 2, e = (Math.random() - 0.3) * Math.PI * 0.9;
      const s = speed * (0.35 + Math.random() * 0.65);
      this.pos[i * 3] = x + (Math.random() - 0.5) * spread * 0.3;
      this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z + (Math.random() - 0.5) * spread * 0.3;
      this.vel[i * 3] = Math.cos(a) * Math.cos(e) * s;
      this.vel[i * 3 + 1] = Math.sin(e) * s + up;
      this.vel[i * 3 + 2] = Math.sin(a) * Math.cos(e) * s;
      this.base[i * 3] = this.c.r; this.base[i * 3 + 1] = this.c.g; this.base[i * 3 + 2] = this.c.b;
      this.life[i] = this.maxLife[i] = life * (0.7 + Math.random() * 0.5);
      this.grav[i] = grav;
    }
  }

  // ring of sparks (fireworks)
  firework(x, y, z, color) {
    this.emit(x, y, z, 46, color, { speed: 6.5, up: 0, life: 1.3, grav: 3.5 });
    this.emit(x, y, z, 14, 0xffffff, { speed: 3.5, up: 0, life: 0.9, grav: 3 });
  }

  update(dt) {
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      if (this.life[i] <= 0) { this.pos[i * 3 + 1] = -999; this.col[i * 3] = this.col[i * 3 + 1] = this.col[i * 3 + 2] = 0; continue; }
      this.vel[i * 3 + 1] -= this.grav[i] * dt;
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      const f = this.life[i] / this.maxLife[i];
      this.col[i * 3] = this.base[i * 3] * f; this.col[i * 3 + 1] = this.base[i * 3 + 1] * f; this.col[i * 3 + 2] = this.base[i * 3 + 2] * f;
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
  }
}
