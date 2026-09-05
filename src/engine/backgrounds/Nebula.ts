import type { BackgroundLayer, EffectParams } from "./types";
import { DEFAULT_PARAMS } from "./types";

interface Cloud { x: number; y: number; rx: number; ry: number; hueShift: number; alpha: number; speed: number; phase: number; }
interface Star { x: number; y: number; size: number; brightness: number; twinkle: number; }

export class Nebula implements BackgroundLayer {
  private clouds: Cloud[] = [];
  private stars: Star[] = [];
  private baseHue: number;

  constructor(w: number, h: number, color?: string) {
    this.baseHue = parseInt(color || "260") || 260;
    this.init(w, h);
  }

  private init(w: number, h: number) {
    this.clouds = Array.from({ length: 12 }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      rx: Math.random() * 300 + 150, ry: Math.random() * 200 + 100,
      hueShift: Math.random() * 60 - 30, alpha: Math.random() * 0.15 + 0.05,
      speed: Math.random() * 0.3 + 0.1, phase: Math.random() * Math.PI * 2,
    }));
    this.stars = Array.from({ length: 150 }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      size: Math.random() * 1.5 + 0.3, brightness: Math.random(),
      twinkle: Math.random() * Math.PI * 2,
    }));
  }

  resize(w: number, h: number) { this.init(w, h); }

  render(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, params: EffectParams = DEFAULT_PARAMS) {
    const t = time * 0.001;
    const intensityMul = params.intensity / 50;
    const scaleMul = params.scale;
    const turbMul = params.turbulence / 50;

    // Deep space background gradient
    const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width * 0.7);
    bgGrad.addColorStop(0, `hsla(${this.baseHue + 20}, 30%, 8%, 0.3)`);
    bgGrad.addColorStop(1, `hsla(${this.baseHue}, 20%, 3%, 0.1)`);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Gas clouds — layered radial gradients
    const active = Math.floor(this.clouds.length * intensityMul);
    for (let i = 0; i < Math.min(active, this.clouds.length); i++) {
      const c = this.clouds[i];
      const cx = c.x + Math.sin(t * c.speed + c.phase) * 40 * turbMul;
      const cy = c.y + Math.cos(t * c.speed * 0.7 + c.phase) * 30 * turbMul;
      const rx = c.rx * scaleMul;
      const ry = c.ry * scaleMul;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(1, ry / rx);
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
      const hue = this.baseHue + c.hueShift;
      grad.addColorStop(0, `hsla(${hue}, 80%, 60%, ${c.alpha * 1.5})`);
      grad.addColorStop(0.3, `hsla(${hue + 15}, 70%, 45%, ${c.alpha})`);
      grad.addColorStop(0.6, `hsla(${hue - 10}, 60%, 30%, ${c.alpha * 0.5})`);
      grad.addColorStop(1, `hsla(${hue}, 50%, 20%, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, rx, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Embedded stars
    for (const star of this.stars) {
      const twinkle = 0.4 + 0.6 * Math.sin(t * 2 + star.twinkle);
      ctx.fillStyle = `hsla(${this.baseHue + 40}, 30%, 90%, ${star.brightness * twinkle * 0.8})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size * scaleMul, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
