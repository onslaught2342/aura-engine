import type { BackgroundLayer, EffectParams } from "./types";
import { DEFAULT_PARAMS } from "./types";

interface QParticle { x: number; y: number; vx: number; vy: number; prob: number; phase: number; radius: number }

export class QuantumField implements BackgroundLayer {
  private baseHue: number;
  private particles: QParticle[] = [];
  private collapseFlashes: { x: number; y: number; t: number; r: number }[] = [];

  constructor(w: number, h: number, color?: string) {
    this.baseHue = color ? parseFloat(color) || 260 : 260;
    this.initParticles(w, h, 200);
  }

  private initParticles(w: number, h: number, count: number) {
    this.particles = [];
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 1.4, vy: (Math.random() - 0.5) * 1.4,
        prob: Math.random(), phase: Math.random() * Math.PI * 2,
        radius: 2 + Math.random() * 4,
      });
    }
  }

  resize(w: number, h: number) {
    for (const p of this.particles) {
      p.x = Math.random() * w;
      p.y = Math.random() * h;
    }
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, params: EffectParams = DEFAULT_PARAMS) {
    const t = time * 0.001;
    const scale = params.scale;
    const speed = (params.intensity / 50);
    const turb = params.turbulence / 50;
    const count = Math.min(this.particles.length, Math.floor(50 + params.intensity * 3));

    // Spawn collapse flashes more frequently
    if (Math.random() < 0.05 * turb) {
      const p = this.particles[Math.floor(Math.random() * count)];
      this.collapseFlashes.push({ x: p.x, y: p.y, t: time, r: 40 + Math.random() * 60 });
    }

    // Update + draw particles
    for (let i = 0; i < count; i++) {
      const p = this.particles[i];
      // Visible motion: apply velocity + orbital wobble
      p.x += (p.vx + Math.sin(t * 1.2 + p.phase) * 0.8) * speed;
      p.y += (p.vy + Math.cos(t + p.phase * 1.3) * 0.8) * speed;
      p.x = ((p.x % width) + width) % width;
      p.y = ((p.y % height) + height) % height;
      p.prob = 0.3 + 0.7 * Math.abs(Math.sin(t * 0.8 + p.phase));

      const ringPulse = 1 + Math.sin(t * 2 + p.phase) * 0.25;
      const r = p.radius * scale * (1 + p.prob);
      const alpha = p.prob * 0.6;
      const hue = (this.baseHue + p.phase * 30) % 360;

      // Pulsing uncertainty ring
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 3 * ringPulse, 0, Math.PI * 2);
      ctx.strokeStyle = `hsla(${hue}, 80%, 70%, ${alpha * 0.25})`;
      ctx.lineWidth = 0.6;
      ctx.stroke();

      // Core
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      grad.addColorStop(0, `hsla(${hue}, 90%, 80%, ${alpha})`);
      grad.addColorStop(1, `hsla(${hue}, 90%, 50%, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();

      // Wave-function sweep — full rotation
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      const arcStart = t * 2 + p.phase;
      ctx.arc(p.x, p.y, r * 2.2, arcStart, arcStart + Math.PI * 1.2);
      ctx.strokeStyle = `hsla(${hue}, 60%, 60%, ${alpha * 0.4})`;
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Entanglement lines between nearby particles
    const linkDist = 90 * scale;
    ctx.lineWidth = 0.5;
    for (let i = 0; i < count; i++) {
      const a = this.particles[i];
      for (let j = i + 1; j < count; j++) {
        const b = this.particles[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < linkDist * linkDist) {
          const alpha = (1 - Math.sqrt(d2) / linkDist) * 0.15 * a.prob * b.prob;
          ctx.strokeStyle = `hsla(${this.baseHue}, 80%, 70%, ${alpha})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // Collapse flashes
    this.collapseFlashes = this.collapseFlashes.filter(f => time - f.t < 600);
    for (const f of this.collapseFlashes) {
      const age = (time - f.t) / 600;
      const r = f.r * age * scale;
      const alpha = (1 - age) * 0.8;
      const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, r);
      grad.addColorStop(0, `hsla(${this.baseHue}, 100%, 95%, ${alpha})`);
      grad.addColorStop(0.5, `hsla(${(this.baseHue + 60) % 360}, 80%, 60%, ${alpha * 0.3})`);
      grad.addColorStop(1, `hsla(${this.baseHue}, 80%, 40%, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(f.x, f.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
