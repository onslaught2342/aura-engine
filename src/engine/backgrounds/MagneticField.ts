import type { BackgroundLayer, EffectParams } from "./types";
import { DEFAULT_PARAMS } from "./types";

interface Pole { x: number; y: number; vx: number; vy: number; polarity: number }

export class MagneticField implements BackgroundLayer {
  private baseHue: number;
  private poles: Pole[] = [];
  private w: number;
  private h: number;

  constructor(w: number, h: number, color?: string) {
    this.baseHue = color ? parseFloat(color) || 200 : 200;
    this.w = w; this.h = h;
    this.initPoles();
  }

  private initPoles() {
    this.poles = [];
    for (let i = 0; i < 4; i++) {
      this.poles.push({
        x: Math.random() * this.w, y: Math.random() * this.h,
        vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5,
        polarity: i % 2 === 0 ? 1 : -1,
      });
    }
  }

  resize(w: number, h: number) { this.w = w; this.h = h; }

  render(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, params: EffectParams = DEFAULT_PARAMS) {
    const t = time * 0.0003;
    const lineCount = Math.floor(20 + params.intensity * 0.8);
    const scale = params.scale;

    // Move poles
    for (const p of this.poles) {
      p.x += Math.sin(t + p.polarity) * 0.8;
      p.y += Math.cos(t * 0.7 + p.polarity * 2) * 0.8;
      p.x = ((p.x % width) + width) % width;
      p.y = ((p.y % height) + height) % height;
    }

    // Draw field lines
    const step = Math.max(width, height) / lineCount;
    for (let gx = 0; gx < width; gx += step) {
      for (let gy = 0; gy < height; gy += step) {
        let x = gx, y = gy;
        ctx.beginPath();
        ctx.moveTo(x, y);
        const segments = 40;
        for (let s = 0; s < segments; s++) {
          let fx = 0, fy = 0;
          for (const p of this.poles) {
            const dx = x - p.x, dy = y - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy) + 10;
            const force = (p.polarity * 500 * scale) / (dist * dist);
            fx += force * dx / dist;
            fy += force * dy / dist;
          }
          const mag = Math.sqrt(fx * fx + fy * fy) + 0.001;
          x += (fx / mag) * 4;
          y += (fy / mag) * 4;
          if (x < 0 || x > width || y < 0 || y > height) break;
          ctx.lineTo(x, y);
        }
        const hue = (this.baseHue + (gx / width) * 60) % 360;
        ctx.strokeStyle = `hsla(${hue}, 70%, 60%, 0.3)`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
    }

    // Draw poles as glowing dots
    for (const p of this.poles) {
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 20 * scale);
      const hue = p.polarity > 0 ? this.baseHue : (this.baseHue + 180) % 360;
      grad.addColorStop(0, `hsla(${hue}, 100%, 80%, 0.9)`);
      grad.addColorStop(1, `hsla(${hue}, 100%, 50%, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 20 * scale, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
