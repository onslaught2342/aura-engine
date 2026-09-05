import type { BackgroundLayer, EffectParams } from "./types";
import { DEFAULT_PARAMS } from "./types";

export class FractalTree implements BackgroundLayer {
  private baseHue: number;

  constructor(_w: number, _h: number, color = "90") {
    this.baseHue = parseFloat(color) || 90;
  }

  resize() {}

  render(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, params: EffectParams = DEFAULT_PARAMS) {
    const t = time * 0.001;
    const intensity = params.intensity / 50;
    const scale = params.scale;
    const turb = params.turbulence / 50;

    const treeCount = 3;
    for (let tr = 0; tr < treeCount; tr++) {
      const startX = width * (0.2 + tr * 0.3);
      const startY = height * 0.9;
      const baseAngle = -Math.PI / 2;
      const baseLen = height * 0.18 * scale;

      this.drawBranch(ctx, startX, startY, baseAngle, baseLen, 0, 9, t, tr, intensity, turb);
    }
  }

  private drawBranch(
    ctx: CanvasRenderingContext2D, x: number, y: number,
    angle: number, len: number, depth: number, maxDepth: number,
    t: number, treeIdx: number, intensity: number, turb: number
  ) {
    if (depth > maxDepth || len < 2) return;

    const sway = Math.sin(t * 0.5 + depth * 0.3 + treeIdx) * 0.05 * turb * (depth + 1);
    const a = angle + sway;
    const ex = x + Math.cos(a) * len;
    const ey = y + Math.sin(a) * len;

    const hue = this.baseHue + depth * 15 + treeIdx * 40 + Math.sin(t * 0.3) * 10;
    const lightness = 30 + depth * 5;
    const alpha = (0.15 + 0.1 * (1 - depth / maxDepth)) * intensity;
    const lineW = Math.max(0.5, (maxDepth - depth) * 0.8);

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(ex, ey);
    ctx.strokeStyle = `hsla(${hue}, 60%, ${lightness}%, ${alpha})`;
    ctx.lineWidth = lineW;
    ctx.stroke();

    // Leaf glow at tips
    if (depth >= maxDepth - 1) {
      const glowR = 3 + Math.sin(t + depth + treeIdx) * 2;
      const g = ctx.createRadialGradient(ex, ey, 0, ex, ey, glowR);
      g.addColorStop(0, `hsla(${hue + 40}, 80%, 60%, ${alpha * 0.8})`);
      g.addColorStop(1, `hsla(${hue + 40}, 80%, 60%, 0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(ex, ey, glowR, 0, Math.PI * 2);
      ctx.fill();
    }

    const branchAngle = 0.4 + Math.sin(t * 0.2 + depth) * 0.1 * turb;
    const shrink = 0.68 + Math.sin(t * 0.15 + depth * 0.5) * 0.05;

    this.drawBranch(ctx, ex, ey, a - branchAngle, len * shrink, depth + 1, maxDepth, t, treeIdx, intensity, turb);
    this.drawBranch(ctx, ex, ey, a + branchAngle, len * shrink, depth + 1, maxDepth, t, treeIdx, intensity, turb);
  }
}
