import type { BackgroundLayer, EffectParams } from "./types";
import { DEFAULT_PARAMS } from "./types";

interface PendulumArm { length: number; angle: number; angularVel: number; damping: number; hue: number; trail: {x:number;y:number}[]; }

export class Pendulum implements BackgroundLayer {
  private arms: PendulumArm[] = [];
  private w: number; private h: number;
  private baseHue: number;

  constructor(w: number, h: number, color = "45") {
    this.w = w; this.h = h;
    this.baseHue = parseInt(color) || 45;
    this.initArms(5);
  }

  private initArms(count: number) {
    this.arms = [];
    for (let i = 0; i < count; i++) {
      this.arms.push({
        length: 80 + i * 30,
        angle: Math.PI * 0.4 + Math.random() * 0.4,
        angularVel: 0,
        damping: 0.999,
        hue: i * 30,
        trail: [],
      });
    }
  }

  resize(w: number, h: number) { this.w = w; this.h = h; }

  render(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, params: EffectParams = DEFAULT_PARAMS) {
    const iMul = params.intensity / 50;
    const sMul = params.scale;
    const tMul = params.turbulence / 50;
    const pivotX = width / 2;
    const pivotY = height * 0.15;
    const gravity = 0.0004 * iMul;

    const targetArms = Math.max(2, Math.floor(5 * iMul));
    while (this.arms.length < targetArms) this.arms.push({ length: 80 + this.arms.length * 30, angle: Math.PI * 0.4 + Math.random() * 0.4, angularVel: 0, damping: 0.999, hue: this.arms.length * 30, trail: [] });
    if (this.arms.length > targetArms) this.arms.length = targetArms;

    for (const arm of this.arms) {
      // Add slight energy injection for turbulence
      arm.angularVel += -gravity * Math.sin(arm.angle) + Math.sin(time * 0.001) * 0.00002 * tMul;
      arm.angularVel *= arm.damping;
      arm.angle += arm.angularVel;

      const len = arm.length * sMul;
      const bx = pivotX + Math.sin(arm.angle) * len;
      const by = pivotY + Math.cos(arm.angle) * len;

      arm.trail.push({ x: bx, y: by });
      if (arm.trail.length > 80) arm.trail.shift();

      // Trail
      if (arm.trail.length > 1) {
        ctx.beginPath();
        ctx.moveTo(arm.trail[0].x, arm.trail[0].y);
        for (let i = 1; i < arm.trail.length; i++) {
          ctx.lineTo(arm.trail[i].x, arm.trail[i].y);
        }
        ctx.strokeStyle = `hsla(${this.baseHue + arm.hue}, 70%, 60%, ${0.15 * iMul})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Rod
      ctx.beginPath();
      ctx.moveTo(pivotX, pivotY);
      ctx.lineTo(bx, by);
      ctx.strokeStyle = `hsla(${this.baseHue + arm.hue}, 50%, 50%, ${0.5 * iMul})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Bob
      ctx.beginPath();
      ctx.arc(bx, by, 6 * sMul, 0, Math.PI * 2);
      const grad = ctx.createRadialGradient(bx, by, 0, bx, by, 6 * sMul);
      grad.addColorStop(0, `hsla(${this.baseHue + arm.hue}, 80%, 70%, ${0.9 * iMul})`);
      grad.addColorStop(1, `hsla(${this.baseHue + arm.hue}, 80%, 50%, ${0.3 * iMul})`);
      ctx.fillStyle = grad;
      ctx.fill();
    }

    // Pivot
    ctx.beginPath();
    ctx.arc(pivotX, pivotY, 4 * sMul, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${this.baseHue}, 20%, 80%, ${0.8 * iMul})`;
    ctx.fill();
  }
}
