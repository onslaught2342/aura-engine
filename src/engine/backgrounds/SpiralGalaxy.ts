import type { BackgroundLayer, EffectParams } from "./types";
import { DEFAULT_PARAMS } from "./types";

interface Star { angle: number; dist: number; size: number; brightness: number; hue: number; arm: number; }

export class SpiralGalaxy implements BackgroundLayer {
  private stars: Star[] = [];
  private cx: number; private cy: number;
  private baseHue: number;

  constructor(w: number, h: number, color = "220") {
    this.cx = w / 2; this.cy = h / 2;
    this.baseHue = parseInt(color) || 220;
    this.initStars(600);
  }

  private initStars(count: number) {
    this.stars = [];
    for (let i = 0; i < count; i++) {
      const arm = Math.floor(Math.random() * 4);
      this.stars.push({
        angle: Math.random() * Math.PI * 2,
        dist: Math.random(),
        size: 0.5 + Math.random() * 2,
        brightness: 0.3 + Math.random() * 0.7,
        hue: Math.random() * 40 - 20,
        arm,
      });
    }
  }

  resize(w: number, h: number) { this.cx = w / 2; this.cy = h / 2; }

  render(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, params: EffectParams = DEFAULT_PARAMS) {
    const iMul = params.intensity / 50;
    const sMul = params.scale;
    const armCount = 2 + Math.floor(params.turbulence / 25);
    const rotation = time * 0.00005 * iMul;
    const radius = Math.min(width, height) * 0.4 * sMul;
    const dirRad = (params.direction * Math.PI) / 180;

    const targetStars = Math.floor(600 * iMul);
    while (this.stars.length < targetStars) this.stars.push({ angle: Math.random()*Math.PI*2, dist: Math.random(), size: 0.5+Math.random()*2, brightness: 0.3+Math.random()*0.7, hue: Math.random()*40-20, arm: Math.floor(Math.random()*4) });
    if (this.stars.length > targetStars) this.stars.length = targetStars;

    // Core glow
    const coreGrad = ctx.createRadialGradient(this.cx, this.cy, 0, this.cx, this.cy, radius * 0.2);
    coreGrad.addColorStop(0, `hsla(${this.baseHue + 20}, 50%, 90%, ${0.4 * iMul})`);
    coreGrad.addColorStop(1, `hsla(${this.baseHue}, 60%, 50%, 0)`);
    ctx.fillStyle = coreGrad;
    ctx.fillRect(0, 0, width, height);

    // Density wave spiral arms
    for (let a = 0; a < armCount; a++) {
      const armAngle = (a / armCount) * Math.PI * 2;
      ctx.beginPath();
      for (let t = 0; t < 1; t += 0.005) {
        const spiralAngle = armAngle + t * 4 * Math.PI + rotation + dirRad;
        const r = t * radius;
        const x = this.cx + Math.cos(spiralAngle) * r;
        const y = this.cy + Math.sin(spiralAngle) * r;
        if (t === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `hsla(${this.baseHue + a * 15}, 50%, 60%, ${0.08 * iMul})`;
      ctx.lineWidth = 12 * sMul;
      ctx.stroke();
    }

    // Stars along arms
    for (const s of this.stars) {
      const armAngle = (s.arm % armCount) / armCount * Math.PI * 2;
      const spiralAngle = armAngle + s.dist * 4 * Math.PI + rotation + dirRad + s.angle * 0.15;
      const r = s.dist * radius;
      const x = this.cx + Math.cos(spiralAngle) * r;
      const y = this.cy + Math.sin(spiralAngle) * r;
      const twinkle = 0.7 + Math.sin(time * 0.003 + s.angle * 10) * 0.3;

      ctx.beginPath();
      ctx.arc(x, y, s.size * sMul, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${this.baseHue + s.hue}, 60%, ${60 + s.brightness * 30}%, ${s.brightness * twinkle * iMul})`;
      ctx.fill();
    }
  }
}
