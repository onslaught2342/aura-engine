import type { BackgroundLayer, EffectParams } from "./types";
import { DEFAULT_PARAMS } from "./types";

interface Star { x: number; y: number; size: number; speed: number; brightness: number; twinkleOffset: number; }

export class Starfield implements BackgroundLayer {
  private stars: Star[] = [];
  private count = 200;
  private baseHue: number;

  constructor(width: number, height: number, color?: string) {
    this.baseHue = parseInt(color || "210") || 210;
    this.init(width, height);
  }

  private init(w: number, h: number) {
    this.stars = Array.from({ length: this.count }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      size: Math.random() * 2 + 0.5, speed: Math.random() * 0.3 + 0.05,
      brightness: Math.random(), twinkleOffset: Math.random() * Math.PI * 2,
    }));
  }

  resize(w: number, h: number) { this.init(w, h); }

  render(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, params: EffectParams = DEFAULT_PARAMS) {
    const intensityMul = params.intensity / 50;
    const scaleMul = params.scale;
    const turbMul = params.turbulence / 50;
    const dirRad = (params.direction * Math.PI) / 180;
    const active = Math.floor(this.count * intensityMul);

    for (let i = 0; i < Math.min(active, this.stars.length); i++) {
      const star = this.stars[i];
      const twinkle = 0.5 + 0.5 * Math.sin(time * 0.002 * star.speed * 3 * turbMul + star.twinkleOffset);
      const alpha = star.brightness * twinkle;
      ctx.fillStyle = `hsla(${this.baseHue}, 60%, 90%, ${alpha})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size * scaleMul, 0, Math.PI * 2);
      ctx.fill();

      star.y += star.speed * 0.1 * Math.cos(dirRad);
      star.x += star.speed * 0.1 * Math.sin(dirRad);
      if (star.y > height) { star.y = 0; star.x = Math.random() * width; }
      if (star.y < 0) { star.y = height; star.x = Math.random() * width; }
      if (star.x > width) star.x = 0;
      if (star.x < 0) star.x = width;
    }
  }
}
