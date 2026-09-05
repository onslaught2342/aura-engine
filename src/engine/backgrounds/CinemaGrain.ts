import type { BackgroundLayer, EffectParams } from "./types";
import { DEFAULT_PARAMS } from "./types";

export class CinemaGrain implements BackgroundLayer {
  private buffer: Uint8ClampedArray | null = null;
  private lastW = 0; private lastH = 0;
  private frameSkip = 0;
  private cachedImageData: ImageData | null = null;
  private warmth: number;

  constructor(color?: string) { this.warmth = parseInt(color || "30") || 30; }
  resize() {}

  render(ctx: CanvasRenderingContext2D, width: number, height: number, _time: number, params: EffectParams = DEFAULT_PARAMS) {
    const grainAlpha = Math.round(35 * (params.intensity / 50));
    const skipRate = Math.max(1, Math.round(3 / params.scale));

    this.frameSkip++;
    if (this.frameSkip % skipRate !== 0 && this.cachedImageData && this.lastW === width && this.lastH === height) {
      ctx.putImageData(this.cachedImageData, 0, 0);
      return;
    }

    if (this.lastW !== width || this.lastH !== height) {
      this.buffer = new Uint8ClampedArray(width * height * 4);
      this.lastW = width; this.lastH = height;
    }

    const buf = this.buffer!;
    const step = Math.max(4, 16 - Math.floor(params.turbulence / 10) * 2);
    for (let i = 0; i < buf.length; i += step) {
      const v = (Math.random() * 255) | 0;
      for (let j = 0; j < step && i + j + 3 < buf.length; j += 4) {
        buf[i + j] = v; buf[i + j + 1] = v; buf[i + j + 2] = v;
        buf[i + j + 3] = grainAlpha;
      }
    }

    this.cachedImageData = new ImageData(new Uint8ClampedArray(buf.buffer as ArrayBuffer), width, height);
    ctx.putImageData(this.cachedImageData, 0, 0);
  }
}
