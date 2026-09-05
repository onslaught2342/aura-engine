import type { BackgroundLayer, EffectParams } from "./types";
import { DEFAULT_PARAMS } from "./types";

interface Ring {
  x: number; y: number; radius: number; maxRadius: number;
  life: number; maxLife: number; hue: number;
}

export class SmokeRing implements BackgroundLayer {
  private rings: Ring[] = [];
  private lastSpawn = 0;
  private color: string;
  private cx = 0; private cy = 0;

  constructor(w: number, h: number, color = "270, 60%, 55%") {
    this.color = color; this.cx = w / 2; this.cy = h / 2;
  }

  resize(w: number, h: number) { this.cx = w / 2; this.cy = h / 2; }

  private spawn(turbMul: number): Ring {
    const baseHue = parseInt(this.color) || 270;
    return {
      x: this.cx + (Math.random() - 0.5) * 40 * turbMul,
      y: this.cy + (Math.random() - 0.5) * 40 * turbMul,
      radius: 5 + Math.random() * 10, maxRadius: 200 + Math.random() * 300,
      life: 0, maxLife: 180 + Math.random() * 120,
      hue: baseHue + Math.random() * 40 - 20,
    };
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, params: EffectParams = DEFAULT_PARAMS) {
    const spawnRate = Math.max(200, (600 + Math.random() * 400) / (params.intensity / 50));
    const turbMul = params.turbulence / 50;
    const scaleMul = params.scale;

    if (time - this.lastSpawn > spawnRate) {
      this.rings.push(this.spawn(turbMul));
      this.lastSpawn = time;
    }

    for (let i = this.rings.length - 1; i >= 0; i--) {
      const ring = this.rings[i];
      ring.life++;
      if (ring.life > ring.maxLife) { this.rings.splice(i, 1); continue; }

      const progress = ring.life / ring.maxLife;
      ring.radius += (ring.maxRadius * scaleMul - ring.radius) * 0.02;
      const fade = progress < 0.1 ? progress / 0.1 : Math.pow(1 - progress, 1.5);
      const wobble = Math.sin(time * 0.003 + i * 2) * 3 * turbMul;
      const thickness = (15 + 20 * (1 - progress)) * scaleMul;

      ctx.strokeStyle = `hsla(${ring.hue}, 50%, 50%, ${fade * 0.1})`;
      ctx.lineWidth = thickness + 20;
      ctx.beginPath(); ctx.arc(ring.x + wobble, ring.y, ring.radius, 0, Math.PI * 2); ctx.stroke();

      ctx.strokeStyle = `hsla(${ring.hue}, 60%, 60%, ${fade * 0.25})`;
      ctx.lineWidth = thickness;
      ctx.beginPath(); ctx.arc(ring.x + wobble, ring.y, ring.radius, 0, Math.PI * 2); ctx.stroke();

      ctx.strokeStyle = `hsla(${ring.hue}, 70%, 75%, ${fade * 0.15})`;
      ctx.lineWidth = thickness * 0.3;
      ctx.beginPath(); ctx.arc(ring.x + wobble, ring.y, ring.radius, 0, Math.PI * 2); ctx.stroke();
    }
  }
}
