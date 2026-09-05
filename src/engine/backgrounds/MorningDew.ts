import type { BackgroundLayer, EffectParams } from "./types";
import { DEFAULT_PARAMS } from "./types";

interface Drop {
  x: number; y: number; r: number; growSpeed: number;
  phase: number; hueShift: number; opacity: number;
}

export class MorningDew implements BackgroundLayer {
  private baseHue: number;
  private drops: Drop[] = [];
  private w = 0; private h = 0;

  constructor(w: number, h: number, color?: string) {
    this.baseHue = color ? parseInt(color) || 150 : 150;
    this.w = w; this.h = h;
    this.init();
  }

  private init() {
    this.drops = [];
    for (let i = 0; i < 60; i++) this.drops.push(this.spawn());
  }

  private spawn(): Drop {
    return {
      x: Math.random() * this.w, y: Math.random() * this.h,
      r: 2 + Math.random() * 8, growSpeed: 0.2 + Math.random() * 0.5,
      phase: Math.random() * Math.PI * 2, hueShift: Math.random() * 30 - 15,
      opacity: 0.3 + Math.random() * 0.5,
    };
  }

  resize(w: number, h: number) { this.w = w; this.h = h; }

  render(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, params: EffectParams = DEFAULT_PARAMS) {
    const t = time * 0.001;
    const scale = params.scale;
    const intensity = params.intensity / 50;

    for (const d of this.drops) {
      const pulse = Math.sin(t * d.growSpeed + d.phase) * 0.3 + 1;
      const r = d.r * scale * pulse;
      const hue = this.baseHue + d.hueShift;
      const alpha = d.opacity * intensity * (0.7 + 0.3 * Math.sin(t * 0.8 + d.phase));

      // Drop body
      const grad = ctx.createRadialGradient(d.x - r * 0.3, d.y - r * 0.3, r * 0.1, d.x, d.y, r);
      grad.addColorStop(0, `hsla(${hue}, 70%, 90%, ${alpha})`);
      grad.addColorStop(0.5, `hsla(${hue}, 60%, 70%, ${alpha * 0.7})`);
      grad.addColorStop(1, `hsla(${hue}, 50%, 50%, 0)`);
      ctx.beginPath();
      ctx.arc(d.x, d.y, r, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      // Highlight
      const hx = d.x - r * 0.25, hy = d.y - r * 0.3;
      ctx.beginPath();
      ctx.arc(hx, hy, r * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(0, 0%, 100%, ${alpha * 0.8})`;
      ctx.fill();
    }
  }
}
