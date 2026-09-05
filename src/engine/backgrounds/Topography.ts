import type { BackgroundLayer, EffectParams } from "./types";
import { DEFAULT_PARAMS } from "./types";

export class Topography implements BackgroundLayer {
  private baseHue: number;

  constructor(_w: number, _h: number, color?: string) {
    this.baseHue = color ? parseInt(color, 10) || 120 : 120;
  }

  resize() {}

  private noise(x: number, y: number, t: number): number {
    const v1 = Math.sin(x * 0.02 + t) * Math.cos(y * 0.015 - t * 0.7);
    const v2 = Math.sin((x + y) * 0.01 + t * 0.5) * 0.5;
    const v3 = Math.cos(x * 0.008 - y * 0.012 + t * 0.3) * 0.3;
    return (v1 + v2 + v3) * 0.5 + 0.5;
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, params: EffectParams = DEFAULT_PARAMS) {
    const t = time * 0.0003;
    const intensity = params.intensity / 50;
    const scale = params.scale;
    const turb = params.turbulence / 50;
    const step = Math.max(6, Math.floor(12 / scale));
    const contourLevels = Math.floor(12 + 8 * intensity);

    // Compute elevation grid
    const cols = Math.ceil(width / step) + 1;
    const rows = Math.ceil(height / step) + 1;
    const grid: number[][] = [];

    for (let r = 0; r < rows; r++) {
      grid[r] = [];
      for (let c = 0; c < cols; c++) {
        const x = c * step;
        const y = r * step;
        grid[r][c] = this.noise(x / scale, y / scale, t * turb);
      }
    }

    // Draw contour lines using marching squares (simplified)
    for (let level = 0; level < contourLevels; level++) {
      const threshold = level / contourLevels;
      const hue = this.baseHue + level * (120 / contourLevels);
      const lightness = 30 + (level / contourLevels) * 40;
      const alpha = 0.3 + 0.4 * intensity;

      ctx.strokeStyle = `hsla(${hue}, 60%, ${lightness}%, ${alpha})`;
      ctx.lineWidth = level % 5 === 0 ? 1.5 : 0.7;
      ctx.beginPath();

      for (let r = 0; r < rows - 1; r++) {
        for (let c = 0; c < cols - 1; c++) {
          const tl = grid[r][c];
          const tr = grid[r][c + 1];
          const bl = grid[r + 1][c];
          const br = grid[r + 1][c + 1];
          const x = c * step;
          const y = r * step;

          // Simple linear interpolation contour segments
          const edges: [number, number][] = [];

          if ((tl >= threshold) !== (tr >= threshold)) {
            const frac = (threshold - tl) / (tr - tl);
            edges.push([x + frac * step, y]);
          }
          if ((tr >= threshold) !== (br >= threshold)) {
            const frac = (threshold - tr) / (br - tr);
            edges.push([x + step, y + frac * step]);
          }
          if ((bl >= threshold) !== (br >= threshold)) {
            const frac = (threshold - bl) / (br - bl);
            edges.push([x + frac * step, y + step]);
          }
          if ((tl >= threshold) !== (bl >= threshold)) {
            const frac = (threshold - tl) / (bl - tl);
            edges.push([x, y + frac * step]);
          }

          if (edges.length >= 2) {
            ctx.moveTo(edges[0][0], edges[0][1]);
            ctx.lineTo(edges[1][0], edges[1][1]);
          }
        }
      }
      ctx.stroke();
    }

    // Elevation dots at peaks
    const dotCount = Math.floor(15 * intensity);
    for (let i = 0; i < dotCount; i++) {
      const dx = (Math.sin(t * 0.8 + i * 2.7) * 0.5 + 0.5) * width;
      const dy = (Math.cos(t * 0.6 + i * 3.1) * 0.5 + 0.5) * height;
      const elev = this.noise(dx / scale, dy / scale, t * turb);
      const da = elev * 0.5 * intensity;
      ctx.fillStyle = `hsla(${this.baseHue + elev * 60}, 70%, 70%, ${da})`;
      ctx.beginPath();
      ctx.arc(dx, dy, 2 * scale, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
