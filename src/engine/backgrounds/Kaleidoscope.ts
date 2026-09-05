import type { BackgroundLayer, EffectParams } from "./types";
import { DEFAULT_PARAMS } from "./types";

export class Kaleidoscope implements BackgroundLayer {
  private baseHue: number;

  constructor(_w: number, _h: number, color = "0") {
    this.baseHue = parseFloat(color) || 0;
  }

  resize() {}

  render(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, params: EffectParams = DEFAULT_PARAMS) {
    const t = time * 0.001;
    const intensity = params.intensity / 50;
    const scale = params.scale;
    const turb = params.turbulence / 50;
    const segments = 8;
    const cx = width / 2;
    const cy = height / 2;
    const maxR = Math.hypot(cx, cy) * scale;

    ctx.save();
    ctx.translate(cx, cy);

    for (let s = 0; s < segments; s++) {
      ctx.save();
      ctx.rotate((s / segments) * Math.PI * 2 + t * 0.1 * turb);
      if (s % 2 === 1) ctx.scale(-1, 1);

      // Draw petal shapes
      const petalCount = 5;
      for (let p = 0; p < petalCount; p++) {
        const angle = (p / petalCount) * (Math.PI / segments);
        const r = maxR * (0.3 + 0.2 * Math.sin(t * 0.5 + p + s));
        const hue = this.baseHue + p * 30 + t * 10;
        const alpha = (0.08 + 0.06 * Math.sin(t * 0.3 + p * 0.7)) * intensity;

        ctx.beginPath();
        ctx.moveTo(0, 0);
        const cp1x = Math.cos(angle - 0.2) * r * 0.6;
        const cp1y = Math.sin(angle - 0.2) * r * 0.6;
        const cp2x = Math.cos(angle + 0.2) * r * 0.6;
        const cp2y = Math.sin(angle + 0.2) * r * 0.6;
        const ex = Math.cos(angle) * r;
        const ey = Math.sin(angle) * r;
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, ex, ey);
        ctx.bezierCurveTo(cp2x * 1.2, cp2y * 1.2, cp1x * 1.2, cp1y * 1.2, 0, 0);
        ctx.closePath();

        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
        g.addColorStop(0, `hsla(${hue}, 80%, 60%, ${alpha})`);
        g.addColorStop(0.5, `hsla(${hue + 40}, 70%, 50%, ${alpha * 0.6})`);
        g.addColorStop(1, `hsla(${hue + 80}, 60%, 40%, 0)`);
        ctx.fillStyle = g;
        ctx.fill();
      }

      // Mandala rings
      for (let ring = 1; ring <= 3; ring++) {
        const rr = ring * maxR * 0.2;
        const hue = this.baseHue + ring * 40 + t * 15;
        const alpha = 0.05 * intensity;
        ctx.beginPath();
        ctx.arc(0, 0, rr + Math.sin(t + ring) * 10 * turb, 0, Math.PI / segments);
        ctx.strokeStyle = `hsla(${hue}, 70%, 55%, ${alpha})`;
        ctx.lineWidth = 1.5 * scale;
        ctx.stroke();
      }

      ctx.restore();
    }

    ctx.restore();
  }
}
