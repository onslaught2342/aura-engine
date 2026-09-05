import type { BackgroundLayer, EffectParams } from "./types";
import { DEFAULT_PARAMS } from "./types";

interface Bolt {
  points: { x: number; y: number }[];
  life: number; maxLife: number; alpha: number; hue: number;
}

export class ElectricStorm implements BackgroundLayer {
  private bolts: Bolt[] = [];
  private lastSpawn = 0;
  private color: string;
  private w = 0; private h = 0;

  constructor(w: number, h: number, color = "220, 90%, 65%") {
    this.color = color; this.w = w; this.h = h;
  }

  resize(w: number, h: number) { this.w = w; this.h = h; }

  private createBolt(turbMul: number, scaleMul: number): Bolt {
    const baseHue = parseInt(this.color) || 220;
    const startX = this.w * (0.2 + Math.random() * 0.6);
    const points: { x: number; y: number }[] = [{ x: startX, y: 0 }];
    let x = startX, y = 0;
    const segments = 12 + Math.floor(Math.random() * 10);
    const segH = this.h / segments;

    for (let i = 0; i < segments; i++) {
      x += (Math.random() - 0.5) * 120 * turbMul;
      y += segH + Math.random() * 20;
      points.push({ x, y });
      if (Math.random() < 0.2 && i > 2) {
        let bx = x, by = y;
        for (let j = 0; j < 4; j++) {
          bx += (Math.random() - 0.5) * 80 * turbMul;
          by += segH * 0.6;
          points.push({ x: bx, y: by });
        }
        points.push({ x, y });
      }
    }
    return { points, life: 0, maxLife: 8 + Math.random() * 12, alpha: 0.8 + Math.random() * 0.2, hue: baseHue + Math.random() * 30 - 15 };
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, params: EffectParams = DEFAULT_PARAMS) {
    const turbMul = params.turbulence / 50;
    const scaleMul = params.scale;
    const spawnRate = Math.max(200, (800 + Math.random() * 2000) / (params.intensity / 50));

    if (time - this.lastSpawn > spawnRate) {
      this.bolts.push(this.createBolt(turbMul, scaleMul));
      this.lastSpawn = time;
    }

    const baseHue = parseInt(this.color) || 220;
    const ambientAlpha = 0.02 + 0.01 * Math.sin(time * 0.005);
    const ambient = ctx.createRadialGradient(width / 2, 0, 0, width / 2, 0, width * 0.8);
    ambient.addColorStop(0, `hsla(${baseHue}, 80%, 60%, ${ambientAlpha})`);
    ambient.addColorStop(1, "transparent");
    ctx.fillStyle = ambient; ctx.fillRect(0, 0, width, height);

    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const bolt = this.bolts[i];
      bolt.life++;
      if (bolt.life > bolt.maxLife) { this.bolts.splice(i, 1); continue; }
      const fade = 1 - bolt.life / bolt.maxLife;
      const flicker = Math.random() > 0.3 ? 1 : 0.3;

      ctx.strokeStyle = `hsla(${bolt.hue}, 100%, 70%, ${fade * 0.3 * flicker})`;
      ctx.lineWidth = 8 * scaleMul; ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.beginPath();
      bolt.points.forEach((p, j) => (j === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.stroke();

      ctx.strokeStyle = `hsla(${bolt.hue}, 100%, 90%, ${fade * bolt.alpha * flicker})`;
      ctx.lineWidth = 2 * scaleMul;
      ctx.beginPath();
      bolt.points.forEach((p, j) => (j === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.stroke();
    }
  }
}
