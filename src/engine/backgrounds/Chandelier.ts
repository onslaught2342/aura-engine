import type { BackgroundLayer, EffectParams } from "./types";
import { DEFAULT_PARAMS } from "./types";

interface Prism { x: number; length: number; width: number; phase: number; hue: number; swayAmp: number; }

export class Chandelier implements BackgroundLayer {
  private prisms: Prism[] = [];
  private baseHue: number;

  constructor(_w: number, _h: number, color = "40") {
    this.baseHue = parseInt(color) || 40;
    this.initPrisms(20, _w);
  }

  private initPrisms(count: number, w: number) {
    this.prisms = [];
    for (let i = 0; i < count; i++) {
      this.prisms.push({
        x: (w / (count + 1)) * (i + 1) + (Math.random() - 0.5) * 30,
        length: 40 + Math.random() * 100,
        width: 3 + Math.random() * 6,
        phase: Math.random() * Math.PI * 2,
        hue: Math.random() * 50,
        swayAmp: 5 + Math.random() * 15,
      });
    }
  }

  resize(w: number, _h: number) { this.initPrisms(this.prisms.length || 20, w); }

  render(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, params: EffectParams = DEFAULT_PARAMS) {
    const iMul = params.intensity / 50;
    const sMul = params.scale;
    const tMul = params.turbulence / 50;
    const targetCount = Math.floor(20 * iMul);
    while (this.prisms.length < targetCount) this.prisms.push({ x: Math.random()*width, length: 40+Math.random()*100, width: 3+Math.random()*6, phase: Math.random()*Math.PI*2, hue: Math.random()*50, swayAmp: 5+Math.random()*15 });
    if (this.prisms.length > targetCount) this.prisms.length = targetCount;

    // Top mounting bar
    ctx.fillStyle = `hsla(${this.baseHue}, 10%, 30%, ${0.4 * iMul})`;
    ctx.fillRect(width * 0.1, 0, width * 0.8, 4);

    for (const p of this.prisms) {
      const sway = Math.sin(time * 0.001 * tMul + p.phase) * p.swayAmp * tMul;
      const topX = p.x + sway * 0.3;
      const botX = p.x + sway;
      const topY = 4;
      const botY = topY + p.length * sMul;
      const hue = this.baseHue + p.hue;

      // Chain/wire
      ctx.beginPath();
      ctx.moveTo(topX, topY);
      ctx.quadraticCurveTo(topX + sway * 0.5, (topY + botY) / 2, botX, botY);
      ctx.strokeStyle = `hsla(${hue}, 20%, 60%, ${0.3 * iMul})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Prism body
      const pw = p.width * sMul;
      ctx.save();
      ctx.translate(botX, botY);
      ctx.rotate(sway * 0.01);
      // Crystal shape (elongated hexagon)
      ctx.beginPath();
      ctx.moveTo(0, -pw * 2);
      ctx.lineTo(pw, -pw);
      ctx.lineTo(pw, pw);
      ctx.lineTo(0, pw * 2);
      ctx.lineTo(-pw, pw);
      ctx.lineTo(-pw, -pw);
      ctx.closePath();
      const crystalGrad = ctx.createLinearGradient(-pw, -pw * 2, pw, pw * 2);
      crystalGrad.addColorStop(0, `hsla(${hue}, 60%, 85%, ${0.5 * iMul})`);
      crystalGrad.addColorStop(0.5, `hsla(${hue + 30}, 70%, 70%, ${0.3 * iMul})`);
      crystalGrad.addColorStop(1, `hsla(${hue + 60}, 60%, 80%, ${0.5 * iMul})`);
      ctx.fillStyle = crystalGrad;
      ctx.fill();
      ctx.strokeStyle = `hsla(0, 0%, 100%, ${0.3 * iMul})`;
      ctx.lineWidth = 0.5;
      ctx.stroke();
      ctx.restore();

      // Light refraction beams
      const beamCount = 2 + Math.floor(Math.random() * 2);
      for (let b = 0; b < beamCount; b++) {
        const beamAngle = (sway * 0.02) + (b - beamCount / 2) * 0.3;
        const beamLen = (80 + Math.random() * 120) * sMul;
        const bx2 = botX + Math.sin(beamAngle) * beamLen;
        const by2 = botY + Math.cos(beamAngle) * beamLen;
        const beamGrad = ctx.createLinearGradient(botX, botY, bx2, by2);
        const bHue = hue + b * 40 + Math.sin(time * 0.002 + p.phase) * 30;
        beamGrad.addColorStop(0, `hsla(${bHue}, 80%, 70%, ${0.15 * iMul})`);
        beamGrad.addColorStop(1, `hsla(${bHue}, 80%, 70%, 0)`);
        ctx.beginPath();
        ctx.moveTo(botX - 2, botY);
        ctx.lineTo(bx2 - 8, by2);
        ctx.lineTo(bx2 + 8, by2);
        ctx.lineTo(botX + 2, botY);
        ctx.closePath();
        ctx.fillStyle = beamGrad;
        ctx.fill();
      }

      // Sparkle
      if (Math.sin(time * 0.005 + p.phase * 3) > 0.8) {
        ctx.beginPath();
        ctx.arc(botX, botY, 2 * sMul, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(0, 0%, 100%, ${0.8 * iMul})`;
        ctx.fill();
      }
    }
  }
}
