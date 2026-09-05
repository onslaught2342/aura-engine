import type { BackgroundLayer, EffectParams } from "./types";
import { DEFAULT_PARAMS } from "./types";

interface WaveSource {
  x: number;
  y: number;
  freq: number;
  phase: number;
  hueOffset: number;
}

export class WaveInterference implements BackgroundLayer {
  private sources: WaveSource[] = [];
  private baseHue: number;

  constructor(w: number, h: number, color = "200") {
    this.baseHue = parseFloat(color) || 200;
    this.init(w, h);
  }

  private init(w: number, h: number) {
    this.sources = [];
    for (let i = 0; i < 4; i++) {
      this.sources.push({
        x: Math.random() * w,
        y: Math.random() * h,
        freq: 0.01 + Math.random() * 0.02,
        phase: Math.random() * Math.PI * 2,
        hueOffset: i * 25,
      });
    }
  }

  resize(w: number, h: number) { this.init(w, h); }

  render(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, params: EffectParams = DEFAULT_PARAMS) {
    const t = time * 0.001;
    const intensity = params.intensity / 50;
    const scale = params.scale;
    const turb = params.turbulence / 50;
    const step = Math.max(4, Math.round(8 / scale));

    // Move sources slowly
    for (const src of this.sources) {
      src.x += Math.sin(t * 0.3 + src.phase) * 0.5 * turb;
      src.y += Math.cos(t * 0.25 + src.phase) * 0.5 * turb;
    }

    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        let val = 0;
        let hueShift = 0;
        for (const src of this.sources) {
          const dx = x - src.x;
          const dy = y - src.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const wave = Math.sin(dist * src.freq * scale + t * 2 + src.phase);
          val += wave;
          hueShift += wave * src.hueOffset;
        }
        val /= this.sources.length;
        const normalized = (val + 1) * 0.5;
        const hue = this.baseHue + hueShift / this.sources.length;
        const alpha = normalized * 0.25 * intensity;

        if (alpha > 0.02) {
          ctx.fillStyle = `hsla(${hue}, 70%, ${40 + normalized * 30}%, ${alpha})`;
          ctx.fillRect(x, y, step, step);
        }
      }
    }

    // Draw concentric rings at sources
    for (const src of this.sources) {
      for (let r = 0; r < 5; r++) {
        const radius = ((t * 50 + r * 60) * scale) % (Math.max(width, height) * 0.7);
        const alpha = (1 - radius / (Math.max(width, height) * 0.7)) * 0.06 * intensity;
        if (alpha > 0) {
          ctx.beginPath();
          ctx.arc(src.x, src.y, radius, 0, Math.PI * 2);
          ctx.strokeStyle = `hsla(${this.baseHue + src.hueOffset}, 60%, 55%, ${alpha})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }
  }
}
