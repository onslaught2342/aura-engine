import type { BackgroundLayer, EffectParams } from "./types";
import { DEFAULT_PARAMS } from "./types";

interface Shape {
  x: number;
  y: number;
  size: number;
  rotation: number;
  rotSpeed: number;
  type: number; // 0=triangle, 1=hexagon, 2=star, 3=circle-ring, 4=cross
  opacity: number;
  hueOffset: number;
  vx: number;
  vy: number;
  phase: number;
}

export class AnimatedShapes implements BackgroundLayer {
  private shapes: Shape[] = [];
  private baseHue: number;
  private w: number;
  private h: number;

  constructor(w: number, h: number, color?: string) {
    this.baseHue = parseInt(color || "320", 10);
    this.w = w;
    this.h = h;
    this.init();
  }

  private init() {
    this.shapes = Array.from({ length: 30 }, () => ({
      x: Math.random() * this.w,
      y: Math.random() * this.h,
      size: 10 + Math.random() * 40,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.02,
      type: Math.floor(Math.random() * 5),
      opacity: 0.15 + Math.random() * 0.35,
      hueOffset: Math.random() * 60,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      phase: Math.random() * Math.PI * 2,
    }));
  }

  resize(w: number, h: number) {
    this.w = w;
    this.h = h;
  }

  private drawTriangle(ctx: CanvasRenderingContext2D, sz: number) {
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
      const method = i === 0 ? "moveTo" : "lineTo";
      ctx[method](Math.cos(a) * sz, Math.sin(a) * sz);
    }
    ctx.closePath();
  }

  private drawHexagon(ctx: CanvasRenderingContext2D, sz: number) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const method = i === 0 ? "moveTo" : "lineTo";
      ctx[method](Math.cos(a) * sz, Math.sin(a) * sz);
    }
    ctx.closePath();
  }

  private drawStar(ctx: CanvasRenderingContext2D, sz: number) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 === 0 ? sz : sz * 0.4;
      const method = i === 0 ? "moveTo" : "lineTo";
      ctx[method](Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
  }

  private drawCross(ctx: CanvasRenderingContext2D, sz: number) {
    const t = sz * 0.3;
    ctx.beginPath();
    ctx.moveTo(-t, -sz);
    ctx.lineTo(t, -sz);
    ctx.lineTo(t, -t);
    ctx.lineTo(sz, -t);
    ctx.lineTo(sz, t);
    ctx.lineTo(t, t);
    ctx.lineTo(t, sz);
    ctx.lineTo(-t, sz);
    ctx.lineTo(-t, t);
    ctx.lineTo(-sz, t);
    ctx.lineTo(-sz, -t);
    ctx.lineTo(-t, -t);
    ctx.closePath();
  }

  render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    time: number,
    params: EffectParams = DEFAULT_PARAMS,
  ) {
    const t = time * 0.001;
    const drift = ((params.direction - 180) / 180) * 0.5;
    const count = Math.floor(this.shapes.length * (params.intensity / 50));

    for (let i = 0; i < Math.min(count, this.shapes.length); i++) {
      const s = this.shapes[i];
      s.rotation += s.rotSpeed * (params.turbulence / 50);
      s.x += s.vx + drift * 0.1;
      s.y += s.vy;

      // wrap
      if (s.x < -60) s.x += width + 120;
      if (s.x > width + 60) s.x -= width + 120;
      if (s.y < -60) s.y += height + 120;
      if (s.y > height + 60) s.y -= height + 120;

      const sz = s.size * params.scale;
      const pulse = 0.8 + 0.2 * Math.sin(t * 1.5 + s.phase);
      const hue = (this.baseHue + s.hueOffset) % 360;

      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rotation);

      // draw shape
      switch (s.type) {
        case 0:
          this.drawTriangle(ctx, sz * pulse);
          break;
        case 1:
          this.drawHexagon(ctx, sz * pulse);
          break;
        case 2:
          this.drawStar(ctx, sz * pulse);
          break;
        case 3:
          ctx.beginPath();
          ctx.arc(0, 0, sz * pulse, 0, Math.PI * 2);
          break;
        case 4:
          this.drawCross(ctx, sz * pulse);
          break;
      }

      ctx.strokeStyle = `hsla(${hue}, 80%, 65%, ${s.opacity * pulse})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // soft glow fill
      ctx.fillStyle = `hsla(${hue}, 70%, 55%, ${s.opacity * pulse * 0.1})`;
      ctx.fill();

      ctx.restore();
    }
  }
}
