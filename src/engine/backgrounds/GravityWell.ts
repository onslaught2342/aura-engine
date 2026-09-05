import type { BackgroundLayer, EffectParams } from "./types";
import { DEFAULT_PARAMS } from "./types";

interface Particle { x: number; y: number; vx: number; vy: number; size: number; hue: number; trail: {x:number;y:number}[]; }
interface Well { x: number; y: number; mass: number; phase: number; }

export class GravityWell implements BackgroundLayer {
  private particles: Particle[] = [];
  private wells: Well[] = [];
  private w: number; private h: number;
  private baseHue: number;

  constructor(w: number, h: number, color = "280") {
    this.w = w; this.h = h;
    this.baseHue = parseInt(color) || 280;
    this.initWells();
    this.initParticles(300);
  }

  private initWells() {
    this.wells = [];
    for (let i = 0; i < 3; i++) {
      this.wells.push({ x: this.w * (0.25 + Math.random() * 0.5), y: this.h * (0.25 + Math.random() * 0.5), mass: 500 + Math.random() * 1000, phase: Math.random() * Math.PI * 2 });
    }
  }

  private initParticles(count: number) {
    this.particles = [];
    for (let i = 0; i < count; i++) {
      this.particles.push({ x: Math.random() * this.w, y: Math.random() * this.h, vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2, size: 1 + Math.random() * 2, hue: Math.random() * 60, trail: [] });
    }
  }

  resize(w: number, h: number) { this.w = w; this.h = h; this.initWells(); }

  render(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, params: EffectParams = DEFAULT_PARAMS) {
    const iMul = params.intensity / 50;
    const sMul = params.scale;
    const tMul = params.turbulence / 50;
    const targetCount = Math.floor(300 * iMul);
    while (this.particles.length < targetCount) this.particles.push({ x: Math.random() * width, y: Math.random() * height, vx: (Math.random()-0.5)*2, vy: (Math.random()-0.5)*2, size: 1+Math.random()*2, hue: Math.random()*60, trail: [] });
    if (this.particles.length > targetCount) this.particles.length = targetCount;

    // Move wells
    for (const w of this.wells) {
      w.x = width * 0.5 + Math.sin(time * 0.0003 + w.phase) * width * 0.25 * tMul;
      w.y = height * 0.5 + Math.cos(time * 0.0004 + w.phase * 1.5) * height * 0.25 * tMul;
    }

    // Draw wells glow
    for (const w of this.wells) {
      const grad = ctx.createRadialGradient(w.x, w.y, 0, w.x, w.y, 80 * sMul);
      grad.addColorStop(0, `hsla(${this.baseHue}, 80%, 60%, ${0.3 * iMul})`);
      grad.addColorStop(1, `hsla(${this.baseHue}, 80%, 60%, 0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(w.x - 80 * sMul, w.y - 80 * sMul, 160 * sMul, 160 * sMul);
    }

    // Update & draw particles
    for (const p of this.particles) {
      for (const w of this.wells) {
        const dx = w.x - p.x, dy = w.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy) + 20;
        const force = (w.mass * 0.00005 * iMul) / (dist * dist) * dist;
        p.vx += (dx / dist) * force;
        p.vy += (dy / dist) * force;
      }
      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (speed > 4) { p.vx *= 4 / speed; p.vy *= 4 / speed; }
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > width || p.y < 0 || p.y > height) { p.x = Math.random() * width; p.y = Math.random() * height; p.vx = p.vy = 0; p.trail = []; }

      p.trail.push({ x: p.x, y: p.y });
      if (p.trail.length > 8) p.trail.shift();

      // Trail
      if (p.trail.length > 1) {
        ctx.beginPath();
        ctx.moveTo(p.trail[0].x, p.trail[0].y);
        for (let i = 1; i < p.trail.length; i++) ctx.lineTo(p.trail[i].x, p.trail[i].y);
        ctx.strokeStyle = `hsla(${this.baseHue + p.hue}, 70%, 60%, ${0.3 * iMul})`;
        ctx.lineWidth = p.size * sMul * 0.5;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * sMul, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${this.baseHue + p.hue}, 80%, 70%, ${0.7 * iMul})`;
      ctx.fill();
    }
  }
}
