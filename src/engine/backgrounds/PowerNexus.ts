import type { BackgroundLayer, EffectParams } from "./types";
import { DEFAULT_PARAMS } from "./types";

const TWO_PI = Math.PI * 2;
const SIN_TABLE_SIZE = 360;
const SIN_TABLE: number[] = [];
for (let i = 0; i < SIN_TABLE_SIZE; i++) {
  SIN_TABLE[i] = Math.sin((i / SIN_TABLE_SIZE) * TWO_PI);
}
const fastSin = (x: number): number => {
  const idx = ((x % TWO_PI) / TWO_PI * SIN_TABLE_SIZE + SIN_TABLE_SIZE) % SIN_TABLE_SIZE;
  return SIN_TABLE[Math.floor(idx)];
};

interface Ring {
  radius: number;
  segments: number;
  rotation: number;
  speed: number;
  segmentGaps: number[];
  pulsePhase: number;
  thickness: number;
}

interface Bolt {
  points: { x: number; y: number }[];
  alpha: number;
  decay: number;
  hue: number;
  width: number;
}

interface BgArc {
  startAngle: number;
  endAngle: number;
  radius: number;
  speed: number;
  alpha: number;
}

interface Particle {
  x: number; y: number; vx: number; vy: number;
  size: number; alpha: number; hue: number;
  life: number; maxLife: number; active: boolean;
}

export class PowerNexus implements BackgroundLayer {
  private w: number;
  private h: number;
  private cx: number;
  private cy: number;
  private baseHue: number;
  private rings: Ring[] = [];
  private bolts: Bolt[] = [];
  private arcs: BgArc[] = [];
  private particles: Particle[] = [];
  private lastBoltTime = 0;
  private surgeActive = false;
  private surgeProgress = 0;
  private lastSurge = 0;

  constructor(w: number, h: number, color?: string) {
    this.baseHue = parseInt(color || "200") || 200;
    this.w = w; this.h = h;
    this.cx = w / 2; this.cy = h / 2;
    this.initRings();
    this.initParticles();
    this.initArcs();
  }

  resize(w: number, h: number) {
    this.w = w; this.h = h;
    this.cx = w / 2; this.cy = h / 2;
    this.initRings();
    this.initArcs();
  }

  private initRings() {
    const baseR = Math.min(this.w, this.h) * 0.12;
    this.rings = [];
    for (let i = 0; i < 6; i++) {
      const segs = 6 + i * 2;
      const gaps: number[] = [];
      for (let j = 0; j < segs; j++) gaps.push(0.1 + Math.random() * 0.12);
      this.rings.push({
        radius: baseR + i * baseR * 0.38,
        segments: segs,
        rotation: Math.random() * TWO_PI,
        speed: (0.06 + Math.random() * 0.12) * (i % 2 ? 1 : -1),
        segmentGaps: gaps,
        pulsePhase: Math.random() * TWO_PI,
        thickness: 2 + (5 - i) * 0.35,
      });
    }
  }

  private initArcs() {
    this.arcs = [];
    for (let i = 0; i < 6; i++) {
      this.arcs.push({
        startAngle: Math.random() * TWO_PI,
        endAngle: Math.random() * Math.PI * 0.4 + 0.2,
        radius: Math.min(this.w, this.h) * (0.25 + Math.random() * 0.35),
        speed: (Math.random() - 0.5) * 0.25,
        alpha: 0.08 + Math.random() * 0.15,
      });
    }
  }

  private initParticles() {
    this.particles = [];
    for (let i = 0; i < 60; i++) {
      this.particles.push(this.makeParticle());
    }
  }

  private makeParticle(): Particle {
    const edge = Math.random() * 4 | 0;
    return {
      x: edge === 1 ? this.w + 20 : edge === 3 ? -20 : Math.random() * this.w,
      y: edge === 0 ? -20 : edge === 2 ? this.h + 20 : Math.random() * this.h,
      vx: 0, vy: 0,
      size: 2 + Math.random() * 3,
      alpha: 0.5 + Math.random() * 0.3,
      hue: this.baseHue + (Math.random() - 0.5) * 20,
      maxLife: 6 + Math.random() * 4,
      life: 6 + Math.random() * 4,
      active: true,
    };
  }

  private generateBolt(sx: number, sy: number, ex: number, ey: number, depth: number): { x: number; y: number }[] {
    const pts: { x: number; y: number }[] = [{ x: sx, y: sy }];
    const subdivide = (s: { x: number; y: number }, e: { x: number; y: number }, d: number): { x: number; y: number }[] => {
      if (d === 0) return [e];
      const mx = (s.x + e.x) / 2, my = (s.y + e.y) / 2;
      const dist = Math.sqrt((e.x - s.x) ** 2 + (e.y - s.y) ** 2);
      const off = (Math.random() - 0.5) * dist * 0.4;
      const px = -(e.y - s.y) / (dist || 1), py = (e.x - s.x) / (dist || 1);
      const mid = { x: mx + px * off, y: my + py * off };
      return [...subdivide(s, mid, d - 1), ...subdivide(mid, e, d - 1)];
    };
    pts.push(...subdivide({ x: sx, y: sy }, { x: ex, y: ey }, depth));
    return pts;
  }

  private drawBoltPath(ctx: CanvasRenderingContext2D, pts: { x: number; y: number }[]) {
    if (pts.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
  }

  private spawnBolt(time: number) {
    const side = Math.random() * 4 | 0;
    const sx = side === 1 ? this.w : side === 3 ? 0 : Math.random() * this.w;
    const sy = side === 0 ? 0 : side === 2 ? this.h : Math.random() * this.h;
    const ex = this.cx + (Math.random() - 0.5) * 200;
    const ey = this.cy + (Math.random() - 0.5) * 200;
    this.bolts.push({
      points: this.generateBolt(sx, sy, ex, ey, 5),
      alpha: 1,
      decay: 1.5 + Math.random() * 0.6,
      hue: this.baseHue + (Math.random() - 0.5) * 20,
      width: 2 + Math.random() * 2,
    });
    if (this.bolts.length > 15) this.bolts.shift();
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, params: EffectParams = DEFAULT_PARAMS) {
    const t = time / 1000;
    const dt = 0.016;
    const intensityMul = params.intensity / 50;
    const scaleMul = params.scale;
    const turbMul = params.turbulence / 50;

    this.cx = width / 2;
    this.cy = height / 2;

    // Surge logic
    if (!this.surgeActive && t - this.lastSurge > (8 / intensityMul)) {
      this.surgeActive = true;
      this.surgeProgress = 0;
      this.lastSurge = t;
      for (let i = 0; i < 3; i++) this.spawnBolt(t);
    }
    if (this.surgeActive) {
      this.surgeProgress += dt * 2.8;
      if (this.surgeProgress > 1) this.surgeActive = false;
    }
    const surge = this.surgeActive ? fastSin(this.surgeProgress * Math.PI) : 0;

    // Spawn bolts
    const boltInterval = 0.8 / intensityMul;
    if (t - this.lastBoltTime > boltInterval) {
      this.spawnBolt(t);
      this.lastBoltTime = t;
    }

    // Center glow
    const glowRad = Math.max(width, height) * 0.45 * scaleMul;
    const breathe = (fastSin(t * 0.5) * 0.3 + 0.7) * 0.15 * intensityMul + surge * 0.3;
    const glow = ctx.createRadialGradient(this.cx, this.cy, 0, this.cx, this.cy, glowRad);
    glow.addColorStop(0, `hsla(${this.baseHue}, 100%, 50%, ${breathe * 0.4})`);
    glow.addColorStop(0.5, `hsla(${this.baseHue}, 100%, 40%, ${breathe * 0.1})`);
    glow.addColorStop(1, `hsla(${this.baseHue}, 100%, 20%, 0)`);
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    // Background arcs
    ctx.lineCap = "round";
    for (let i = 0; i < this.arcs.length; i++) {
      const arc = this.arcs[i];
      const angle = arc.startAngle + t * arc.speed;
      const pulse = fastSin(t * 1.4 + i) * 0.5 + 0.5;
      const alpha = arc.alpha * (0.5 + pulse * 0.5) * intensityMul + surge * 0.25;
      ctx.strokeStyle = `hsla(${this.baseHue + fastSin(t + i * 0.4) * 12}, 100%, 55%, ${alpha})`;
      ctx.lineWidth = (1.2 + pulse * 0.6) * scaleMul;
      ctx.beginPath();
      ctx.arc(this.cx, this.cy, arc.radius * scaleMul, angle, angle + arc.endAngle);
      ctx.stroke();
    }

    // Particles
    for (const p of this.particles) {
      if (!p.active) continue;
      const dx = this.cx - p.x, dy = this.cy - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const nx = dx / dist, ny = dy / dist;
      const attraction = (30 + (1 - Math.min(dist / 500, 1)) * 50) * (1 + surge * 3) * intensityMul;
      const orbital = 18 + fastSin(t + p.hue * 0.1) * 10 * turbMul;
      p.vx += (nx * attraction - ny * orbital) * dt;
      p.vy += (ny * attraction + nx * orbital) * dt;
      p.vx *= 0.97; p.vy *= 0.97;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.life -= dt;
      if (dist < 50 + surge * 30) { p.alpha *= 0.9; p.size *= 0.95; }
      if (p.life <= 0 || p.alpha < 0.02 || p.size < 0.3) {
        Object.assign(p, this.makeParticle());
        continue;
      }
      const lifeR = p.life / p.maxLife;
      const a = p.alpha * lifeR * intensityMul;
      const sz = p.size * (0.5 + lifeR * 0.5) * scaleMul;

      ctx.fillStyle = `hsla(${p.hue}, 100%, 60%, ${a * 0.3})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, sz * 2.5, 0, TWO_PI); ctx.fill();
      ctx.fillStyle = `hsla(${p.hue}, 80%, 80%, ${a})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, sz, 0, TWO_PI); ctx.fill();
      ctx.fillStyle = `hsla(${p.hue}, 50%, 95%, ${a * 0.9})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, sz * 0.4, 0, TWO_PI); ctx.fill();
    }

    // Lightning bolts
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (let b = this.bolts.length - 1; b >= 0; b--) {
      const bolt = this.bolts[b];
      bolt.alpha -= dt * bolt.decay;
      if (bolt.alpha <= 0) { this.bolts.splice(b, 1); continue; }
      const pts = bolt.points;
      if (pts.length < 2) continue;

      ctx.globalAlpha = bolt.alpha;
      // Bloom
      ctx.strokeStyle = `hsla(${bolt.hue}, 100%, 55%, 0.08)`;
      ctx.lineWidth = bolt.width * 10 * scaleMul;
      this.drawBoltPath(ctx, pts);
      // Outer glow
      ctx.strokeStyle = `hsla(${bolt.hue}, 100%, 60%, 0.15)`;
      ctx.lineWidth = bolt.width * 6 * scaleMul;
      this.drawBoltPath(ctx, pts);
      // Mid glow
      ctx.strokeStyle = `hsla(${bolt.hue}, 100%, 65%, 0.35)`;
      ctx.lineWidth = bolt.width * 3 * scaleMul;
      this.drawBoltPath(ctx, pts);
      // Core
      ctx.strokeStyle = `hsla(${bolt.hue}, 100%, 75%, 0.95)`;
      ctx.lineWidth = bolt.width * 1.2 * scaleMul;
      this.drawBoltPath(ctx, pts);
      // White center
      ctx.strokeStyle = `rgba(255, 255, 255, 0.95)`;
      ctx.lineWidth = bolt.width * 0.4 * scaleMul;
      this.drawBoltPath(ctx, pts);
    }
    ctx.globalAlpha = 1;

    // Rings
    const speedMult = intensityMul * (1 + turbMul * 0.2);
    for (const ring of this.rings) {
      ring.rotation += ring.speed * dt * speedMult;
      const arcLen = TWO_PI / ring.segments;
      for (let i = 0; i < ring.segments; i++) {
        const startA = ring.rotation + i * arcLen;
        const endA = startA + arcLen * (1 - ring.segmentGaps[i]);
        const pulse = fastSin(t * 2 + ring.pulsePhase + i * 0.5) * 0.5 + 0.5;
        const alpha = (0.2 + pulse * 0.45 + surge * 0.2) * intensityMul;
        const light = 50 + pulse * 22 + surge * 20;
        ctx.strokeStyle = `hsla(${this.baseHue + fastSin(t + i) * 8}, 100%, ${light}%, ${alpha})`;
        ctx.lineWidth = (ring.thickness + surge * 2) * scaleMul;
        ctx.beginPath();
        ctx.arc(this.cx, this.cy, ring.radius * scaleMul, startA, endA);
        ctx.stroke();
      }
    }

    // Orbiting lightning
    const logoR = Math.min(width, height) * 0.11 * 0.75 * scaleMul;
    const orbitR = logoR + 25 * scaleMul + surge * 10;
    for (let b = 0; b < 4; b++) {
      const baseAngle = (b / 4) * TWO_PI + t * 1.2;
      const boltLen = (60 + Math.sin(t * 3 + b) * 20 + surge * 30) * scaleMul;
      const startX = this.cx + Math.cos(baseAngle) * orbitR;
      const startY = this.cy + Math.sin(baseAngle) * orbitR;
      const endAngle = baseAngle + (boltLen / orbitR);
      const endX = this.cx + Math.cos(endAngle) * orbitR;
      const endY = this.cy + Math.sin(endAngle) * orbitR;

      // Orbit bolt path
      const oPoints: { x: number; y: number }[] = [];
      const segments = 15;
      let aDiff = endAngle - baseAngle;
      if (aDiff < 0) aDiff += TWO_PI;
      for (let i = 0; i <= segments; i++) {
        const frac = i / segments;
        const a = baseAngle + aDiff * frac;
        const jitter = (Math.random() - 0.5) * 12 * turbMul;
        oPoints.push({ x: this.cx + Math.cos(a) * (orbitR + jitter), y: this.cy + Math.sin(a) * (orbitR + jitter) });
      }

      const alpha = (0.7 + surge * 0.3 + Math.sin(t * 5 + b * 2) * 0.2) * intensityMul;
      const hue = this.baseHue + Math.sin(t + b) * 15;

      ctx.globalAlpha = alpha * 0.3;
      ctx.strokeStyle = `hsl(${hue}, 100%, 60%)`;
      ctx.lineWidth = 7 * scaleMul;
      this.drawBoltPath(ctx, oPoints);

      ctx.globalAlpha = alpha * 0.6;
      ctx.strokeStyle = `hsl(${hue}, 100%, 70%)`;
      ctx.lineWidth = 4 * scaleMul;
      this.drawBoltPath(ctx, oPoints);

      ctx.globalAlpha = alpha;
      ctx.strokeStyle = `hsl(${hue}, 90%, 85%)`;
      ctx.lineWidth = 2 * scaleMul;
      this.drawBoltPath(ctx, oPoints);

      ctx.globalAlpha = alpha;
      ctx.strokeStyle = "rgba(255,255,255,0.95)";
      ctx.lineWidth = 0.8 * scaleMul;
      this.drawBoltPath(ctx, oPoints);

      // Branches
      const numBr = 2 + Math.floor(surge * 3);
      for (let br = 0; br < numBr; br++) {
        const brIdx = Math.floor(oPoints.length * (0.2 + br * 0.25));
        if (brIdx >= oPoints.length) continue;
        const brStart = oPoints[brIdx];
        const brAngle = baseAngle + (brIdx / oPoints.length) * aDiff + (Math.random() - 0.5) * 0.8;
        const brLen = (20 + Math.random() * 35 + surge * 20) * scaleMul;
        const brPts = this.generateBolt(brStart.x, brStart.y, brStart.x + Math.cos(brAngle) * brLen, brStart.y + Math.sin(brAngle) * brLen, 3);

        ctx.globalAlpha = alpha * 0.4;
        ctx.strokeStyle = `hsl(${hue}, 100%, 60%)`;
        ctx.lineWidth = 4 * scaleMul;
        this.drawBoltPath(ctx, brPts);

        ctx.globalAlpha = alpha * 0.7;
        ctx.strokeStyle = `hsl(${hue}, 100%, 75%)`;
        ctx.lineWidth = 2 * scaleMul;
        this.drawBoltPath(ctx, brPts);

        ctx.globalAlpha = alpha * 0.9;
        ctx.strokeStyle = "rgba(255,255,255,0.9)";
        ctx.lineWidth = 0.6 * scaleMul;
        this.drawBoltPath(ctx, brPts);
      }
    }
    ctx.globalAlpha = 1;

    // Surge ripple
    if (this.surgeActive) {
      const ripR = this.surgeProgress * Math.min(width, height) * 0.55 * scaleMul;
      const ripA = (1 - this.surgeProgress) * 0.35 * intensityMul;
      ctx.strokeStyle = `hsla(${this.baseHue}, 100%, 70%, ${ripA})`;
      ctx.lineWidth = 2.5 * scaleMul;
      ctx.beginPath();
      ctx.arc(this.cx, this.cy, ripR, 0, TWO_PI);
      ctx.stroke();
    }

    // Center logo glow
    const size = Math.min(width, height) * 0.11 * scaleMul;
    const cGlow = ctx.createRadialGradient(this.cx, this.cy, 0, this.cx, this.cy, size * 2);
    const ci = 0.35 + surge * 0.5;
    cGlow.addColorStop(0, `hsla(${this.baseHue}, 100%, 60%, ${ci})`);
    cGlow.addColorStop(0.4, `hsla(${this.baseHue}, 100%, 50%, ${ci * 0.4})`);
    cGlow.addColorStop(1, `hsla(${this.baseHue}, 100%, 30%, 0)`);
    ctx.fillStyle = cGlow;
    ctx.beginPath();
    ctx.arc(this.cx, this.cy, size * 2, 0, TWO_PI);
    ctx.fill();

    // Hexagons
    ctx.strokeStyle = `hsla(${this.baseHue}, 100%, 60%, ${0.35 + surge * 0.35})`;
    ctx.lineWidth = (2.5 + surge * 1.5) * scaleMul;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i * TWO_PI) / 6 - Math.PI / 2;
      const x = this.cx + Math.cos(a) * size * 0.68;
      const y = this.cy + Math.sin(a) * size * 0.68;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();

    ctx.strokeStyle = `hsla(${this.baseHue + 30}, 100%, 70%, ${0.45 + surge * 0.4})`;
    ctx.lineWidth = 1.8 * scaleMul;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i * TWO_PI) / 6 - Math.PI / 2;
      const x = this.cx + Math.cos(a) * size * 0.52;
      const y = this.cy + Math.sin(a) * size * 0.52;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();

    // Lightning bolt icon
    const bolt = [
      { x: 0, y: -0.48 }, { x: 0.24, y: -0.08 }, { x: 0.07, y: -0.08 },
      { x: 0.18, y: 0.48 }, { x: -0.14, y: 0.04 }, { x: 0.01, y: 0.04 }, { x: -0.11, y: -0.48 },
    ];
    ctx.fillStyle = `rgba(255, 255, 255, ${0.88 + surge * 0.1})`;
    ctx.beginPath();
    ctx.moveTo(this.cx + bolt[0].x * size, this.cy + bolt[0].y * size);
    for (let i = 1; i < bolt.length; i++) ctx.lineTo(this.cx + bolt[i].x * size, this.cy + bolt[i].y * size);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = `hsla(${this.baseHue + 30}, 100%, 70%, 0.7)`;
    ctx.lineWidth = 1.5 * scaleMul;
    ctx.stroke();
  }
}
