import type { BackgroundLayer, EffectParams } from "./types";
import { DEFAULT_PARAMS } from "./types";

interface Crystal {
  x: number;
  y: number;
  size: number;
  rotation: number;
  rotSpeed: number;
  sides: number;
  hueShift: number;
  alpha: number;
}

interface Beam {
  x: number;
  y: number;
  angle: number;
  length: number;
  speed: number;
  hueShift: number;
}

export class CrystalMatrix implements BackgroundLayer {
  private baseHue: number;
  private crystals: Crystal[] = [];
  private beams: Beam[] = [];
  private w = 0;
  private h = 0;

  constructor(w: number, h: number, color?: string) {
    this.baseHue = color ? parseInt(color) || 200 : 200;
    this.init(w, h);
  }

  private init(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.crystals = [];
    this.beams = [];
    const count = 15;
    for (let i = 0; i < count; i++) {
      this.crystals.push({
        x: Math.random() * w,
        y: Math.random() * h,
        size: 20 + Math.random() * 60,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (-0.5 + Math.random()) * 0.02,
        sides: 4 + Math.floor(Math.random() * 4),
        hueShift: -40 + Math.random() * 80,
        alpha: 0.2 + Math.random() * 0.4,
      });
    }
    for (let i = 0; i < 8; i++) {
      this.beams.push({
        x: Math.random() * w,
        y: Math.random() * h,
        angle: Math.random() * Math.PI * 2,
        length: 100 + Math.random() * 300,
        speed: 0.2 + Math.random() * 0.8,
        hueShift: -20 + Math.random() * 40,
      });
    }
  }

  resize(w: number, h: number) { this.init(w, h); }

  render(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, params: EffectParams = DEFAULT_PARAMS) {
    const t = time * 0.001;
    const intensityMul = params.intensity / 50;
    const scaleMul = params.scale;
    const turbMul = params.turbulence / 50;

    // Draw beams (refraction light)
    const activeBeams = Math.floor(this.beams.length * Math.min(intensityMul, 2));
    for (let i = 0; i < activeBeams; i++) {
      const beam = this.beams[i];
      const bx = beam.x + Math.sin(t * beam.speed) * 50 * turbMul;
      const by = beam.y + Math.cos(t * beam.speed * 0.7) * 30 * turbMul;
      const angle = beam.angle + t * 0.1;
      const len = beam.length * scaleMul;
      const hue = (this.baseHue + beam.hueShift) % 360;

      const ex = bx + Math.cos(angle) * len;
      const ey = by + Math.sin(angle) * len;

      const grad = ctx.createLinearGradient(bx, by, ex, ey);
      grad.addColorStop(0, `hsla(${hue}, 80%, 70%, 0)`);
      grad.addColorStop(0.3, `hsla(${hue}, 90%, 80%, ${0.12 * intensityMul})`);
      grad.addColorStop(0.7, `hsla(${(hue + 40) % 360}, 90%, 80%, ${0.12 * intensityMul})`);
      grad.addColorStop(1, `hsla(${(hue + 40) % 360}, 80%, 70%, 0)`);

      ctx.save();
      ctx.strokeStyle = grad;
      ctx.lineWidth = 3 * scaleMul;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.restore();
    }

    // Draw crystals
    const activeCrystals = Math.floor(this.crystals.length * Math.min(intensityMul, 2));
    for (let i = 0; i < activeCrystals; i++) {
      const c = this.crystals[i];
      c.rotation += c.rotSpeed;
      const cx = c.x + Math.sin(t * 0.3 + i) * 10 * turbMul;
      const cy = c.y + Math.cos(t * 0.2 + i) * 10 * turbMul;
      const size = c.size * scaleMul;
      const hue = (this.baseHue + c.hueShift) % 360;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(c.rotation);
      ctx.globalAlpha = c.alpha * intensityMul;

      // Crystal shape
      ctx.beginPath();
      for (let s = 0; s <= c.sides; s++) {
        const a = (s / c.sides) * Math.PI * 2;
        const r = size * (0.8 + Math.sin(a * 2 + t) * 0.2);
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        s === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();

      // Fill with gradient
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
      grad.addColorStop(0, `hsla(${hue}, 60%, 80%, 0.4)`);
      grad.addColorStop(0.5, `hsla(${hue}, 70%, 60%, 0.15)`);
      grad.addColorStop(1, `hsla(${hue}, 50%, 40%, 0)`);
      ctx.fillStyle = grad;
      ctx.fill();

      // Edge glow
      ctx.strokeStyle = `hsla(${hue}, 80%, 75%, ${0.4 * intensityMul})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.restore();
    }
  }
}
