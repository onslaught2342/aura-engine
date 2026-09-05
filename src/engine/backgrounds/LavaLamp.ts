import type { BackgroundLayer, EffectParams } from "./types";
import { DEFAULT_PARAMS } from "./types";

interface Blob {
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  phase: number;
  hueShift: number;
}

export class LavaLamp implements BackgroundLayer {
  private baseHue: number;
  private blobs: Blob[] = [];
  private w = 0;
  private h = 0;

  constructor(w: number, h: number, color?: string) {
    this.baseHue = color ? parseInt(color) || 15 : 15;
    this.init(w, h);
  }

  private init(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.blobs = [];
    const count = 8;
    for (let i = 0; i < count; i++) {
      this.blobs.push({
        x: Math.random() * w,
        y: Math.random() * h,
        radius: 40 + Math.random() * 80,
        vx: -0.3 + Math.random() * 0.6,
        vy: -0.5 + Math.random() * 1.0,
        phase: Math.random() * Math.PI * 2,
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
    const activeCount = Math.min(this.blobs.length, Math.floor(this.blobs.length * intensityMul));

    for (let i = 0; i < activeCount; i++) {
      const b = this.blobs[i];
      // Organic movement
      b.x += b.vx + Math.sin(t * 0.5 + b.phase) * turbMul * 0.5;
      b.y += b.vy * -1 + Math.cos(t * 0.3 + b.phase) * turbMul * 0.3;

      // Buoyancy — blobs float up, reset at top
      if (b.y < -b.radius * 2) { b.y = height + b.radius; b.x = Math.random() * width; }
      if (b.y > height + b.radius * 2) { b.y = -b.radius; }
      if (b.x < -b.radius) b.x = width + b.radius;
      if (b.x > width + b.radius) b.x = -b.radius;

      const r = b.radius * scaleMul * (1 + Math.sin(t + b.phase) * 0.2);
      const hue = (this.baseHue + b.hueShift) % 360;

      // Glow
      const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, r * 1.5);
      grad.addColorStop(0, `hsla(${hue}, 90%, 55%, ${0.6 * intensityMul})`);
      grad.addColorStop(0.4, `hsla(${hue}, 85%, 45%, ${0.3 * intensityMul})`);
      grad.addColorStop(0.7, `hsla(${(hue + 20) % 360}, 80%, 35%, ${0.1 * intensityMul})`);
      grad.addColorStop(1, `hsla(${hue}, 70%, 30%, 0)`);

      ctx.beginPath();
      ctx.arc(b.x, b.y, r * 1.5, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      // Inner bright core
      const coreGrad = ctx.createRadialGradient(b.x, b.y - r * 0.2, 0, b.x, b.y, r * 0.6);
      coreGrad.addColorStop(0, `hsla(${(hue + 30) % 360}, 100%, 80%, ${0.5 * intensityMul})`);
      coreGrad.addColorStop(1, `hsla(${hue}, 90%, 50%, 0)`);
      ctx.beginPath();
      ctx.arc(b.x, b.y, r * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = coreGrad;
      ctx.fill();
    }
  }
}
