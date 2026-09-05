import type { BackgroundLayer, EffectParams } from "./types";
import { DEFAULT_PARAMS } from "./types";

interface Drop { x: number; y: number; speed: number; length: number; opacity: number; }
interface Splash { x: number; y: number; life: number; maxLife: number; radius: number; }

export class RainfallEffect implements BackgroundLayer {
  private drops: Drop[] = [];
  private splashes: Splash[] = [];
  private baseHue: number;
  private w: number; private h: number;

  constructor(w: number, h: number, color?: string) {
    this.baseHue = parseInt(color || "200", 10);
    this.w = w; this.h = h; this.init();
  }

  private init() { this.drops = Array.from({ length: 200 }, () => this.spawn()); }

  private spawn(): Drop {
    return {
      x: Math.random() * this.w * 1.2 - this.w * 0.1,
      y: Math.random() * -this.h, speed: 4 + Math.random() * 8,
      length: 15 + Math.random() * 30, opacity: 0.2 + Math.random() * 0.5,
    };
  }

  resize(w: number, h: number) { this.w = w; this.h = h; }

  render(ctx: CanvasRenderingContext2D, width: number, height: number, _time: number, params: EffectParams = DEFAULT_PARAMS) {
    const windAngle = ((params.direction - 180) / 180) * 0.5;
    const speedMul = params.intensity / 50;
    const scaleMul = params.scale;
    const active = Math.floor(200 * speedMul);

    for (let i = 0; i < Math.min(active, this.drops.length); i++) {
      const drop = this.drops[i];
      drop.y += drop.speed * speedMul;
      drop.x += drop.speed * Math.sin(windAngle);

      if (drop.y > height) {
        if (Math.random() < 0.3) {
          this.splashes.push({ x: drop.x, y: height - 2, life: 0, maxLife: 15 + Math.random() * 10, radius: (2 + Math.random() * 3) * scaleMul });
        }
        Object.assign(drop, this.spawn()); drop.y = Math.random() * -50;
      }

      ctx.beginPath(); ctx.moveTo(drop.x, drop.y);
      ctx.lineTo(drop.x + drop.length * scaleMul * Math.sin(windAngle), drop.y + drop.length * scaleMul);
      ctx.strokeStyle = `hsla(${this.baseHue}, 60%, 70%, ${drop.opacity})`;
      ctx.lineWidth = scaleMul; ctx.stroke();
    }

    for (let i = this.splashes.length - 1; i >= 0; i--) {
      const s = this.splashes[i]; s.life++;
      if (s.life > s.maxLife) { this.splashes.splice(i, 1); continue; }
      const progress = s.life / s.maxLife;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius * (1 + progress * 2), 0, Math.PI, true);
      ctx.strokeStyle = `hsla(${this.baseHue}, 50%, 80%, ${(1 - progress) * 0.5})`;
      ctx.lineWidth = 0.5; ctx.stroke();
    }
  }
}
