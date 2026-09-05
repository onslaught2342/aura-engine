import type { BackgroundLayer, EffectParams } from "./types";
import { DEFAULT_PARAMS } from "./types";

interface LayerParticle {
  x: number;
  y: number;
  size: number;
  opacity: number;
  depth: number; // 0-1, closer = larger/faster
  shape: number; // 0=circle, 1=square, 2=diamond
}

export class ParallaxField implements BackgroundLayer {
  private particles: LayerParticle[] = [];
  private baseHue: number;
  private w: number;
  private h: number;

  constructor(w: number, h: number, color?: string) {
    this.baseHue = parseInt(color || "180", 10);
    this.w = w;
    this.h = h;
    this.init();
  }

  private init() {
    this.particles = Array.from({ length: 150 }, () => ({
      x: Math.random() * this.w,
      y: Math.random() * this.h,
      size: 1 + Math.random() * 5,
      opacity: 0.2 + Math.random() * 0.6,
      depth: Math.random(),
      shape: Math.floor(Math.random() * 3),
    }));
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
    const t = time * 0.001;
    const angle = (params.direction * Math.PI) / 180;
    const baseSpeed = (params.intensity / 50) * 0.5;

    for (const p of this.particles) {
      // parallax: deeper particles move slower
      const speedFactor = 0.2 + p.depth * 0.8;
      p.x += Math.cos(angle) * baseSpeed * speedFactor;
      p.y += Math.sin(angle) * baseSpeed * speedFactor;

      // turbulence wobble
      const wobble = (params.turbulence / 100) * 2;
      p.x += Math.sin(t * 0.5 + p.depth * 10) * wobble * speedFactor;
      p.y += Math.cos(t * 0.3 + p.depth * 7) * wobble * speedFactor;

      // wrap
      if (p.x < -20) p.x += width + 40;
      if (p.x > width + 20) p.x -= width + 40;
      if (p.y < -20) p.y += height + 40;
      if (p.y > height + 20) p.y -= height + 40;

      const sz = p.size * params.scale * (0.3 + p.depth * 0.7);
      const hue = (this.baseHue + p.depth * 60) % 360;
      const lightness = 50 + p.depth * 30;
      const alpha = p.opacity * (0.3 + p.depth * 0.7);

      ctx.fillStyle = `hsla(${hue}, 70%, ${lightness}%, ${alpha})`;

      if (p.shape === 0) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, sz, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 1) {
        ctx.fillRect(p.x - sz, p.y - sz, sz * 2, sz * 2);
      } else {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-sz, -sz, sz * 2, sz * 2);
        ctx.restore();
      }

      // depth glow for close particles
      if (p.depth > 0.7) {
        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, sz * 3);
        grd.addColorStop(0, `hsla(${hue}, 80%, 70%, ${alpha * 0.2})`);
        grd.addColorStop(1, `hsla(${hue}, 80%, 50%, 0)`);
        ctx.fillStyle = grd;
        ctx.fillRect(p.x - sz * 3, p.y - sz * 3, sz * 6, sz * 6);
      }
    }
  }
}
