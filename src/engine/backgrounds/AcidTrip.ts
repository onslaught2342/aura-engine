import type { BackgroundLayer, EffectParams } from "./types";
import { DEFAULT_PARAMS } from "./types";

export class AcidTrip implements BackgroundLayer {
  private baseHue: number;

  constructor(_w: number, _h: number, color?: string) {
    this.baseHue = color ? parseFloat(color) || 0 : 0;
  }

  resize() {}

  render(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, params: EffectParams = DEFAULT_PARAMS) {
    const t = time * 0.0004 * params.scale;
    const blobCount = 6 + Math.floor(params.intensity * 0.1);

    // Morphing color blobs
    for (let i = 0; i < blobCount; i++) {
      const phase = (i / blobCount) * Math.PI * 2;
      const cx = width * 0.5 + Math.sin(t + phase) * width * 0.3 * Math.cos(t * 0.3 + i);
      const cy = height * 0.5 + Math.cos(t * 0.7 + phase) * height * 0.3 * Math.sin(t * 0.4 + i);
      const r = (80 + params.turbulence * 1.5) * params.scale;
      const hue = (this.baseHue + i * (360 / blobCount) + t * 30) % 360;

      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, `hsla(${hue}, 100%, 65%, 0.6)`);
      grad.addColorStop(0.5, `hsla(${(hue + 60) % 360}, 90%, 50%, 0.3)`);
      grad.addColorStop(1, `hsla(${(hue + 120) % 360}, 80%, 40%, 0)`);

      ctx.fillStyle = grad;
      ctx.beginPath();

      // Fractal-edge blob using many control points
      const points = 12;
      for (let p = 0; p <= points; p++) {
        const a = (p / points) * Math.PI * 2;
        const wobble = 1 + 0.3 * Math.sin(a * 3 + t * 2 + i) + 0.15 * Math.sin(a * 7 + t * 3);
        const px = cx + Math.cos(a) * r * wobble;
        const py = cy + Math.sin(a) * r * wobble;
        if (p === 0) ctx.moveTo(px, py);
        else {
          const prevA = ((p - 0.5) / points) * Math.PI * 2;
          const prevWobble = 1 + 0.3 * Math.sin(prevA * 3 + t * 2 + i) + 0.15 * Math.sin(prevA * 7 + t * 3);
          const cpx = cx + Math.cos(prevA) * r * prevWobble * 1.1;
          const cpy = cy + Math.sin(prevA) * r * prevWobble * 1.1;
          ctx.quadraticCurveTo(cpx, cpy, px, py);
        }
      }
      ctx.closePath();
      ctx.fill();
    }

    // Swirling overlay pattern
    const spiralCount = 3;
    for (let s = 0; s < spiralCount; s++) {
      ctx.beginPath();
      const sx = width * 0.5, sy = height * 0.5;
      for (let a = 0; a < Math.PI * 6; a += 0.05) {
        const sr = a * 15 * params.scale;
        const px = sx + Math.cos(a + t + s * 2) * sr;
        const py = sy + Math.sin(a + t + s * 2) * sr;
        if (a === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      const hue = (this.baseHue + s * 120 + t * 20) % 360;
      ctx.strokeStyle = `hsla(${hue}, 100%, 70%, 0.15)`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Pulsing center mandala
    const rings = 4;
    for (let r = 0; r < rings; r++) {
      const radius = (40 + r * 30) * params.scale;
      const segments = 6 + r * 2;
      const pulse = 0.8 + 0.2 * Math.sin(t * 3 + r);
      ctx.beginPath();
      for (let i = 0; i <= segments; i++) {
        const a = (i / segments) * Math.PI * 2 + t * (r % 2 === 0 ? 1 : -1);
        const px = width / 2 + Math.cos(a) * radius * pulse;
        const py = height / 2 + Math.sin(a) * radius * pulse;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      const hue = (this.baseHue + r * 90 + t * 40) % 360;
      ctx.strokeStyle = `hsla(${hue}, 100%, 70%, 0.25)`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }
}
