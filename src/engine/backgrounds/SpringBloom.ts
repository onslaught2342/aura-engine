import type { BackgroundLayer, EffectParams } from "./types";
import { DEFAULT_PARAMS } from "./types";

interface Bloom {
  x: number; y: number; phase: number; speed: number;
  petalCount: number; maxSize: number; hue: number;
}

export class SpringBloom implements BackgroundLayer {
  private blooms: Bloom[] = [];
  private w = 0; private h = 0;

  constructor(w: number, h: number, _color?: string) {
    this.w = w; this.h = h;
    this.init();
  }

  private init() {
    const hues = [340, 280, 160]; // pink, lavender, mint
    this.blooms = [];
    for (let i = 0; i < 12; i++) {
      this.blooms.push({
        x: Math.random() * this.w, y: Math.random() * this.h,
        phase: Math.random() * Math.PI * 2,
        speed: 0.3 + Math.random() * 0.4,
        petalCount: 5 + Math.floor(Math.random() * 3),
        maxSize: 25 + Math.random() * 40,
        hue: hues[Math.floor(Math.random() * hues.length)],
      });
    }
  }

  resize(w: number, h: number) { this.w = w; this.h = h; this.init(); }

  render(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, params: EffectParams = DEFAULT_PARAMS) {
    const t = time * 0.001;
    const scale = params.scale;
    const intensity = params.intensity / 50;

    for (const b of this.blooms) {
      // Cycle: grow 0→1, hold, fade 1→0
      const cycle = ((t * b.speed + b.phase) % (Math.PI * 2));
      const bloom = Math.sin(cycle) * 0.5 + 0.5; // 0-1
      if (bloom < 0.05) continue;

      const size = b.maxSize * bloom * scale;
      const alpha = bloom * 0.5 * intensity;

      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(t * 0.1 * b.speed);

      // Draw petals
      for (let p = 0; p < b.petalCount; p++) {
        const angle = (p / b.petalCount) * Math.PI * 2;
        ctx.save();
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.ellipse(size * 0.5, 0, size * 0.4, size * 0.18, 0, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${b.hue}, 55%, 78%, ${alpha})`;
        ctx.fill();
        ctx.restore();
      }

      // Center
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.15, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${(b.hue + 40) % 360}, 60%, 85%, ${alpha * 1.2})`;
      ctx.fill();

      ctx.restore();
    }
  }
}
