import type { BackgroundLayer, EffectParams } from "./types";
import { DEFAULT_PARAMS } from "./types";

interface Petal {
  x: number; y: number; size: number; rotation: number;
  rotSpeed: number; vx: number; vy: number; wobblePhase: number;
  hueShift: number; opacity: number;
}

export class CherryBlossom implements BackgroundLayer {
  private baseHue: number;
  private petals: Petal[] = [];
  private w = 0; private h = 0;

  constructor(w: number, h: number, color?: string) {
    this.baseHue = color ? parseInt(color) || 340 : 340;
    this.w = w; this.h = h;
    this.init();
  }

  private init() {
    this.petals = [];
    for (let i = 0; i < 80; i++) this.petals.push(this.spawn(true));
  }

  private spawn(anywhere = false): Petal {
    return {
      x: Math.random() * this.w,
      y: anywhere ? Math.random() * this.h : -20,
      size: 4 + Math.random() * 8,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.03,
      vx: (Math.random() - 0.5) * 0.3,
      vy: 0.3 + Math.random() * 0.6,
      wobblePhase: Math.random() * Math.PI * 2,
      hueShift: Math.random() * 20 - 10,
      opacity: 0.4 + Math.random() * 0.4,
    };
  }

  resize(w: number, h: number) { this.w = w; this.h = h; }

  render(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, params: EffectParams = DEFAULT_PARAMS) {
    const t = time * 0.001;
    const scale = params.scale;
    const intensity = params.intensity / 50;
    const wind = Math.sin(t * 0.2) * params.turbulence * 0.02;

    // Warm glow at bottom
    const glow = ctx.createLinearGradient(0, height * 0.7, 0, height);
    glow.addColorStop(0, `hsla(${this.baseHue}, 40%, 70%, 0)`);
    glow.addColorStop(1, `hsla(${this.baseHue}, 40%, 70%, ${0.05 * intensity})`);
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    for (const p of this.petals) {
      p.x += p.vx + wind + Math.sin(t + p.wobblePhase) * 0.5;
      p.y += p.vy;
      p.rotation += p.rotSpeed;

      if (p.y > height + 20 || p.x < -30 || p.x > width + 30) {
        Object.assign(p, this.spawn());
      }

      const s = p.size * scale;
      const hue = this.baseHue + p.hueShift;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.beginPath();
      ctx.ellipse(0, 0, s, s * 0.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hue}, 60%, 80%, ${p.opacity * intensity})`;
      ctx.fill();
      ctx.restore();
    }
  }
}
