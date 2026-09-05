import type { BackgroundLayer, EffectParams } from "./types";
import { DEFAULT_PARAMS } from "./types";

interface Ember {
  x: number; y: number; vx: number; vy: number;
  size: number; life: number; maxLife: number; hue: number; wobble: number;
}

export class FireEmbers implements BackgroundLayer {
  private embers: Ember[] = [];
  private count = 120;
  private color: string;

  constructor(width: number, height: number, color = "15, 90%, 55%") {
    this.color = color;
    this.init(width, height);
  }

  private spawn(w: number, h: number, scatter = false): Ember {
    const baseHue = parseInt(this.color) || 15;
    return {
      x: Math.random() * w, y: scatter ? Math.random() * h : h + Math.random() * 40,
      vx: (Math.random() - 0.5) * 0.8, vy: -Math.random() * 1.5 - 0.5,
      size: Math.random() * 3 + 1, life: scatter ? Math.random() * 200 : 0,
      maxLife: Math.random() * 250 + 100, hue: baseHue + Math.random() * 30 - 15,
      wobble: Math.random() * Math.PI * 2,
    };
  }

  private init(w: number, h: number) { this.embers = Array.from({ length: this.count }, () => this.spawn(w, h, true)); }
  resize(w: number, h: number) { this.init(w, h); }

  render(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, params: EffectParams = DEFAULT_PARAMS) {
    const intensityMul = params.intensity / 50;
    const scaleMul = params.scale;
    const turbMul = params.turbulence / 50;
    const dirRad = (params.direction * Math.PI) / 180;
    const active = Math.floor(this.count * intensityMul);

    for (let idx = 0; idx < Math.min(active, this.embers.length); idx++) {
      const e = this.embers[idx];
      e.x += e.vx + Math.sin(time * 0.002 + e.wobble) * 0.3 * turbMul;
      e.x += Math.sin(dirRad) * 0.3;
      e.y += e.vy + Math.cos(dirRad) * 0.3;
      e.vy *= 0.998;
      e.life++;

      if (e.life > e.maxLife || e.y < -20) Object.assign(e, this.spawn(width, height));

      const progress = e.life / e.maxLife;
      const fade = progress < 0.1 ? progress / 0.1 : Math.pow(1 - progress, 2);
      const flicker = 0.7 + 0.3 * Math.sin(time * 0.01 + e.wobble * 5);
      const alpha = fade * flicker;
      const r = e.size * scaleMul * (1 - progress * 0.5);

      const grad = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, r * 3);
      grad.addColorStop(0, `hsla(${e.hue + 20}, 100%, 85%, ${alpha})`);
      grad.addColorStop(0.3, `hsla(${e.hue}, 95%, 60%, ${alpha * 0.7})`);
      grad.addColorStop(0.7, `hsla(${e.hue - 10}, 80%, 40%, ${alpha * 0.3})`);
      grad.addColorStop(1, `hsla(${e.hue - 20}, 70%, 30%, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(e.x, e.y, r * 3, 0, Math.PI * 2); ctx.fill();
    }

    const baseHue = parseInt(this.color) || 15;
    const haze = ctx.createLinearGradient(0, height, 0, height * 0.7);
    haze.addColorStop(0, `hsla(${baseHue}, 80%, 40%, 0.08)`);
    haze.addColorStop(1, "transparent");
    ctx.fillStyle = haze;
    ctx.fillRect(0, height * 0.7, width, height * 0.3);
  }
}
