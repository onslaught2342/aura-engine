import type { BackgroundLayer, EffectParams } from "./types";
import { DEFAULT_PARAMS } from "./types";

interface Ripple {
  x: number;
  y: number;
  birth: number;
  maxRadius: number;
  speed: number;
}

export class RaindropRipples implements BackgroundLayer {
  private baseHue: number;
  private ripples: Ripple[] = [];
  private w = 0;
  private h = 0;
  private lastSpawn = 0;

  constructor(w: number, h: number, color?: string) {
    this.baseHue = color ? parseInt(color) || 200 : 200;
    this.w = w;
    this.h = h;
  }

  resize(w: number, h: number) { this.w = w; this.h = h; }

  render(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, params: EffectParams = DEFAULT_PARAMS) {
    const t = time * 0.001;
    const intensityMul = params.intensity / 50;
    const scaleMul = params.scale;

    // Spawn new ripples
    const spawnRate = 80 / intensityMul;
    if (t - this.lastSpawn > spawnRate * 0.001 || this.ripples.length === 0) {
      const count = Math.ceil(intensityMul * 0.5);
      for (let i = 0; i < count; i++) {
        this.ripples.push({
          x: Math.random() * width,
          y: Math.random() * height,
          birth: t,
          maxRadius: (50 + Math.random() * 100) * scaleMul,
          speed: 0.8 + Math.random() * 0.4,
        });
      }
      this.lastSpawn = t;
    }

    // Remove old ripples
    this.ripples = this.ripples.filter(r => (t - r.birth) * r.speed * 60 < r.maxRadius);

    // Draw surface tint
    ctx.fillStyle = `hsla(${this.baseHue}, 30%, 10%, 0.03)`;
    ctx.fillRect(0, 0, width, height);

    // Draw ripples
    for (const r of this.ripples) {
      const age = (t - r.birth) * r.speed * 60;
      const progress = age / r.maxRadius;
      if (progress > 1) continue;

      const alpha = (1 - progress) * 0.4 * intensityMul;
      const rings = 3;
      for (let ring = 0; ring < rings; ring++) {
        const radius = age - ring * 8 * scaleMul;
        if (radius < 0) continue;
        const ringAlpha = alpha * (1 - ring / rings);
        ctx.beginPath();
        ctx.arc(r.x, r.y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(${this.baseHue}, 60%, 70%, ${ringAlpha})`;
        ctx.lineWidth = (2 - ring * 0.5) * scaleMul;
        ctx.stroke();
      }

      // Center dot
      if (progress < 0.2) {
        const dotAlpha = (1 - progress / 0.2) * 0.6;
        ctx.beginPath();
        ctx.arc(r.x, r.y, 2 * scaleMul, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${this.baseHue}, 80%, 80%, ${dotAlpha})`;
        ctx.fill();
      }
    }
  }
}
