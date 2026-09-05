import type { BackgroundLayer, EffectParams } from "./types";
import { DEFAULT_PARAMS } from "./types";

interface Boid { x: number; y: number; vx: number; vy: number; hue: number; }

export class FlockingBoids implements BackgroundLayer {
  private boids: Boid[] = [];
  private w: number; private h: number;
  private baseHue: number;

  constructor(w: number, h: number, color = "160") {
    this.w = w; this.h = h;
    this.baseHue = parseInt(color) || 160;
    this.init(120);
  }

  private init(count: number) {
    this.boids = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      this.boids.push({ x: Math.random() * this.w, y: Math.random() * this.h, vx: Math.cos(angle) * 1.5, vy: Math.sin(angle) * 1.5, hue: Math.random() * 30 });
    }
  }

  resize(w: number, h: number) { this.w = w; this.h = h; }

  render(ctx: CanvasRenderingContext2D, width: number, height: number, _time: number, params: EffectParams = DEFAULT_PARAMS) {
    const iMul = params.intensity / 50;
    const sMul = params.scale;
    const tMul = params.turbulence / 50;
    const visualRange = 60 * sMul;
    const maxSpeed = 2.5 * iMul;
    const targetCount = Math.floor(120 * iMul);
    while (this.boids.length < targetCount) { const a = Math.random()*Math.PI*2; this.boids.push({ x: Math.random()*width, y: Math.random()*height, vx: Math.cos(a)*1.5, vy: Math.sin(a)*1.5, hue: Math.random()*30 }); }
    if (this.boids.length > targetCount) this.boids.length = targetCount;

    for (const b of this.boids) {
      let sx=0,sy=0,sc=0, ax=0,ay=0,ac=0, cx=0,cy=0,cc=0;
      for (const o of this.boids) {
        if (o === b) continue;
        const dx = o.x-b.x, dy = o.y-b.y, d = Math.sqrt(dx*dx+dy*dy);
        if (d < visualRange) {
          // Alignment
          ax += o.vx; ay += o.vy; ac++;
          // Cohesion
          cx += o.x; cy += o.y; cc++;
          // Separation
          if (d < visualRange * 0.4) { sx -= dx/d; sy -= dy/d; sc++; }
        }
      }
      if (ac > 0) { b.vx += ((ax/ac)-b.vx)*0.05*tMul; b.vy += ((ay/ac)-b.vy)*0.05*tMul; }
      if (cc > 0) { b.vx += ((cx/cc)-b.x)*0.001*tMul; b.vy += ((cy/cc)-b.y)*0.001*tMul; }
      if (sc > 0) { b.vx += sx*0.05*tMul; b.vy += sy*0.05*tMul; }

      // Edge steering
      const margin = 50;
      if (b.x < margin) b.vx += 0.3; if (b.x > width-margin) b.vx -= 0.3;
      if (b.y < margin) b.vy += 0.3; if (b.y > height-margin) b.vy -= 0.3;

      const speed = Math.sqrt(b.vx*b.vx+b.vy*b.vy);
      if (speed > maxSpeed) { b.vx *= maxSpeed/speed; b.vy *= maxSpeed/speed; }
      b.x += b.vx; b.y += b.vy;

      // Draw boid as triangle
      const angle = Math.atan2(b.vy, b.vx);
      const sz = 5 * sMul;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(sz*2, 0);
      ctx.lineTo(-sz, -sz);
      ctx.lineTo(-sz, sz);
      ctx.closePath();
      ctx.fillStyle = `hsla(${this.baseHue+b.hue}, 70%, 60%, ${0.7*iMul})`;
      ctx.fill();
      ctx.restore();
    }
  }
}
