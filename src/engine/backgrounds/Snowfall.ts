import type { BackgroundLayer, EffectParams } from "./types";
import { DEFAULT_PARAMS } from "./types";

interface Flake { x: number; y: number; size: number; speed: number; drift: number; opacity: number; wobble: number; depth: number; }

export class Snowfall implements BackgroundLayer {
  private flakes: Flake[] = [];
  private baseHue: number;
  private count = 300;

  constructor(w: number, h: number, color?: string) {
    this.baseHue = parseInt(color || "210") || 210;
    this.init(w, h);
  }

  private init(w: number, h: number) {
    this.flakes = Array.from({ length: this.count }, () => {
      const depth = Math.random();
      return {
        x: Math.random() * w, y: Math.random() * h,
        size: (Math.random() * 3 + 1) * (0.5 + depth * 0.5),
        speed: (Math.random() * 1 + 0.5) * (0.3 + depth * 0.7),
        drift: Math.random() * 2 - 1, opacity: 0.3 + depth * 0.7,
        wobble: Math.random() * Math.PI * 2, depth,
      };
    });
  }

  resize(w: number, h: number) { this.init(w, h); }

  render(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, params: EffectParams = DEFAULT_PARAMS) {
    const t = time * 0.001;
    const intensityMul = params.intensity / 50;
    const scaleMul = params.scale;
    const turbMul = params.turbulence / 50;
    const dirRad = (params.direction * Math.PI) / 180;
    const windX = Math.sin(dirRad) * 0.5;
    const windY = Math.cos(dirRad) * 0.5;
    const active = Math.floor(this.count * intensityMul);

    // Ambient fog
    const fogGrad = ctx.createLinearGradient(0, height * 0.6, 0, height);
    fogGrad.addColorStop(0, `hsla(${this.baseHue}, 20%, 80%, 0)`);
    fogGrad.addColorStop(1, `hsla(${this.baseHue}, 20%, 80%, 0.08)`);
    ctx.fillStyle = fogGrad;
    ctx.fillRect(0, 0, width, height);

    for (let i = 0; i < Math.min(active, this.flakes.length); i++) {
      const f = this.flakes[i];
      const wobble = Math.sin(t * 2 + f.wobble) * f.drift * turbMul;
      
      f.x += (windX + wobble) * f.speed;
      f.y += (windY + f.speed) * 0.5;

      if (f.y > height + 10) { f.y = -10; f.x = Math.random() * width; }
      if (f.x > width + 10) f.x = -10;
      if (f.x < -10) f.x = width + 10;

      const blur = (1 - f.depth) * 2;
      const size = f.size * scaleMul;

      // Glow
      if (f.depth > 0.7) {
        const glowGrad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, size * 4);
        glowGrad.addColorStop(0, `hsla(${this.baseHue}, 30%, 95%, ${f.opacity * 0.1})`);
        glowGrad.addColorStop(1, `hsla(${this.baseHue}, 30%, 95%, 0)`);
        ctx.fillStyle = glowGrad;
        ctx.fillRect(f.x - size * 4, f.y - size * 4, size * 8, size * 8);
      }

      ctx.fillStyle = `hsla(${this.baseHue}, 15%, 95%, ${f.opacity * 0.8})`;
      ctx.beginPath();
      ctx.arc(f.x, f.y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
