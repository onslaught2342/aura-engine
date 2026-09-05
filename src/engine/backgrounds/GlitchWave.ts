import type { BackgroundLayer, EffectParams } from "./types";
import { DEFAULT_PARAMS } from "./types";

interface GlitchBand {
  y: number;
  height: number;
  speed: number;
  rgbShift: number;
  direction: number;
  life: number;
  maxLife: number;
  intensity: number;
}

interface StaticBurst {
  x: number;
  y: number;
  w: number;
  h: number;
  life: number;
  maxLife: number;
}

export class GlitchWave implements BackgroundLayer {
  private bands: GlitchBand[] = [];
  private bursts: StaticBurst[] = [];
  private baseHue: number;
  private scanY = 0;

  constructor(_w: number, _h: number, color = "0") {
    this.baseHue = parseFloat(color) || 0;
  }

  resize() {}

  render(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, params: EffectParams = DEFAULT_PARAMS) {
    const t = time * 0.001;
    const intensityMul = params.intensity / 50;
    const scaleMul = params.scale;
    const turbMul = params.turbulence / 50;

    // Scanning distortion line
    this.scanY = (this.scanY + 1.5 * scaleMul) % height;
    const scanAlpha = 0.08 * intensityMul;
    ctx.fillStyle = `hsla(${this.baseHue}, 100%, 50%, ${scanAlpha})`;
    ctx.fillRect(0, this.scanY, width, 2 * scaleMul);

    // Spawn glitch bands
    if (Math.random() < 0.04 * intensityMul * turbMul) {
      const bandH = 5 + Math.random() * 40 * scaleMul;
      this.bands.push({
        y: Math.random() * height,
        height: bandH,
        speed: (Math.random() - 0.5) * 20,
        rgbShift: 3 + Math.random() * 15 * scaleMul,
        direction: Math.random() > 0.5 ? 1 : -1,
        life: 0,
        maxLife: 0.1 + Math.random() * 0.4,
        intensity: 0.5 + Math.random() * 0.5,
      });
    }

    // Spawn static bursts
    if (Math.random() < 0.06 * intensityMul * turbMul) {
      this.bursts.push({
        x: Math.random() * width,
        y: Math.random() * height,
        w: 10 + Math.random() * 80,
        h: 5 + Math.random() * 30,
        life: 0,
        maxLife: 0.05 + Math.random() * 0.15,
      });
    }

    // Draw glitch bands (RGB channel split effect)
    for (let i = this.bands.length - 1; i >= 0; i--) {
      const band = this.bands[i];
      band.life += 0.016;

      if (band.life >= band.maxLife) {
        this.bands.splice(i, 1);
        continue;
      }

      const alpha = (1 - band.life / band.maxLife) * band.intensity * intensityMul;
      const shift = band.rgbShift * band.direction;

      // Red channel
      ctx.fillStyle = `hsla(0, 100%, 50%, ${alpha * 0.3})`;
      ctx.fillRect(shift, band.y, width, band.height);

      // Cyan channel (opposite)
      ctx.fillStyle = `hsla(180, 100%, 50%, ${alpha * 0.3})`;
      ctx.fillRect(-shift, band.y, width, band.height);

      // White flash in band
      ctx.fillStyle = `hsla(0, 0%, 100%, ${alpha * 0.1})`;
      ctx.fillRect(0, band.y, width, band.height);
    }

    // Draw static bursts
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const burst = this.bursts[i];
      burst.life += 0.016;

      if (burst.life >= burst.maxLife) {
        this.bursts.splice(i, 1);
        continue;
      }

      const alpha = (1 - burst.life / burst.maxLife) * intensityMul;

      // Draw static noise pixels
      const pixelSize = 2 * scaleMul;
      for (let py = 0; py < burst.h; py += pixelSize) {
        for (let px = 0; px < burst.w; px += pixelSize) {
          if (Math.random() > 0.4) {
            const brightness = Math.random() * 100;
            ctx.fillStyle = `hsla(0, 0%, ${brightness}%, ${alpha * 0.6})`;
            ctx.fillRect(burst.x + px, burst.y + py, pixelSize, pixelSize);
          }
        }
      }
    }

    // Horizontal distortion lines
    const lineCount = Math.floor(3 * intensityMul);
    for (let l = 0; l < lineCount; l++) {
      const ly = (t * 100 * (l + 1) + l * 200) % height;
      ctx.fillStyle = `hsla(${this.baseHue + l * 60}, 80%, 50%, ${0.04 * intensityMul})`;
      ctx.fillRect(0, ly, width, 1);
    }
  }
}
