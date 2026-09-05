import type { BackgroundLayer, EffectParams } from "./types";
import { DEFAULT_PARAMS } from "./types";

interface Splash {
  x: number; y: number; birth: number; maxRadius: number;
  rings: number; hueShift: number;
}

interface Droplet {
  x: number; y: number; vx: number; vy: number;
  birth: number; life: number; size: number;
}

export class FreshSplash implements BackgroundLayer {
  private baseHue: number;
  private splashes: Splash[] = [];
  private droplets: Droplet[] = [];
  private lastSpawn = 0;
  private w = 0; private h = 0;

  constructor(w: number, h: number, color?: string) {
    this.baseHue = color ? parseInt(color) || 190 : 190;
    this.w = w; this.h = h;
  }

  resize(w: number, h: number) { this.w = w; this.h = h; }

  render(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, params: EffectParams = DEFAULT_PARAMS) {
    const t = time * 0.001;
    const scale = params.scale;
    const intensity = params.intensity / 50;

    // Spawn splashes
    if (t - this.lastSpawn > 0.4 / intensity) {
      const x = Math.random() * width, y = Math.random() * height;
      this.splashes.push({
        x, y, birth: t, maxRadius: (60 + Math.random() * 80) * scale,
        rings: 3 + Math.floor(Math.random() * 3),
        hueShift: Math.random() * 20 - 10,
      });
      // Arc droplets
      for (let i = 0; i < 4; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 2;
        this.droplets.push({
          x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 2,
          birth: t, life: 0.5 + Math.random() * 0.5, size: 1.5 + Math.random() * 2,
        });
      }
      this.lastSpawn = t;
    }

    // Remove old
    this.splashes = this.splashes.filter(s => (t - s.birth) * 80 < s.maxRadius);
    this.droplets = this.droplets.filter(d => t - d.birth < d.life);

    // Draw splashes
    for (const s of this.splashes) {
      const age = (t - s.birth) * 80;
      const progress = age / s.maxRadius;
      const hue = this.baseHue + s.hueShift;
      for (let r = 0; r < s.rings; r++) {
        const radius = age - r * 12 * scale;
        if (radius < 0) continue;
        const alpha = (1 - progress) * 0.35 * intensity * (1 - r / s.rings);
        ctx.beginPath();
        ctx.arc(s.x, s.y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(${hue}, 60%, 75%, ${alpha})`;
        ctx.lineWidth = (2.5 - r * 0.6) * scale;
        ctx.stroke();
      }
    }

    // Draw droplets
    for (const d of this.droplets) {
      const age = t - d.birth;
      d.x += d.vx; d.y += d.vy; d.vy += 0.15; // gravity
      const alpha = (1 - age / d.life) * 0.6 * intensity;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.size * scale, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${this.baseHue}, 70%, 80%, ${alpha})`;
      ctx.fill();
    }
  }
}
