import type { BackgroundLayer, EffectParams } from "./types";
import { DEFAULT_PARAMS } from "./types";

interface SprayParticle {
  x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number;
}

export class TidalWave implements BackgroundLayer {
  private baseHue: number;
  private spray: SprayParticle[] = [];
  private w: number;
  private h: number;

  constructor(w: number, h: number, color?: string) {
    this.w = w;
    this.h = h;
    this.baseHue = color ? parseInt(color, 10) || 200 : 200;
    this.initSpray(w, h);
  }

  private initSpray(w: number, h: number) {
    this.spray = [];
    for (let i = 0; i < 60; i++) {
      this.spray.push({
        x: Math.random() * w, y: Math.random() * h * 0.3 + h * 0.4,
        vx: (Math.random() - 0.5) * 2, vy: -Math.random() * 3 - 1,
        life: 0, maxLife: 40 + Math.random() * 60, size: 1 + Math.random() * 3,
      });
    }
  }

  resize(w: number, h: number) { this.w = w; this.h = h; this.initSpray(w, h); }

  render(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, params: EffectParams = DEFAULT_PARAMS) {
    const t = time * 0.0005;
    const intensity = params.intensity / 50;
    const scale = params.scale;
    const turb = params.turbulence / 50;

    // Deep water gradient
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, `hsla(${this.baseHue + 20}, 60%, 8%, 1)`);
    grad.addColorStop(0.5, `hsla(${this.baseHue}, 70%, 15%, 1)`);
    grad.addColorStop(1, `hsla(${this.baseHue - 10}, 80%, 25%, 1)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Draw multiple wave layers
    for (let w = 0; w < 5; w++) {
      const waveY = height * (0.35 + w * 0.12);
      const amp = (30 + w * 15) * scale * intensity;
      const freq = (0.003 + w * 0.001) / scale;
      const speed = t * (1.5 - w * 0.2);
      const alpha = 0.15 + w * 0.05;

      ctx.beginPath();
      ctx.moveTo(0, height);
      for (let x = 0; x <= width; x += 4) {
        const y = waveY
          + Math.sin(x * freq + speed) * amp
          + Math.sin(x * freq * 2.3 + speed * 1.7) * amp * 0.3 * turb
          + Math.cos(x * freq * 0.7 - speed * 0.5) * amp * 0.2;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(width, height);
      ctx.closePath();

      const wGrad = ctx.createLinearGradient(0, waveY - amp, 0, waveY + amp * 2);
      wGrad.addColorStop(0, `hsla(${this.baseHue + w * 10}, 70%, ${40 + w * 5}%, ${alpha})`);
      wGrad.addColorStop(0.5, `hsla(${this.baseHue + w * 5}, 60%, ${30 + w * 3}%, ${alpha * 0.8})`);
      wGrad.addColorStop(1, `hsla(${this.baseHue}, 50%, 20%, ${alpha * 0.5})`);
      ctx.fillStyle = wGrad;
      ctx.fill();

      // Foam on crests
      if (w < 3) {
        for (let x = 0; x < width; x += 8) {
          const y = waveY + Math.sin(x * freq + speed) * amp;
          const foamAlpha = Math.max(0, -Math.sin(x * freq + speed)) * 0.4 * intensity;
          if (foamAlpha > 0.05) {
            ctx.fillStyle = `rgba(255,255,255,${foamAlpha})`;
            ctx.fillRect(x, y - 2, 6 + Math.random() * 4, 2 + Math.random() * 2);
          }
        }
      }
    }

    // Spray particles
    for (const p of this.spray) {
      p.life++;
      if (p.life > p.maxLife) {
        p.x = Math.random() * width;
        p.y = height * 0.5 + Math.sin(p.x * 0.01 + t) * 30 * scale;
        p.vx = (Math.random() - 0.5) * 3 * turb;
        p.vy = -Math.random() * 4 * intensity - 1;
        p.life = 0;
      }
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05;
      const a = (1 - p.life / p.maxLife) * 0.6 * intensity;
      ctx.fillStyle = `rgba(200,230,255,${a})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * scale, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
