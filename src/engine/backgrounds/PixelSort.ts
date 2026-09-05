import type { BackgroundLayer, EffectParams } from "./types";
import { DEFAULT_PARAMS } from "./types";

interface SortBand { y: number; speed: number; width: number; hue: number; progress: number; }

export class PixelSort implements BackgroundLayer {
  private bands: SortBand[] = [];
  private baseHue: number;

  constructor(_w: number, _h: number, color = "0") {
    this.baseHue = parseInt(color) || 0;
  }

  resize() {}

  private spawnBand(height: number): SortBand {
    return { y: Math.random() * height, speed: 1 + Math.random() * 3, width: 2 + Math.random() * 8, hue: Math.random() * 360, progress: 0 };
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, params: EffectParams = DEFAULT_PARAMS) {
    const iMul = params.intensity / 50;
    const sMul = params.scale;
    const tMul = params.turbulence / 50;
    const bandCount = Math.floor(15 * iMul);

    // Spawn bands
    while (this.bands.length < bandCount) this.bands.push(this.spawnBand(height));

    for (const band of this.bands) {
      band.progress += band.speed * iMul * 0.02;
      if (band.progress > 1) { Object.assign(band, this.spawnBand(height)); band.progress = 0; }

      const bw = band.width * sMul;
      const sortWidth = width * band.progress;

      // Sorted region - horizontal gradient streaks
      for (let x = 0; x < sortWidth; x += 3) {
        const t = x / width;
        const noiseY = Math.sin(x * 0.02 + time * 0.001) * tMul * 5;
        const hue = this.baseHue + band.hue + t * 120;
        const lightness = 30 + t * 40 + Math.sin(x * 0.05) * 10;
        ctx.fillStyle = `hsla(${hue}, 70%, ${lightness}%, ${0.6 * iMul})`;
        ctx.fillRect(x, band.y + noiseY, 3, bw);
      }

      // Sweep line
      ctx.fillStyle = `hsla(0, 0%, 100%, ${0.8 * iMul})`;
      ctx.fillRect(sortWidth - 1, band.y - bw, 2, bw * 3);

      // Glitch fragments ahead of sweep
      if (Math.random() < 0.3 * tMul) {
        const gx = sortWidth + Math.random() * (width - sortWidth) * 0.3;
        const gw = 5 + Math.random() * 30;
        ctx.fillStyle = `hsla(${band.hue + this.baseHue}, 60%, 50%, ${0.3 * iMul})`;
        ctx.fillRect(gx, band.y - bw * 0.5, gw, bw * 0.5);
      }
    }

    this.bands = this.bands.filter(b => b.progress < 1 || this.bands.length <= bandCount);
  }
}
