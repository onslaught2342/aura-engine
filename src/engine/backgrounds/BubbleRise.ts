import type { BackgroundLayer, EffectParams } from "./types";
import { DEFAULT_PARAMS } from "./types";

interface Bubble { x: number; y: number; r: number; speed: number; wobblePhase: number; hueShift: number; opacity: number; }

export class BubbleRise implements BackgroundLayer {
  private bubbles: Bubble[] = [];
  private w: number; private h: number;
  private baseHue: number;

  constructor(w: number, h: number, color = "200") {
    this.w = w; this.h = h;
    this.baseHue = parseInt(color) || 200;
    this.init(60);
  }

  private init(count: number) {
    this.bubbles = [];
    for (let i = 0; i < count; i++) this.bubbles.push(this.spawn());
  }

  private spawn(): Bubble {
    return {
      x: Math.random() * this.w,
      y: this.h + Math.random() * 100,
      r: 5 + Math.random() * 30,
      speed: 0.3 + Math.random() * 1.2,
      wobblePhase: Math.random() * Math.PI * 2,
      hueShift: Math.random() * 40 - 20,
      opacity: 0.15 + Math.random() * 0.35,
    };
  }

  resize(w: number, h: number) { this.w = w; this.h = h; }

  render(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, params: EffectParams = DEFAULT_PARAMS) {
    const intensityMul = params.intensity / 50;
    const scaleMul = params.scale;
    const turbMul = params.turbulence / 50;
    const targetCount = Math.floor(60 * intensityMul);
    while (this.bubbles.length < targetCount) this.bubbles.push(this.spawn());
    if (this.bubbles.length > targetCount) this.bubbles.length = targetCount;

    for (const b of this.bubbles) {
      b.y -= b.speed * intensityMul;
      b.x += Math.sin(time * 0.001 + b.wobblePhase) * turbMul * 1.5;
      if (b.y < -b.r * 2) { Object.assign(b, this.spawn()); }

      const r = b.r * scaleMul;
      const hue = this.baseHue + b.hueShift;

      // Main bubble
      ctx.globalAlpha = b.opacity;
      ctx.beginPath();
      ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
      const grad = ctx.createRadialGradient(b.x - r * 0.3, b.y - r * 0.3, r * 0.1, b.x, b.y, r);
      grad.addColorStop(0, `hsla(${hue}, 70%, 80%, 0.6)`);
      grad.addColorStop(0.5, `hsla(${hue}, 60%, 60%, 0.2)`);
      grad.addColorStop(1, `hsla(${hue}, 50%, 50%, 0.05)`);
      ctx.fillStyle = grad;
      ctx.fill();

      // Rim highlight
      ctx.beginPath();
      ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
      ctx.strokeStyle = `hsla(${hue}, 80%, 85%, ${0.3 * b.opacity})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Refraction highlight
      ctx.beginPath();
      ctx.arc(b.x - r * 0.25, b.y - r * 0.25, r * 0.2, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(0, 0%, 100%, ${0.4 * b.opacity})`;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
