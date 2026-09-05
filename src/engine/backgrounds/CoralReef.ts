import type { BackgroundLayer, EffectParams } from "./types";
import { DEFAULT_PARAMS } from "./types";

interface Plankton { x: number; y: number; speed: number; size: number; phase: number }

export class CoralReef implements BackgroundLayer {
  private baseHue: number;
  private plankton: Plankton[] = [];
  private branches: { x: number; angle: number; depth: number; hue: number }[] = [];

  constructor(w: number, h: number, color?: string) {
    this.baseHue = color ? parseFloat(color) || 170 : 170;
    this.init(w, h);
  }

  private init(w: number, h: number) {
    this.plankton = [];
    for (let i = 0; i < 80; i++) {
      this.plankton.push({
        x: Math.random() * w, y: Math.random() * h,
        speed: 0.2 + Math.random() * 0.5, size: 1 + Math.random() * 3,
        phase: Math.random() * Math.PI * 2,
      });
    }
    this.branches = [];
    const count = 5 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      this.branches.push({
        x: (w / (count + 1)) * (i + 1) + (Math.random() - 0.5) * 60,
        angle: -Math.PI / 2 + (Math.random() - 0.5) * 0.4,
        depth: 5 + Math.floor(Math.random() * 3),
        hue: (this.baseHue + i * 25) % 360,
      });
    }
  }

  resize(w: number, h: number) { this.init(w, h); }

  private drawBranch(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, len: number, depth: number, hue: number, time: number, scale: number) {
    if (depth <= 0 || len < 2) return;
    const sway = Math.sin(time * 0.0005 + x * 0.01) * 0.05;
    const endX = x + Math.cos(angle + sway) * len;
    const endY = y + Math.sin(angle + sway) * len;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = `hsla(${hue}, 60%, ${40 + depth * 5}%, 0.8)`;
    ctx.lineWidth = depth * 1.2 * scale;
    ctx.stroke();

    // Bioluminescent tip
    if (depth <= 2) {
      const pulse = 0.4 + 0.6 * Math.abs(Math.sin(time * 0.002 + x));
      const grad = ctx.createRadialGradient(endX, endY, 0, endX, endY, 6 * scale);
      grad.addColorStop(0, `hsla(${(hue + 120) % 360}, 100%, 80%, ${pulse * 0.7})`);
      grad.addColorStop(1, `hsla(${(hue + 120) % 360}, 100%, 50%, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(endX, endY, 6 * scale, 0, Math.PI * 2);
      ctx.fill();
    }

    const newLen = len * 0.7;
    const spread = 0.4 + (Math.sin(time * 0.001) * 0.1);
    this.drawBranch(ctx, endX, endY, angle - spread, newLen, depth - 1, (hue + 10) % 360, time, scale);
    this.drawBranch(ctx, endX, endY, angle + spread, newLen, depth - 1, (hue + 20) % 360, time, scale);
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, params: EffectParams = DEFAULT_PARAMS) {
    const scale = params.scale;

    // Draw coral branches from bottom
    for (const b of this.branches) {
      const baseLen = 30 + params.intensity * 0.8;
      this.drawBranch(ctx, b.x, height, b.angle, baseLen * scale, b.depth, b.hue, time, scale);
    }

    // Drifting plankton
    for (const p of this.plankton) {
      p.x += Math.sin(time * 0.001 + p.phase) * 0.3;
      p.y -= p.speed * 0.3;
      if (p.y < -10) { p.y = height + 10; p.x = Math.random() * width; }

      const pulse = 0.3 + 0.7 * Math.abs(Math.sin(time * 0.003 + p.phase));
      ctx.fillStyle = `hsla(${(this.baseHue + 100) % 360}, 80%, 75%, ${pulse * 0.5})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * scale, 0, Math.PI * 2);
      ctx.fill();
    }

    // Water caustics overlay
    const causticsAlpha = 0.05 + params.turbulence * 0.001;
    for (let i = 0; i < 12; i++) {
      const cx = width * 0.5 + Math.sin(time * 0.0003 + i * 1.2) * width * 0.4;
      const cy = height * 0.3 + Math.cos(time * 0.0004 + i * 0.9) * height * 0.3;
      const cr = 60 + Math.sin(time * 0.001 + i) * 20;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr);
      grad.addColorStop(0, `hsla(${this.baseHue}, 60%, 70%, ${causticsAlpha})`);
      grad.addColorStop(1, `hsla(${this.baseHue}, 60%, 50%, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, cr, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
