import type { BackgroundLayer, EffectParams } from "./types";
import { DEFAULT_PARAMS } from "./types";

interface Fly { x: number; y: number; vx: number; vy: number; phase: number; pulseSpeed: number; size: number; hueShift: number; trail: {x:number;y:number;a:number}[]; }

export class Fireflies implements BackgroundLayer {
  private flies: Fly[] = [];
  private baseHue: number;
  private count = 60;

  constructor(w: number, h: number, color?: string) {
    this.baseHue = parseInt(color || "60") || 60;
    this.init(w, h);
  }

  private init(w: number, h: number) {
    this.flies = Array.from({ length: this.count }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5,
      phase: Math.random() * Math.PI * 2, pulseSpeed: Math.random() * 2 + 1,
      size: Math.random() * 3 + 2, hueShift: Math.random() * 30 - 15,
      trail: [],
    }));
  }

  resize(w: number, h: number) { this.init(w, h); }

  render(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, params: EffectParams = DEFAULT_PARAMS) {
    const t = time * 0.001;
    const intensityMul = params.intensity / 50;
    const scaleMul = params.scale;
    const turbMul = params.turbulence / 50;
    const active = Math.floor(this.count * intensityMul);

    for (let i = 0; i < Math.min(active, this.flies.length); i++) {
      const f = this.flies[i];

      // Organic wander
      f.vx += (Math.sin(t * 0.5 + f.phase + i) * 0.02 - f.vx * 0.01) * turbMul;
      f.vy += (Math.cos(t * 0.4 + f.phase + i * 1.3) * 0.02 - f.vy * 0.01) * turbMul;
      f.x += f.vx;
      f.y += f.vy;

      // Wrap
      if (f.x < -20) f.x = width + 20;
      if (f.x > width + 20) f.x = -20;
      if (f.y < -20) f.y = height + 20;
      if (f.y > height + 20) f.y = -20;

      // Pulse
      const pulse = Math.pow(Math.sin(t * f.pulseSpeed + f.phase) * 0.5 + 0.5, 3);
      const alpha = pulse * 0.9;
      const size = f.size * scaleMul * (0.5 + pulse * 0.5);
      const hue = this.baseHue + f.hueShift;

      // Trail
      f.trail.push({ x: f.x, y: f.y, a: alpha * 0.3 });
      if (f.trail.length > 15) f.trail.shift();
      for (const tp of f.trail) {
        tp.a *= 0.92;
        if (tp.a > 0.01) {
          ctx.fillStyle = `hsla(${hue}, 90%, 70%, ${tp.a})`;
          ctx.beginPath();
          ctx.arc(tp.x, tp.y, size * 0.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Main glow
      const glowGrad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, size * 6);
      glowGrad.addColorStop(0, `hsla(${hue}, 100%, 80%, ${alpha * 0.4})`);
      glowGrad.addColorStop(0.3, `hsla(${hue}, 90%, 60%, ${alpha * 0.15})`);
      glowGrad.addColorStop(1, `hsla(${hue}, 80%, 50%, 0)`);
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(f.x, f.y, size * 6, 0, Math.PI * 2);
      ctx.fill();

      // Core
      ctx.fillStyle = `hsla(${hue + 10}, 100%, 95%, ${alpha})`;
      ctx.beginPath();
      ctx.arc(f.x, f.y, size * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
