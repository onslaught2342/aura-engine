import type { BackgroundLayer, EffectParams } from "./types";
import { DEFAULT_PARAMS } from "./types";

export class NeonGrid implements BackgroundLayer {
  private color: string;
  constructor(_w: number, _h: number, color = "180, 100%, 50%") { this.color = color; }
  resize() {}

  render(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, params: EffectParams = DEFAULT_PARAMS) {
    const t = time * 0.001;
    const horizon = height * (0.3 + (params.direction / 360) * 0.3);
    const vanishX = width / 2;
    const baseHue = parseInt(this.color) || 180;
    const gridColor = `hsla(${baseHue}, 100%, 60%, `;
    const lineCount = Math.round(20 * (params.intensity / 50));
    const scaleMul = params.scale;

    for (let i = 0; i < lineCount; i++) {
      const progress = ((i / lineCount + t * 0.1) % 1);
      const y = horizon + Math.pow(progress, 2) * (height - horizon) * 1.2;
      if (y > height) continue;
      const alpha = progress * 0.6;
      ctx.strokeStyle = gridColor + alpha + ")";
      ctx.lineWidth = (1 + progress * 2) * scaleMul;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }

    const vLines = Math.round(16 * (params.intensity / 50));
    for (let i = 0; i <= vLines; i++) {
      const spread = (i / vLines - 0.5) * 2;
      const bottomX = vanishX + spread * width * 0.8;
      const alpha = 0.3 + 0.15 * Math.sin(t * 2 * (params.turbulence / 50) + i);
      ctx.strokeStyle = gridColor + alpha + ")";
      ctx.lineWidth = scaleMul;
      ctx.beginPath(); ctx.moveTo(vanishX, horizon); ctx.lineTo(bottomX, height + 20); ctx.stroke();
    }

    const glow = ctx.createRadialGradient(vanishX, horizon, 0, vanishX, horizon, width * 0.4);
    glow.addColorStop(0, `hsla(${baseHue}, 100%, 70%, 0.15)`);
    glow.addColorStop(0.5, `hsla(${baseHue}, 100%, 50%, 0.05)`);
    glow.addColorStop(1, "transparent");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    const sunRadius = (40 + 5 * Math.sin(t * 3)) * scaleMul;
    const sunGrad = ctx.createRadialGradient(vanishX, horizon, 0, vanishX, horizon, sunRadius);
    sunGrad.addColorStop(0, `hsla(${baseHue + 30}, 100%, 80%, 0.6)`);
    sunGrad.addColorStop(0.6, `hsla(${baseHue}, 100%, 60%, 0.2)`);
    sunGrad.addColorStop(1, "transparent");
    ctx.fillStyle = sunGrad;
    ctx.beginPath(); ctx.arc(vanishX, horizon, sunRadius, 0, Math.PI * 2); ctx.fill();
  }
}
