import type { BackgroundLayer, EffectParams } from "./types";
import { DEFAULT_PARAMS } from "./types";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  baseX: number;
  baseY: number;
}

export class InteractiveParticles implements BackgroundLayer {
  private particles: Particle[] = [];
  private baseHue: number;
  private w: number;
  private h: number;

  constructor(w: number, h: number, color?: string) {
    this.baseHue = parseInt(color || "200", 10);
    this.w = w;
    this.h = h;
    this.init();
  }

  private init() {
    const count = 120;
    this.particles = Array.from({ length: count }, () => {
      const x = Math.random() * this.w;
      const y = Math.random() * this.h;
      return {
        x,
        y,
        baseX: x,
        baseY: y,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: 1 + Math.random() * 3,
        opacity: 0.3 + Math.random() * 0.7,
      };
    });
  }

  resize(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.init();
  }

  render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    time: number,
    params: EffectParams = DEFAULT_PARAMS,
  ) {
    const count = Math.floor(this.particles.length * (params.intensity / 50));
    const drift = ((params.direction - 180) / 180) * 0.3;
    const chaos = params.turbulence / 100;
    const t = time * 0.001;

    for (let i = 0; i < Math.min(count, this.particles.length); i++) {
      const p = this.particles[i];

      // organic motion with turbulence
      p.vx += Math.sin(t + i * 0.1) * chaos * 0.1 + drift * 0.02;
      p.vy += Math.cos(t + i * 0.13) * chaos * 0.1;
      p.vx *= 0.98;
      p.vy *= 0.98;
      p.x += p.vx;
      p.y += p.vy;

      // wrap
      if (p.x < -10) p.x = width + 10;
      if (p.x > width + 10) p.x = -10;
      if (p.y < -10) p.y = height + 10;
      if (p.y > height + 10) p.y = -10;

      const sz = p.size * params.scale;
      const pulse = 0.7 + 0.3 * Math.sin(t * 2 + i);

      // glow
      const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, sz * 4);
      grd.addColorStop(
        0,
        `hsla(${this.baseHue + (i % 30)}, 80%, 70%, ${p.opacity * pulse * 0.3})`,
      );
      grd.addColorStop(1, `hsla(${this.baseHue}, 80%, 50%, 0)`);
      ctx.fillStyle = grd;
      ctx.fillRect(p.x - sz * 4, p.y - sz * 4, sz * 8, sz * 8);

      // core
      ctx.beginPath();
      ctx.arc(p.x, p.y, sz * pulse, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${this.baseHue + (i % 40)}, 90%, 80%, ${p.opacity * pulse})`;
      ctx.fill();
    }

    // connection lines
    const maxDist = 100 * params.scale;
    ctx.lineWidth = 0.3;
    for (let i = 0; i < Math.min(count, 60); i++) {
      for (let j = i + 1; j < Math.min(count, 60); j++) {
        const a = this.particles[i],
          b = this.particles[j];
        const dx = a.x - b.x,
          dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < maxDist) {
          const alpha = (1 - dist / maxDist) * 0.2;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `hsla(${this.baseHue}, 60%, 60%, ${alpha})`;
          ctx.stroke();
        }
      }
    }
  }
}
