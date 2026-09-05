import type { BackgroundLayer, EffectParams } from "./types";
import { DEFAULT_PARAMS } from "./types";

export class OceanWaves implements BackgroundLayer {
  private baseHue: number;
  private w: number;
  private h: number;

  constructor(w: number, h: number, color?: string) {
    this.baseHue = parseInt(color || "200") || 200;
    this.w = w; this.h = h;
  }

  resize(w: number, h: number) { this.w = w; this.h = h; }

  render(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, params: EffectParams = DEFAULT_PARAMS) {
    const t = time * 0.001;
    const intensityMul = params.intensity / 50;
    const scaleMul = params.scale;
    const turbMul = params.turbulence / 50;
    const dirRad = (params.direction * Math.PI) / 180;

    // Deep water gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, `hsla(${this.baseHue}, 60%, 15%, 0.4)`);
    bgGrad.addColorStop(0.5, `hsla(${this.baseHue + 10}, 70%, 20%, 0.6)`);
    bgGrad.addColorStop(1, `hsla(${this.baseHue + 20}, 80%, 10%, 0.8)`);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Multiple wave layers
    const waveLayers = 6;
    for (let layer = 0; layer < waveLayers; layer++) {
      const layerRatio = layer / waveLayers;
      const yBase = height * (0.3 + layerRatio * 0.5);
      const amplitude = (20 + layer * 15) * scaleMul * intensityMul;
      const frequency = (0.005 + layer * 0.003) / scaleMul;
      const speed = (0.5 + layer * 0.3) * turbMul;
      const alpha = 0.08 + layerRatio * 0.12;

      ctx.beginPath();
      ctx.moveTo(0, height);
      for (let x = 0; x <= width; x += 3) {
        const wave1 = Math.sin(x * frequency + t * speed + dirRad) * amplitude;
        const wave2 = Math.sin(x * frequency * 1.5 + t * speed * 0.7 + 1) * amplitude * 0.5;
        const wave3 = Math.sin(x * frequency * 0.5 + t * speed * 1.3) * amplitude * 0.3 * turbMul;
        const y = yBase + wave1 + wave2 + wave3;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(width, height);
      ctx.closePath();

      const hue = this.baseHue + layer * 5;
      const lightness = 25 + layer * 8;
      ctx.fillStyle = `hsla(${hue}, 70%, ${lightness}%, ${alpha})`;
      ctx.fill();

      // Foam on crests
      if (layer > 2) {
        for (let x = 0; x <= width; x += 8) {
          const wave1 = Math.sin(x * frequency + t * speed + dirRad) * amplitude;
          const wave2 = Math.sin(x * frequency * 1.5 + t * speed * 0.7 + 1) * amplitude * 0.5;
          const y = yBase + wave1 + wave2;
          const foamAlpha = Math.max(0, -wave1 / amplitude) * 0.3 * intensityMul;
          if (foamAlpha > 0.05) {
            ctx.fillStyle = `hsla(${this.baseHue + 30}, 30%, 90%, ${foamAlpha})`;
            ctx.fillRect(x, y - 1, 4, 2);
          }
        }
      }
    }

    // Light reflections
    for (let i = 0; i < 20 * intensityMul; i++) {
      const rx = (Math.sin(t * 0.3 + i * 1.7) * 0.5 + 0.5) * width;
      const ry = (Math.sin(t * 0.2 + i * 2.3) * 0.3 + 0.5) * height;
      const rAlpha = (Math.sin(t * 1.5 + i * 3.1) * 0.5 + 0.5) * 0.1;
      ctx.fillStyle = `hsla(${this.baseHue + 40}, 20%, 90%, ${rAlpha})`;
      ctx.beginPath();
      ctx.ellipse(rx, ry, 3 * scaleMul, 1 * scaleMul, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
