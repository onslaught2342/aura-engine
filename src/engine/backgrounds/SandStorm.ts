import type { BackgroundLayer, EffectParams } from "./types";
import { DEFAULT_PARAMS } from "./types";

interface Grain { x: number; y: number; speed: number; size: number; layer: number; alpha: number; }

export class SandStorm implements BackgroundLayer {
  private grains: Grain[] = [];
  private w: number; private h: number;
  private baseHue: number;

  constructor(w: number, h: number, color = "35") {
    this.w = w; this.h = h;
    this.baseHue = parseInt(color) || 35;
    this.init(800);
  }

  private init(count: number) {
    this.grains = [];
    for (let i = 0; i < count; i++) {
      this.grains.push(this.spawn());
    }
  }

  private spawn(): Grain {
    const layer = Math.random();
    return {
      x: Math.random() * this.w,
      y: Math.random() * this.h,
      speed: 1 + layer * 4,
      size: 0.5 + layer * 2.5,
      layer,
      alpha: 0.2 + layer * 0.5,
    };
  }

  resize(w: number, h: number) { this.w = w; this.h = h; }

  render(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, params: EffectParams = DEFAULT_PARAMS) {
    const intensityMul = params.intensity / 50;
    const scaleMul = params.scale;
    const wind = (params.direction - 180) / 180;
    const gustStrength = params.turbulence / 50;
    const gust = Math.sin(time * 0.001) * gustStrength * 3;
    const targetCount = Math.floor(800 * intensityMul);
    while (this.grains.length < targetCount) this.grains.push(this.spawn());
    if (this.grains.length > targetCount) this.grains.length = targetCount;

    // Ground haze
    const hazeGrad = ctx.createLinearGradient(0, height * 0.6, 0, height);
    hazeGrad.addColorStop(0, `hsla(${this.baseHue}, 40%, 50%, 0)`);
    hazeGrad.addColorStop(1, `hsla(${this.baseHue}, 40%, 50%, ${0.15 * intensityMul})`);
    ctx.fillStyle = hazeGrad;
    ctx.fillRect(0, 0, width, height);

    // Particles
    for (const g of this.grains) {
      g.x += (g.speed * (1 + wind) + gust * g.layer) * intensityMul;
      g.y += Math.sin(time * 0.002 + g.x * 0.01) * g.layer * gustStrength;
      if (g.x > width + 10) { g.x = -10; g.y = Math.random() * height; }
      if (g.x < -10) { g.x = width + 10; g.y = Math.random() * height; }

      ctx.globalAlpha = g.alpha * intensityMul;
      ctx.fillStyle = `hsl(${this.baseHue + g.layer * 15}, ${30 + g.layer * 20}%, ${60 + g.layer * 20}%)`;
      ctx.fillRect(g.x, g.y, g.size * scaleMul * (1 + g.layer), g.size * scaleMul * 0.4);
    }
    ctx.globalAlpha = 1;

    // Dust streaks
    ctx.strokeStyle = `hsla(${this.baseHue}, 30%, 70%, ${0.05 * intensityMul})`;
    ctx.lineWidth = 1;
    for (let i = 0; i < 5 * intensityMul; i++) {
      const sy = (height * 0.3) + Math.sin(time * 0.0005 + i) * height * 0.3;
      ctx.beginPath();
      ctx.moveTo(0, sy);
      ctx.bezierCurveTo(width * 0.3, sy + gust * 20, width * 0.7, sy - gust * 15, width, sy + gust * 10);
      ctx.stroke();
    }
  }
}
