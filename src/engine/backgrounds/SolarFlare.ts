import type { BackgroundLayer, EffectParams } from "./types";
import { DEFAULT_PARAMS } from "./types";

interface FlareArc {
  startAngle: number;
  sweep: number;
  height: number;
  phase: number;
  speed: number;
  hueShift: number;
  width: number;
}

interface Ejection {
  angle: number;
  radius: number;
  speed: number;
  size: number;
  life: number;
  maxLife: number;
  hue: number;
}

export class SolarFlare implements BackgroundLayer {
  private arcs: FlareArc[] = [];
  private ejections: Ejection[] = [];
  private baseHue: number;
  private cx = 0;
  private cy = 0;

  constructor(w: number, h: number, color = "30") {
    this.baseHue = parseFloat(color) || 30;
    this.cx = w / 2;
    this.cy = h / 2;
    this.initArcs();
  }

  private initArcs() {
    this.arcs = [];
    for (let i = 0; i < 6; i++) {
      this.arcs.push({
        startAngle: Math.random() * Math.PI * 2,
        sweep: 0.3 + Math.random() * 0.8,
        height: 0.3 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
        speed: 0.2 + Math.random() * 0.6,
        hueShift: (Math.random() - 0.5) * 30,
        width: 2 + Math.random() * 4,
      });
    }
  }

  resize(w: number, h: number) {
    this.cx = w / 2;
    this.cy = h / 2;
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, params: EffectParams = DEFAULT_PARAMS) {
    const t = time * 0.001;
    const intensityMul = params.intensity / 50;
    const scaleMul = params.scale;
    const turbMul = params.turbulence / 50;
    const coreRadius = Math.min(width, height) * 0.08 * scaleMul;

    // Corona glow
    const corona = ctx.createRadialGradient(this.cx, this.cy, coreRadius * 0.5, this.cx, this.cy, coreRadius * 8);
    corona.addColorStop(0, `hsla(${this.baseHue + 10}, 100%, 70%, ${0.4 * intensityMul})`);
    corona.addColorStop(0.2, `hsla(${this.baseHue}, 100%, 55%, ${0.2 * intensityMul})`);
    corona.addColorStop(0.5, `hsla(${this.baseHue - 10}, 90%, 40%, ${0.05 * intensityMul})`);
    corona.addColorStop(1, "hsla(0, 0%, 0%, 0)");
    ctx.fillStyle = corona;
    ctx.fillRect(0, 0, width, height);

    // Flare arcs
    for (const arc of this.arcs) {
      const animPhase = t * arc.speed + arc.phase;
      const pulseHeight = arc.height * (0.7 + 0.3 * Math.sin(animPhase)) * scaleMul;
      const arcRadius = coreRadius * (2 + pulseHeight * 3);
      const hue = this.baseHue + arc.hueShift + Math.sin(animPhase * 0.7) * 10 * turbMul;

      ctx.save();
      ctx.translate(this.cx, this.cy);

      // Draw erupting arc
      const segments = 20;
      ctx.beginPath();
      for (let s = 0; s <= segments; s++) {
        const frac = s / segments;
        const angle = arc.startAngle + frac * arc.sweep;
        const lift = Math.sin(frac * Math.PI) * arcRadius;
        const wobble = Math.sin(frac * 8 + animPhase * 3) * 5 * turbMul;
        const r = coreRadius + lift + wobble;
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;
        if (s === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      ctx.strokeStyle = `hsla(${hue}, 100%, 65%, ${0.6 * intensityMul * pulseHeight})`;
      ctx.lineWidth = arc.width * scaleMul;
      ctx.shadowColor = `hsla(${hue}, 100%, 60%, 0.5)`;
      ctx.shadowBlur = 15 * scaleMul;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // Spawn particle ejections
    if (Math.random() < 0.15 * intensityMul) {
      const angle = Math.random() * Math.PI * 2;
      this.ejections.push({
        angle,
        radius: coreRadius,
        speed: 30 + Math.random() * 80,
        size: 1 + Math.random() * 3,
        life: 0,
        maxLife: 1 + Math.random() * 2,
        hue: this.baseHue + (Math.random() - 0.5) * 40,
      });
    }

    // Update and draw ejections
    for (let i = this.ejections.length - 1; i >= 0; i--) {
      const ej = this.ejections[i];
      ej.life += 0.016;
      ej.radius += ej.speed * 0.016;

      if (ej.life >= ej.maxLife) {
        this.ejections.splice(i, 1);
        continue;
      }

      const alpha = (1 - ej.life / ej.maxLife) * intensityMul;
      const x = this.cx + Math.cos(ej.angle) * ej.radius;
      const y = this.cy + Math.sin(ej.angle) * ej.radius;
      const sz = ej.size * scaleMul;

      const g = ctx.createRadialGradient(x, y, 0, x, y, sz * 3);
      g.addColorStop(0, `hsla(${ej.hue}, 100%, 75%, ${alpha})`);
      g.addColorStop(1, `hsla(${ej.hue}, 100%, 50%, 0)`);
      ctx.fillStyle = g;
      ctx.fillRect(x - sz * 3, y - sz * 3, sz * 6, sz * 6);
    }

    // Bright core
    const coreGrad = ctx.createRadialGradient(this.cx, this.cy, 0, this.cx, this.cy, coreRadius);
    coreGrad.addColorStop(0, `hsla(${this.baseHue + 20}, 100%, 95%, ${0.9 * intensityMul})`);
    coreGrad.addColorStop(0.5, `hsla(${this.baseHue + 10}, 100%, 75%, ${0.6 * intensityMul})`);
    coreGrad.addColorStop(1, `hsla(${this.baseHue}, 100%, 55%, ${0.1 * intensityMul})`);
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(this.cx, this.cy, coreRadius, 0, Math.PI * 2);
    ctx.fill();
  }
}
