import type { BackgroundLayer, EffectParams } from "./types";
import { DEFAULT_PARAMS } from "./types";

interface Blob { x: number; y: number; radius: number; targetRadius: number; hue: number; sat: number; phase: number; speed: number; }

export class WaterColor implements BackgroundLayer {
  private blobs: Blob[] = [];
  private w: number; private h: number;
  private baseHue: number;

  constructor(w: number, h: number, color = "30") {
    this.w = w; this.h = h;
    this.baseHue = parseInt(color) || 30;
    this.initBlobs(12);
  }

  private initBlobs(count: number) {
    this.blobs = [];
    for (let i = 0; i < count; i++) {
      const r = 40 + Math.random() * 80;
      this.blobs.push({
        x: Math.random() * this.w, y: Math.random() * this.h,
        radius: r * 0.3, targetRadius: r,
        hue: Math.random() * 60, sat: 40 + Math.random() * 30,
        phase: Math.random() * Math.PI * 2,
        speed: 0.2 + Math.random() * 0.5,
      });
    }
  }

  resize(w: number, h: number) { this.w = w; this.h = h; }

  render(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, params: EffectParams = DEFAULT_PARAMS) {
    const iMul = params.intensity / 50;
    const sMul = params.scale;
    const tMul = params.turbulence / 50;
    const targetCount = Math.floor(12 * iMul);
    while (this.blobs.length < targetCount) { const r=40+Math.random()*80; this.blobs.push({ x: Math.random()*width, y: Math.random()*height, radius: r*0.3, targetRadius: r, hue: Math.random()*60, sat: 40+Math.random()*30, phase: Math.random()*Math.PI*2, speed: 0.2+Math.random()*0.5 }); }
    if (this.blobs.length > targetCount) this.blobs.length = targetCount;

    for (const blob of this.blobs) {
      // Grow towards target
      blob.radius += (blob.targetRadius - blob.radius) * 0.002 * iMul;
      // Drift
      blob.x += Math.sin(time * 0.0003 + blob.phase) * 0.3 * tMul;
      blob.y += Math.cos(time * 0.0004 + blob.phase * 1.3) * 0.2 * tMul;

      const r = blob.radius * sMul;
      const hue = this.baseHue + blob.hue;

      // Wet edge — multiple translucent layers
      for (let layer = 3; layer >= 0; layer--) {
        const lr = r * (1 + layer * 0.15);
        const wobbleX = Math.sin(time * 0.001 + blob.phase + layer) * tMul * 5;
        const wobbleY = Math.cos(time * 0.0012 + blob.phase * 0.7 + layer) * tMul * 4;
        const grad = ctx.createRadialGradient(blob.x + wobbleX, blob.y + wobbleY, lr * 0.1, blob.x + wobbleX, blob.y + wobbleY, lr);
        const alpha = (0.06 - layer * 0.01) * iMul;
        grad.addColorStop(0, `hsla(${hue}, ${blob.sat}%, 55%, ${alpha})`);
        grad.addColorStop(0.6, `hsla(${hue + 10}, ${blob.sat - 10}%, 60%, ${alpha * 0.5})`);
        grad.addColorStop(1, `hsla(${hue}, ${blob.sat}%, 50%, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        // Organic shape using bezier
        const segs = 8;
        for (let i = 0; i <= segs; i++) {
          const a = (i / segs) * Math.PI * 2;
          const rr = lr * (0.85 + Math.sin(a * 3 + time * 0.001 + blob.phase) * 0.15 * tMul);
          const px = blob.x + wobbleX + Math.cos(a) * rr;
          const py = blob.y + wobbleY + Math.sin(a) * rr;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
      }

      // Pigment concentration at center
      ctx.beginPath();
      ctx.arc(blob.x, blob.y, r * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hue}, ${blob.sat + 15}%, 45%, ${0.08 * iMul})`;
      ctx.fill();
    }
  }
}
