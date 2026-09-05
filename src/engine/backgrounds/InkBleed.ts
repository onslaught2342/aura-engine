import type { BackgroundLayer, EffectParams } from "./types";
import { DEFAULT_PARAMS } from "./types";

interface Drop {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  growSpeed: number;
  alpha: number;
  hueShift: number;
  branches: Branch[];
  age: number;
}

interface Branch {
  angle: number;
  length: number;
  maxLength: number;
  speed: number;
  width: number;
  wobble: number;
  points: { x: number; y: number }[];
}

export class InkBleed implements BackgroundLayer {
  private drops: Drop[] = [];
  private baseHue: number;
  private w: number;
  private h: number;

  constructor(w: number, h: number, color = "220") {
    this.baseHue = parseFloat(color) || 220;
    this.w = w;
    this.h = h;
  }

  private spawnDrop(): Drop {
    const branchCount = 3 + Math.floor(Math.random() * 5);
    const branches: Branch[] = [];
    for (let i = 0; i < branchCount; i++) {
      branches.push({
        angle: (i / branchCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.5,
        length: 0,
        maxLength: 40 + Math.random() * 120,
        speed: 15 + Math.random() * 40,
        width: 1 + Math.random() * 3,
        wobble: Math.random() * Math.PI * 2,
        points: [],
      });
    }

    return {
      x: Math.random() * this.w,
      y: Math.random() * this.h,
      radius: 0,
      maxRadius: 15 + Math.random() * 40,
      growSpeed: 8 + Math.random() * 15,
      alpha: 0.5 + Math.random() * 0.4,
      hueShift: (Math.random() - 0.5) * 40,
      branches,
      age: 0,
    };
  }

  resize(w: number, h: number) {
    this.w = w;
    this.h = h;
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, params: EffectParams = DEFAULT_PARAMS) {
    const dt = 0.016;
    const intensityMul = params.intensity / 50;
    const scaleMul = params.scale;
    const turbMul = params.turbulence / 50;

    // Spawn new drops
    if (Math.random() < 0.02 * intensityMul && this.drops.length < 20) {
      this.drops.push(this.spawnDrop());
    }

    for (let i = this.drops.length - 1; i >= 0; i--) {
      const drop = this.drops[i];
      drop.age += dt;

      // Fade out after growing
      const fadeStart = 3;
      const fadeDuration = 4;
      const fadeAlpha = drop.age > fadeStart
        ? Math.max(0, 1 - (drop.age - fadeStart) / fadeDuration)
        : 1;

      if (fadeAlpha <= 0) {
        this.drops.splice(i, 1);
        continue;
      }

      // Grow main blob
      if (drop.radius < drop.maxRadius * scaleMul) {
        drop.radius += drop.growSpeed * dt * scaleMul;
      }

      const hue = this.baseHue + drop.hueShift;
      const alpha = drop.alpha * fadeAlpha * intensityMul;

      // Draw main ink blob
      const g = ctx.createRadialGradient(drop.x, drop.y, 0, drop.x, drop.y, drop.radius);
      g.addColorStop(0, `hsla(${hue}, 60%, 25%, ${alpha * 0.8})`);
      g.addColorStop(0.6, `hsla(${hue}, 50%, 20%, ${alpha * 0.4})`);
      g.addColorStop(1, `hsla(${hue}, 40%, 15%, 0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(drop.x, drop.y, drop.radius, 0, Math.PI * 2);
      ctx.fill();

      // Grow and draw branches
      for (const branch of drop.branches) {
        if (branch.length < branch.maxLength * scaleMul) {
          branch.length += branch.speed * dt * scaleMul;
        }

        const wobbleAmt = Math.sin(drop.age * 2 + branch.wobble) * 8 * turbMul;
        const endX = drop.x + Math.cos(branch.angle + wobbleAmt * 0.02) * branch.length;
        const endY = drop.y + Math.sin(branch.angle + wobbleAmt * 0.02) * branch.length;

        // Store point for organic trail
        if (branch.points.length === 0 || branch.length > branch.points.length * 5) {
          branch.points.push({ x: endX + (Math.random() - 0.5) * wobbleAmt, y: endY + (Math.random() - 0.5) * wobbleAmt });
        }

        // Draw branch
        if (branch.points.length > 1) {
          ctx.beginPath();
          ctx.moveTo(drop.x, drop.y);
          for (const pt of branch.points) {
            ctx.lineTo(pt.x, pt.y);
          }
          ctx.strokeStyle = `hsla(${hue + 10}, 50%, 30%, ${alpha * 0.6})`;
          ctx.lineWidth = branch.width * scaleMul * fadeAlpha;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.stroke();

          // Bleed tip
          const tip = branch.points[branch.points.length - 1];
          const tipG = ctx.createRadialGradient(tip.x, tip.y, 0, tip.x, tip.y, 6 * scaleMul);
          tipG.addColorStop(0, `hsla(${hue}, 55%, 25%, ${alpha * 0.5})`);
          tipG.addColorStop(1, `hsla(${hue}, 40%, 20%, 0)`);
          ctx.fillStyle = tipG;
          ctx.fillRect(tip.x - 6 * scaleMul, tip.y - 6 * scaleMul, 12 * scaleMul, 12 * scaleMul);
        }
      }
    }
  }
}
