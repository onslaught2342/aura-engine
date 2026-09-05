import type { BackgroundLayer, EffectParams } from "./types";
import { DEFAULT_PARAMS } from "./types";

export class PrismRefraction implements BackgroundLayer {
  private baseHue: number;

  constructor(_w: number, _h: number, color?: string) {
    this.baseHue = color ? parseInt(color, 10) || 0 : 0;
  }

  resize() {}

  render(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, params: EffectParams = DEFAULT_PARAMS) {
    const t = time * 0.0005;
    const intensity = params.intensity / 50;
    const scale = params.scale;
    const turb = params.turbulence / 50;

    const cx = width * 0.5;
    const cy = height * 0.5;
    const prismSize = 80 * scale;

    // Draw incoming light beam
    const beamStartX = width * 0.1;
    const beamStartY = cy - 50 * Math.sin(t * 0.5);
    const prismLeftX = cx - prismSize * 0.5;
    const prismLeftY = cy;

    ctx.beginPath();
    ctx.moveTo(beamStartX, beamStartY);
    ctx.lineTo(prismLeftX, prismLeftY);
    const beamGrad = ctx.createLinearGradient(beamStartX, beamStartY, prismLeftX, prismLeftY);
    beamGrad.addColorStop(0, `hsla(60, 10%, 95%, 0)`);
    beamGrad.addColorStop(0.5, `hsla(60, 10%, 95%, ${0.6 * intensity})`);
    beamGrad.addColorStop(1, `hsla(60, 20%, 98%, ${0.8 * intensity})`);
    ctx.strokeStyle = beamGrad;
    ctx.lineWidth = 6 * scale;
    ctx.stroke();

    // Beam glow
    ctx.lineWidth = 20 * scale;
    const glowGrad = ctx.createLinearGradient(beamStartX, beamStartY, prismLeftX, prismLeftY);
    glowGrad.addColorStop(0, `hsla(60, 10%, 95%, 0)`);
    glowGrad.addColorStop(1, `hsla(60, 20%, 95%, ${0.15 * intensity})`);
    ctx.strokeStyle = glowGrad;
    ctx.stroke();

    // Prism triangle
    const py1 = cy - prismSize;
    const py2 = cy + prismSize * 0.7;
    ctx.beginPath();
    ctx.moveTo(cx, py1);
    ctx.lineTo(cx - prismSize * 0.8, py2);
    ctx.lineTo(cx + prismSize * 0.8, py2);
    ctx.closePath();
    ctx.fillStyle = `hsla(220, 30%, 40%, ${0.15 * intensity})`;
    ctx.fill();
    ctx.strokeStyle = `hsla(220, 60%, 80%, ${0.5 * intensity})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Prism internal glow
    const pGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, prismSize);
    pGlow.addColorStop(0, `hsla(220, 80%, 90%, ${0.2 * intensity})`);
    pGlow.addColorStop(1, `hsla(220, 80%, 90%, 0)`);
    ctx.fillStyle = pGlow;
    ctx.beginPath();
    ctx.arc(cx, cy, prismSize, 0, Math.PI * 2);
    ctx.fill();

    // Rainbow spectrum beams exiting prism
    const colors = [0, 30, 60, 120, 200, 260, 300];
    const exitX = cx + prismSize * 0.5;
    const spreadAngle = 0.5 + turb * 0.3;

    for (let i = 0; i < colors.length; i++) {
      const angle = -spreadAngle / 2 + (i / (colors.length - 1)) * spreadAngle;
      const wobble = Math.sin(t * 2 + i * 0.8) * 0.02 * turb;
      const finalAngle = angle + wobble;
      const rayLen = width * 0.6;
      const endX = exitX + Math.cos(finalAngle) * rayLen;
      const endY = cy + Math.sin(finalAngle) * rayLen;

      const hue = (this.baseHue + colors[i]) % 360;

      // Main ray
      ctx.beginPath();
      ctx.moveTo(exitX, cy);
      ctx.lineTo(endX, endY);
      const rayGrad = ctx.createLinearGradient(exitX, cy, endX, endY);
      rayGrad.addColorStop(0, `hsla(${hue}, 100%, 70%, ${0.7 * intensity})`);
      rayGrad.addColorStop(0.3, `hsla(${hue}, 100%, 60%, ${0.5 * intensity})`);
      rayGrad.addColorStop(1, `hsla(${hue}, 100%, 50%, 0)`);
      ctx.strokeStyle = rayGrad;
      ctx.lineWidth = (4 + Math.sin(t + i) * 1.5) * scale;
      ctx.stroke();

      // Ray glow
      ctx.lineWidth = (15 + Math.sin(t * 1.3 + i) * 5) * scale;
      const glowG = ctx.createLinearGradient(exitX, cy, endX, endY);
      glowG.addColorStop(0, `hsla(${hue}, 100%, 70%, ${0.15 * intensity})`);
      glowG.addColorStop(0.5, `hsla(${hue}, 100%, 60%, ${0.08 * intensity})`);
      glowG.addColorStop(1, `hsla(${hue}, 100%, 50%, 0)`);
      ctx.strokeStyle = glowG;
      ctx.stroke();
    }

    // Floating spectral particles
    const particleCount = Math.floor(25 * intensity);
    for (let i = 0; i < particleCount; i++) {
      const px = exitX + (Math.sin(t * 0.6 + i * 1.7) * 0.3 + 0.5) * width * 0.5;
      const py = cy + Math.cos(t * 0.4 + i * 2.3) * height * 0.3;
      const ph = (this.baseHue + i * 25) % 360;
      const pa = Math.sin(t * 1.5 + i * 3) * 0.3 + 0.2;
      if (pa > 0) {
        ctx.fillStyle = `hsla(${ph}, 100%, 75%, ${pa * intensity})`;
        ctx.beginPath();
        ctx.arc(px, py, 2 * scale, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}
