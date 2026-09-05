import type { BackgroundLayer, EffectParams } from "./types";
import { DEFAULT_PARAMS } from "./types";

interface Bolt { points: { x: number; y: number }[]; life: number; maxLife: number; alpha: number; width: number; branches: { points: { x: number; y: number }[]; alpha: number }[]; }

export class LightningBolts implements BackgroundLayer {
  private bolts: Bolt[] = [];
  private baseHue: number;
  private w: number;
  private h: number;
  private flashAlpha = 0;

  constructor(w: number, h: number, color?: string) {
    this.baseHue = parseInt(color || "240") || 240;
    this.w = w; this.h = h;
  }

  resize(w: number, h: number) { this.w = w; this.h = h; }

  private createBolt(turbMul: number, scaleMul: number): Bolt {
    const startX = Math.random() * this.w;
    const points: { x: number; y: number }[] = [{ x: startX, y: 0 }];
    const segments = Math.floor(15 + Math.random() * 20);
    const branches: Bolt["branches"] = [];
    let x = startX, y = 0;

    for (let i = 0; i < segments; i++) {
      x += (Math.random() - 0.5) * 80 * turbMul;
      y += (this.h / segments) * (0.8 + Math.random() * 0.4);
      points.push({ x, y });

      // Branch chance
      if (Math.random() < 0.3 * turbMul) {
        const bp: { x: number; y: number }[] = [{ x, y }];
        let bx = x, by = y;
        const bSegs = Math.floor(3 + Math.random() * 6);
        for (let j = 0; j < bSegs; j++) {
          bx += (Math.random() - 0.5) * 60 * turbMul;
          by += (this.h / segments) * (0.5 + Math.random() * 0.3);
          bp.push({ x: bx, y: by });
        }
        branches.push({ points: bp, alpha: 0.4 + Math.random() * 0.3 });
      }
    }

    return { points, life: 0, maxLife: 300 + Math.random() * 400, alpha: 0.8 + Math.random() * 0.2, width: (2 + Math.random() * 3) * scaleMul, branches };
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, params: EffectParams = DEFAULT_PARAMS) {
    const intensityMul = params.intensity / 50;
    const scaleMul = params.scale;
    const turbMul = params.turbulence / 50;

    // Spawn
    if (Math.random() < 0.008 * intensityMul) {
      this.bolts.push(this.createBolt(turbMul, scaleMul));
      this.flashAlpha = 0.3;
    }

    // Flash
    if (this.flashAlpha > 0) {
      ctx.fillStyle = `hsla(${this.baseHue}, 30%, 90%, ${this.flashAlpha})`;
      ctx.fillRect(0, 0, width, height);
      this.flashAlpha *= 0.85;
    }

    // Ambient
    const ambGrad = ctx.createRadialGradient(width / 2, height * 0.3, 0, width / 2, height * 0.3, width * 0.6);
    ambGrad.addColorStop(0, `hsla(${this.baseHue}, 40%, 20%, 0.05)`);
    ambGrad.addColorStop(1, `hsla(${this.baseHue}, 30%, 5%, 0)`);
    ctx.fillStyle = ambGrad;
    ctx.fillRect(0, 0, width, height);

    this.bolts = this.bolts.filter(b => {
      b.life += 16;
      const fade = 1 - b.life / b.maxLife;
      if (fade <= 0) return false;

      const drawPath = (pts: { x: number; y: number }[], alpha: number, w: number) => {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);

        // Outer glow
        ctx.strokeStyle = `hsla(${this.baseHue}, 80%, 70%, ${alpha * fade * 0.3})`;
        ctx.lineWidth = w * 6;
        ctx.stroke();

        // Mid
        ctx.strokeStyle = `hsla(${this.baseHue}, 60%, 85%, ${alpha * fade * 0.6})`;
        ctx.lineWidth = w * 2;
        ctx.stroke();

        // Core
        ctx.strokeStyle = `hsla(${this.baseHue + 20}, 30%, 95%, ${alpha * fade})`;
        ctx.lineWidth = w;
        ctx.stroke();
      };

      drawPath(b.points, b.alpha, b.width);
      for (const br of b.branches) drawPath(br.points, br.alpha * b.alpha, b.width * 0.5);

      return true;
    });
  }
}
