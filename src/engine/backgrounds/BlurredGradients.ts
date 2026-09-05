import type { BackgroundLayer, EffectParams } from "./types";
import { DEFAULT_PARAMS } from "./types";

interface Blob {
  x: number; y: number;
  vx: number; vy: number;
  radius: number; hueOffset: number;
  phase: number;
}

export class BlurredGradients implements BackgroundLayer {
  private blobs: Blob[] = [];
  private baseHue: number;
  private w: number; private h: number;

  constructor(w: number, h: number, color?: string) {
    this.baseHue = parseInt(color || "260", 10);
    this.w = w; this.h = h;
    this.init();
  }

  private init() {
    this.blobs = Array.from({ length: 6 }, (_, i) => ({
      x: Math.random() * this.w,
      y: Math.random() * this.h,
      vx: (Math.random() - 0.5) * 0.8,
      vy: (Math.random() - 0.5) * 0.8,
      radius: 150 + Math.random() * 250,
      hueOffset: i * 40,
      phase: Math.random() * Math.PI * 2,
    }));
  }

  resize(w: number, h: number) { this.w = w; this.h = h; }

  render(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, params: EffectParams = DEFAULT_PARAMS) {
    const t = time * 0.0005 * (params.intensity / 50);
    const chaos = params.turbulence / 50;
    const drift = ((params.direction - 180) / 360) * 2;

    for (const blob of this.blobs) {
      // organic floating motion
      blob.x += (Math.sin(t + blob.phase) * chaos + drift) * 0.5;
      blob.y += (Math.cos(t * 0.7 + blob.phase) * chaos) * 0.5;

      // soft bounce
      if (blob.x < -blob.radius) blob.x = width + blob.radius;
      if (blob.x > width + blob.radius) blob.x = -blob.radius;
      if (blob.y < -blob.radius) blob.y = height + blob.radius;
      if (blob.y > height + blob.radius) blob.y = -blob.radius;

      const r = blob.radius * params.scale;
      const breathe = 1 + 0.15 * Math.sin(t * 1.5 + blob.phase);
      const finalR = r * breathe;

      const hue = (this.baseHue + blob.hueOffset + Math.sin(t + blob.phase) * 20) % 360;

      const grd = ctx.createRadialGradient(blob.x, blob.y, 0, blob.x, blob.y, finalR);
      grd.addColorStop(0, `hsla(${hue}, 80%, 60%, 0.4)`);
      grd.addColorStop(0.4, `hsla(${hue + 30}, 70%, 50%, 0.2)`);
      grd.addColorStop(0.7, `hsla(${hue + 60}, 60%, 40%, 0.08)`);
      grd.addColorStop(1, `hsla(${hue}, 50%, 30%, 0)`);

      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(blob.x, blob.y, finalR, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
