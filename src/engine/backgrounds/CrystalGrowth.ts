import type { BackgroundLayer, EffectParams } from "./types";
import { DEFAULT_PARAMS } from "./types";

interface Crystal {
  x: number; y: number; angle: number; length: number; width: number;
  hueOffset: number; growSpeed: number; phase: number; branches: number;
}

export class CrystalGrowth implements BackgroundLayer {
  private baseHue: number;
  private crystals: Crystal[] = [];

  constructor(w: number, h: number, color?: string) {
    this.baseHue = color ? parseInt(color, 10) || 180 : 180;
    this.init(w, h);
  }

  private init(w: number, h: number) {
    this.crystals = [];
    const count = 6 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      this.crystals.push({
        x: Math.random() * w, y: h * 0.6 + Math.random() * h * 0.4,
        angle: -Math.PI / 2 + (Math.random() - 0.5) * 0.8,
        length: 60 + Math.random() * 120, width: 8 + Math.random() * 20,
        hueOffset: Math.random() * 60 - 30, growSpeed: 0.5 + Math.random() * 1.5,
        phase: Math.random() * Math.PI * 2, branches: 2 + Math.floor(Math.random() * 3),
      });
    }
  }

  resize(w: number, h: number) { this.init(w, h); }

  private drawCrystalBranch(
    ctx: CanvasRenderingContext2D, x: number, y: number, angle: number,
    len: number, w: number, depth: number, maxDepth: number, t: number,
    hue: number, intensity: number, scale: number
  ) {
    if (depth > maxDepth || len < 5) return;

    const growFactor = Math.min(1, (Math.sin(t * 0.5 + depth) * 0.5 + 0.5));
    const actualLen = len * growFactor * scale;
    const ex = x + Math.cos(angle) * actualLen;
    const ey = y + Math.sin(angle) * actualLen;

    // Crystal body
    const grad = ctx.createLinearGradient(x, y, ex, ey);
    const alpha = (0.4 + 0.3 * intensity) * (1 - depth / (maxDepth + 1));
    grad.addColorStop(0, `hsla(${hue}, 80%, 70%, ${alpha})`);
    grad.addColorStop(0.5, `hsla(${hue + 20}, 90%, 85%, ${alpha * 1.2})`);
    grad.addColorStop(1, `hsla(${hue + 40}, 70%, 60%, ${alpha * 0.6})`);

    ctx.beginPath();
    const perpX = Math.cos(angle + Math.PI / 2);
    const perpY = Math.sin(angle + Math.PI / 2);
    const hw = w * 0.5 * (1 - depth / (maxDepth + 1));
    ctx.moveTo(x + perpX * hw, y + perpY * hw);
    ctx.lineTo(ex, ey);
    ctx.lineTo(x - perpX * hw, y - perpY * hw);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Edge glow
    ctx.strokeStyle = `hsla(${hue + 30}, 100%, 90%, ${alpha * 0.5})`;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Refraction glow at tip
    if (depth < 2) {
      const glowR = w * 0.8 * scale;
      const glow = ctx.createRadialGradient(ex, ey, 0, ex, ey, glowR);
      glow.addColorStop(0, `hsla(${hue + 30}, 100%, 90%, ${0.3 * intensity})`);
      glow.addColorStop(1, `hsla(${hue + 30}, 100%, 90%, 0)`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(ex, ey, glowR, 0, Math.PI * 2);
      ctx.fill();
    }

    // Sub-branches
    if (depth < maxDepth) {
      const spread = 0.4 + Math.sin(t + depth) * 0.15;
      this.drawCrystalBranch(ctx, ex, ey, angle - spread, len * 0.65, w * 0.6, depth + 1, maxDepth, t, hue + 15, intensity, scale);
      this.drawCrystalBranch(ctx, ex, ey, angle + spread, len * 0.65, w * 0.6, depth + 1, maxDepth, t, hue - 15, intensity, scale);
    }
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, params: EffectParams = DEFAULT_PARAMS) {
    const t = time * 0.001;
    const intensity = params.intensity / 50;
    const scale = params.scale;

    for (const c of this.crystals) {
      const ct = t * c.growSpeed + c.phase;
      const hue = this.baseHue + c.hueOffset;
      this.drawCrystalBranch(ctx, c.x, c.y, c.angle, c.length, c.width, 0, c.branches, ct, hue, intensity, scale);
    }

    // Floating sparkles
    const sparkleCount = Math.floor(20 * intensity);
    for (let i = 0; i < sparkleCount; i++) {
      const sx = (Math.sin(t * 0.7 + i * 1.3) * 0.5 + 0.5) * width;
      const sy = (Math.cos(t * 0.5 + i * 2.1) * 0.5 + 0.5) * height;
      const sa = Math.sin(t * 2 + i * 3) * 0.3 + 0.3;
      if (sa > 0) {
        ctx.fillStyle = `hsla(${this.baseHue + i * 7}, 100%, 90%, ${sa})`;
        ctx.beginPath();
        ctx.arc(sx, sy, 1.5 * scale, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}
