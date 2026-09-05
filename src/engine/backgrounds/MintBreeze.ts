import type { BackgroundLayer, EffectParams } from "./types";
import { DEFAULT_PARAMS } from "./types";

interface Stream {
  y: number; amplitude: number; frequency: number;
  speed: number; thickness: number; hueShift: number; opacity: number;
}

interface Particle {
  x: number; y: number; streamIdx: number; speed: number; size: number; opacity: number;
}

export class MintBreeze implements BackgroundLayer {
  private baseHue: number;
  private streams: Stream[] = [];
  private particles: Particle[] = [];
  private w = 0; private h = 0;

  constructor(w: number, h: number, color?: string) {
    this.baseHue = color ? parseInt(color) || 160 : 160;
    this.w = w; this.h = h;
    this.init();
  }

  private init() {
    this.streams = [];
    for (let i = 0; i < 8; i++) {
      this.streams.push({
        y: (i + 0.5) / 8 * this.h,
        amplitude: 20 + Math.random() * 40,
        frequency: 0.002 + Math.random() * 0.004,
        speed: 0.5 + Math.random() * 1.5,
        thickness: 15 + Math.random() * 30,
        hueShift: Math.random() * 20 - 10,
        opacity: 0.1 + Math.random() * 0.15,
      });
    }
    this.particles = [];
    for (let i = 0; i < 50; i++) {
      this.particles.push({
        x: Math.random() * this.w,
        y: 0, streamIdx: Math.floor(Math.random() * this.streams.length),
        speed: 1 + Math.random() * 2, size: 1.5 + Math.random() * 3,
        opacity: 0.3 + Math.random() * 0.4,
      });
    }
  }

  resize(w: number, h: number) { this.w = w; this.h = h; this.init(); }

  render(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, params: EffectParams = DEFAULT_PARAMS) {
    const t = time * 0.001;
    const scale = params.scale;
    const intensity = params.intensity / 50;

    // Draw streams
    for (const s of this.streams) {
      const hue = this.baseHue + s.hueShift;
      ctx.beginPath();
      for (let x = 0; x <= width; x += 4) {
        const yOff = Math.sin((x * s.frequency) + t * s.speed) * s.amplitude * scale;
        if (x === 0) ctx.moveTo(x, s.y + yOff);
        else ctx.lineTo(x, s.y + yOff);
      }
      ctx.strokeStyle = `hsla(${hue}, 50%, 75%, ${s.opacity * intensity})`;
      ctx.lineWidth = s.thickness * scale;
      ctx.lineCap = "round";
      ctx.stroke();
    }

    // Draw particles along streams
    for (const p of this.particles) {
      const s = this.streams[p.streamIdx];
      p.x += p.speed * intensity;
      if (p.x > width) p.x = -5;
      const yOff = Math.sin((p.x * s.frequency) + t * s.speed) * s.amplitude * scale;
      const py = s.y + yOff;
      ctx.beginPath();
      ctx.arc(p.x, py, p.size * scale, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${this.baseHue}, 60%, 85%, ${p.opacity * intensity})`;
      ctx.fill();
    }
  }
}
