import type { BackgroundLayer, EffectParams } from "./types";
import { DEFAULT_PARAMS } from "./types";

export class VortexTunnel implements BackgroundLayer {
  private baseHue: number;

  constructor(_w: number, _h: number, color?: string) {
    this.baseHue = parseInt(color || "280") || 280;
  }

  resize() {}

  render(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, params: EffectParams = DEFAULT_PARAMS) {
    const t = time * 0.001;
    const intensityMul = params.intensity / 50;
    const scaleMul = params.scale;
    const turbMul = params.turbulence / 50;
    const cx = width / 2;
    const cy = height / 2;
    const maxR = Math.hypot(cx, cy);

    // Rings receding into center
    const ringCount = Math.floor(20 * intensityMul);
    for (let i = ringCount; i >= 0; i--) {
      const ratio = i / ringCount;
      const r = ratio * maxR * scaleMul;
      const rotation = t * (1 + (1 - ratio) * 3) + ratio * Math.PI;
      const wobble = Math.sin(t * 2 * turbMul + ratio * 10) * 5;
      const hue = this.baseHue + ratio * 60 + Math.sin(t + ratio * 5) * 20;
      const lightness = 20 + ratio * 30;
      const alpha = (1 - ratio) * 0.3 * intensityMul;

      ctx.save();
      ctx.translate(cx + wobble, cy + wobble * 0.5);
      ctx.rotate(rotation);

      // Ring
      ctx.beginPath();
      ctx.ellipse(0, 0, r, r * 0.6, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `hsla(${hue}, 80%, ${lightness}%, ${alpha})`;
      ctx.lineWidth = 2 + (1 - ratio) * 4;
      ctx.stroke();

      // Glow segments
      for (let s = 0; s < 4; s++) {
        const segAngle = (s / 4) * Math.PI * 2 + rotation;
        const sx = Math.cos(segAngle) * r;
        const sy = Math.sin(segAngle) * r * 0.6;
        const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, 20 * scaleMul);
        glow.addColorStop(0, `hsla(${hue + 30}, 100%, 80%, ${alpha * 0.5})`);
        glow.addColorStop(1, `hsla(${hue}, 80%, 50%, 0)`);
        ctx.fillStyle = glow;
        ctx.fillRect(sx - 20, sy - 20, 40, 40);
      }

      ctx.restore();
    }

    // Center glow
    const centerGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 60 * scaleMul);
    centerGlow.addColorStop(0, `hsla(${this.baseHue + 40}, 100%, 90%, 0.6)`);
    centerGlow.addColorStop(0.5, `hsla(${this.baseHue}, 80%, 60%, 0.2)`);
    centerGlow.addColorStop(1, `hsla(${this.baseHue}, 60%, 40%, 0)`);
    ctx.fillStyle = centerGlow;
    ctx.beginPath();
    ctx.arc(cx, cy, 60 * scaleMul, 0, Math.PI * 2);
    ctx.fill();
  }
}
