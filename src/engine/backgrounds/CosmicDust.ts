import type { BackgroundLayer, EffectParams } from "./types";
import { DEFAULT_PARAMS } from "./types";

interface Particle {
  x: number; y: number; angle: number; radius: number;
  speed: number; size: number; hueOffset: number; alpha: number;
}

export class CosmicDust implements BackgroundLayer {
  private particles: Particle[] = [];
  private baseHue: number;
  private cx: number; private cy: number;

  constructor(w: number, h: number, color?: string) {
    this.baseHue = parseInt(color || "260", 10);
    this.cx = w / 2; this.cy = h / 2; this.init();
  }

  private init() {
    this.particles = Array.from({ length: 300 }, () => ({
      x: 0, y: 0,
      angle: Math.random() * Math.PI * 2,
      radius: 20 + Math.random() * Math.max(this.cx, this.cy) * 0.9,
      speed: 0.0002 + Math.random() * 0.001,
      size: 1 + Math.random() * 3,
      hueOffset: (Math.random() - 0.5) * 60,
      alpha: 0.2 + Math.random() * 0.6,
    }));
  }

  resize(w: number, h: number) { this.cx = w / 2; this.cy = h / 2; }

  render(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, params: EffectParams = DEFAULT_PARAMS) {
    const intensityMul = params.intensity / 50;
    const scaleMul = params.scale;
    const turbMul = params.turbulence / 50;

    for (let i = 0; i < 3; i++) {
      const t = time * 0.0003 * turbMul + i * 2;
      const nx = this.cx + Math.sin(t) * width * 0.2;
      const ny = this.cy + Math.cos(t * 0.7) * height * 0.15;
      const r = Math.min(width, height) * 0.35 * scaleMul;
      const grad = ctx.createRadialGradient(nx, ny, 0, nx, ny, r);
      const hue = (this.baseHue + i * 30) % 360;
      grad.addColorStop(0, `hsla(${hue}, 60%, 40%, ${0.08 * intensityMul})`);
      grad.addColorStop(0.5, `hsla(${hue}, 50%, 30%, ${0.04 * intensityMul})`);
      grad.addColorStop(1, `hsla(${hue}, 40%, 20%, 0)`);
      ctx.fillStyle = grad; ctx.fillRect(0, 0, width, height);
    }

    const active = Math.floor(300 * intensityMul);
    for (let i = 0; i < Math.min(active, this.particles.length); i++) {
      const p = this.particles[i];
      p.angle += p.speed * turbMul;
      p.x = this.cx + Math.cos(p.angle) * p.radius;
      p.y = this.cy + Math.sin(p.angle) * p.radius * 0.6;

      const hue = (this.baseHue + p.hueOffset + 360) % 360;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * scaleMul, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hue}, 70%, 70%, ${p.alpha})`; ctx.fill();

      if (p.size > 2) {
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4 * scaleMul);
        grad.addColorStop(0, `hsla(${hue}, 80%, 75%, ${p.alpha * 0.3})`);
        grad.addColorStop(1, `hsla(${hue}, 80%, 75%, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 4 * scaleMul, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
}
