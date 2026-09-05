import type { BackgroundLayer, EffectParams } from "./types";
import { DEFAULT_PARAMS } from "./types";

interface Band {
  x: number;
  width: number;
  phase: number;
  speed: number;
  hueShift: number;
  amplitude: number;
}

export class NorthernLights implements BackgroundLayer {
  private baseHue: number;
  private bands: Band[] = [];
  private w = 0;
  private h = 0;

  constructor(w: number, h: number, color?: string) {
    this.baseHue = color ? parseInt(color) || 120 : 120;
    this.init(w, h);
  }

  private init(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.bands = [];
    const count = 12;
    for (let i = 0; i < count; i++) {
      this.bands.push({
        x: (w / count) * i + Math.random() * (w / count),
        width: 30 + Math.random() * 80,
        phase: Math.random() * Math.PI * 2,
        speed: 0.3 + Math.random() * 0.7,
        hueShift: -30 + Math.random() * 60,
        amplitude: 20 + Math.random() * 60,
      });
    }
  }

  resize(w: number, h: number) { this.init(w, h); }

  render(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, params: EffectParams = DEFAULT_PARAMS) {
    const t = time * 0.0005;
    const intensityMul = params.intensity / 50;
    const scaleMul = params.scale;
    const turbMul = params.turbulence / 50;
    const activeBands = Math.floor(this.bands.length * Math.min(intensityMul, 2));

    for (let i = 0; i < activeBands; i++) {
      const band = this.bands[i];
      const bx = band.x + Math.sin(t * band.speed + band.phase) * band.amplitude * turbMul;
      const bw = band.width * scaleMul;

      const grad = ctx.createLinearGradient(bx - bw, 0, bx + bw, 0);
      const hue = (this.baseHue + band.hueShift) % 360;
      const alpha = 0.15 * intensityMul;
      grad.addColorStop(0, `hsla(${hue}, 80%, 50%, 0)`);
      grad.addColorStop(0.3, `hsla(${hue}, 90%, 60%, ${alpha})`);
      grad.addColorStop(0.5, `hsla(${hue}, 95%, 70%, ${alpha * 1.5})`);
      grad.addColorStop(0.7, `hsla(${hue}, 90%, 60%, ${alpha})`);
      grad.addColorStop(1, `hsla(${hue}, 80%, 50%, 0)`);

      ctx.fillStyle = grad;

      ctx.beginPath();
      ctx.moveTo(bx - bw, 0);
      const steps = 20;
      for (let s = 0; s <= steps; s++) {
        const sy = (s / steps) * height;
        const offset = Math.sin(sy * 0.005 + t * band.speed * 2 + band.phase) * band.amplitude * turbMul * 0.5;
        ctx.lineTo(bx - bw + offset, sy);
      }
      for (let s = steps; s >= 0; s--) {
        const sy = (s / steps) * height;
        const offset = Math.sin(sy * 0.005 + t * band.speed * 2 + band.phase + 1) * band.amplitude * turbMul * 0.5;
        ctx.lineTo(bx + bw + offset, sy);
      }
      ctx.closePath();
      ctx.fill();
    }

    // Shimmer highlights
    for (let i = 0; i < activeBands; i++) {
      const band = this.bands[i];
      const bx = band.x + Math.sin(t * band.speed + band.phase) * band.amplitude * turbMul;
      const shimmerY = (Math.sin(t * 1.5 + band.phase) * 0.3 + 0.3) * height;
      const hue = (this.baseHue + band.hueShift + 30) % 360;
      const grad = ctx.createRadialGradient(bx, shimmerY, 0, bx, shimmerY, 60 * scaleMul);
      grad.addColorStop(0, `hsla(${hue}, 100%, 85%, ${0.2 * intensityMul})`);
      grad.addColorStop(1, `hsla(${hue}, 100%, 85%, 0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(bx - 60 * scaleMul, shimmerY - 60 * scaleMul, 120 * scaleMul, 120 * scaleMul);
    }
  }
}
