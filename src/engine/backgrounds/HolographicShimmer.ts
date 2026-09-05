import type { BackgroundLayer, EffectParams } from "./types";
import { DEFAULT_PARAMS } from "./types";

export class HolographicShimmer implements BackgroundLayer {
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
    const step = Math.max(2, Math.round(4 / scale));

    // Rainbow iridescent bands
    for (let y = 0; y < height; y += step) {
      const wave1 = Math.sin(y * 0.02 * scale + t * 1.5) * 0.5 + 0.5;
      const wave2 = Math.sin(y * 0.035 * scale - t * 0.8 + 2) * 0.5 + 0.5;
      const wave3 = Math.sin(y * 0.01 * scale + t * 0.5 + 4) * 0.5 + 0.5;
      const combined = (wave1 + wave2 + wave3) / 3;

      const hue = (this.baseHue + y * 0.3 + t * 30 * turb) % 360;
      const alpha = combined * 0.12 * intensity;

      ctx.fillStyle = `hsla(${hue}, 90%, 65%, ${alpha})`;
      ctx.fillRect(0, y, width, step);
    }

    // Diagonal prismatic streaks
    const streakCount = 6;
    for (let s = 0; s < streakCount; s++) {
      const phase = s * (Math.PI * 2 / streakCount);
      const sx = (t * 80 + s * width / streakCount) % (width * 1.5) - width * 0.25;
      const hue = (this.baseHue + s * 60 + t * 20) % 360;
      const alpha = (0.04 + 0.03 * Math.sin(t * 2 + phase)) * intensity;
      const w = 30 + Math.sin(t + phase) * 15 * scale;

      ctx.save();
      ctx.translate(sx, 0);
      ctx.rotate(0.3 + Math.sin(t * 0.3 + s) * 0.1 * turb);

      const g = ctx.createLinearGradient(0, 0, w, height * 1.5);
      g.addColorStop(0, `hsla(${hue}, 100%, 70%, 0)`);
      g.addColorStop(0.3, `hsla(${hue}, 100%, 70%, ${alpha})`);
      g.addColorStop(0.5, `hsla(${hue + 60}, 100%, 75%, ${alpha * 1.5})`);
      g.addColorStop(0.7, `hsla(${hue + 120}, 100%, 70%, ${alpha})`);
      g.addColorStop(1, `hsla(${hue + 180}, 100%, 70%, 0)`);
      ctx.fillStyle = g;
      ctx.fillRect(0, -height * 0.3, w, height * 1.8);

      ctx.restore();
    }

    // Sparkle points
    for (let i = 0; i < 20; i++) {
      const sparkT = t * 0.7 + i * 7.3;
      const sx = ((Math.sin(sparkT * 1.1) * 0.5 + 0.5) * width);
      const sy = ((Math.cos(sparkT * 0.9) * 0.5 + 0.5) * height);
      const sparkle = Math.pow(Math.sin(sparkT * 3) * 0.5 + 0.5, 3);
      const r = sparkle * 4 * scale;

      if (sparkle > 0.3) {
        const hue = (this.baseHue + i * 36 + t * 50) % 360;
        const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
        g.addColorStop(0, `hsla(${hue}, 100%, 90%, ${sparkle * 0.4 * intensity})`);
        g.addColorStop(1, `hsla(${hue}, 100%, 70%, 0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}
