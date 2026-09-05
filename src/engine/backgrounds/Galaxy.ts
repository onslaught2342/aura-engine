import type { BackgroundLayer, EffectParams } from "./types";
import { DEFAULT_PARAMS } from "./types";

interface Star {
  baseAngle: number;
  armOffset: number;
  radialDist: number;
  size: number;
  brightness: number;
  hueShift: number;
  twinklePhase: number;
}

export class Galaxy implements BackgroundLayer {
  private stars: Star[] = [];
  private cx: number;
  private cy: number;

  constructor(w: number, h: number, private color: string = "260") {
    this.cx = w / 2;
    this.cy = h / 2;
    this.initStars(600);
  }

  private initStars(count: number) {
    this.stars = [];
    for (let i = 0; i < count; i++) {
      this.stars.push({
        baseAngle: Math.random() * Math.PI * 2,
        armOffset: (Math.random() - 0.5) * 0.8,
        radialDist: Math.random(),
        size: 0.3 + Math.random() * 2.5,
        brightness: 0.2 + Math.random() * 0.8,
        hueShift: (Math.random() - 0.5) * 40,
        twinklePhase: Math.random() * Math.PI * 2,
      });
    }
  }

  resize(w: number, h: number) {
    this.cx = w / 2;
    this.cy = h / 2;
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, params: EffectParams = DEFAULT_PARAMS) {
    const { intensity, scale, turbulence, direction } = params;
    const cx = width / 2;
    const cy = height / 2;
    const t = time * 0.001;
    const hue = parseInt(this.color) || 260;
    const scaleMul = scale;
    const armCount = Math.round(2 + (turbulence / 100) * 4); // 2-6 arms
    const densityMul = intensity / 50;
    const rotationOffset = (direction / 360) * Math.PI * 2;
    const galaxyRadius = Math.min(width, height) * 0.4 * scaleMul;

    // Adjust star count
    const targetCount = Math.floor(600 * densityMul);
    while (this.stars.length < targetCount) {
      this.stars.push({
        baseAngle: Math.random() * Math.PI * 2,
        armOffset: (Math.random() - 0.5) * 0.8,
        radialDist: Math.random(),
        size: 0.3 + Math.random() * 2.5,
        brightness: 0.2 + Math.random() * 0.8,
        hueShift: (Math.random() - 0.5) * 40,
        twinklePhase: Math.random() * Math.PI * 2,
      });
    }
    if (this.stars.length > targetCount) this.stars.length = targetCount;

    const rotation = t * 0.05 + rotationOffset;

    ctx.save();
    ctx.translate(cx, cy);

    // ── Central bulge glow ──
    const bulgeR = galaxyRadius * 0.2;
    const bulgeGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, bulgeR);
    bulgeGrad.addColorStop(0, `hsla(${hue + 30}, 60%, 90%, 0.6)`);
    bulgeGrad.addColorStop(0.3, `hsla(${hue + 20}, 70%, 70%, 0.3)`);
    bulgeGrad.addColorStop(0.7, `hsla(${hue}, 60%, 50%, 0.1)`);
    bulgeGrad.addColorStop(1, `hsla(${hue}, 50%, 30%, 0)`);
    ctx.fillStyle = bulgeGrad;
    ctx.beginPath();
    ctx.arc(0, 0, bulgeR, 0, Math.PI * 2);
    ctx.fill();

    // Outer halo
    const haloGrad = ctx.createRadialGradient(0, 0, galaxyRadius * 0.3, 0, 0, galaxyRadius);
    haloGrad.addColorStop(0, `hsla(${hue}, 50%, 40%, 0.05)`);
    haloGrad.addColorStop(1, `hsla(${hue}, 40%, 20%, 0)`);
    ctx.fillStyle = haloGrad;
    ctx.beginPath();
    ctx.arc(0, 0, galaxyRadius, 0, Math.PI * 2);
    ctx.fill();

    // ── Spiral arms (dust/glow lanes) ──
    for (let arm = 0; arm < armCount; arm++) {
      const armAngle = (arm / armCount) * Math.PI * 2;
      ctx.beginPath();
      for (let r = bulgeR * 0.5; r < galaxyRadius; r += 2) {
        // Logarithmic spiral: θ = a + b * ln(r)
        const spiralAngle = armAngle + rotation + Math.log(r / bulgeR) * 1.2;
        const x = Math.cos(spiralAngle) * r;
        const y = Math.sin(spiralAngle) * r * 0.6; // slight tilt
        if (r === bulgeR * 0.5) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      const armAlpha = 0.08 + 0.03 * Math.sin(t + arm);
      ctx.strokeStyle = `hsla(${hue + arm * 15}, 70%, 60%, ${armAlpha})`;
      ctx.lineWidth = 20 * scaleMul;
      ctx.stroke();

      // Brighter inner arm edge
      ctx.strokeStyle = `hsla(${hue + arm * 15 + 10}, 80%, 75%, ${armAlpha * 0.6})`;
      ctx.lineWidth = 8 * scaleMul;
      ctx.stroke();
    }

    // ── Dust lanes (darker regions between arms) ──
    for (let arm = 0; arm < armCount; arm++) {
      const dustAngle = (arm / armCount) * Math.PI * 2 + Math.PI / armCount;
      ctx.beginPath();
      for (let r = bulgeR; r < galaxyRadius * 0.85; r += 3) {
        const spiralAngle = dustAngle + rotation + Math.log(r / bulgeR) * 1.2;
        const x = Math.cos(spiralAngle) * r;
        const y = Math.sin(spiralAngle) * r * 0.6;
        if (r === bulgeR) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `rgba(0, 0, 0, 0.08)`;
      ctx.lineWidth = 12 * scaleMul;
      ctx.stroke();
    }

    // ── Stars ──
    for (const star of this.stars) {
      // Assign star to nearest arm using logarithmic spiral
      const armIndex = Math.floor(star.baseAngle / (Math.PI * 2) * armCount);
      const armBase = (armIndex / armCount) * Math.PI * 2;
      const r = bulgeR * 0.3 + star.radialDist * (galaxyRadius - bulgeR * 0.3);
      const spiralAngle = armBase + rotation + Math.log(Math.max(r / bulgeR, 0.1)) * 1.2 + star.armOffset;
      const x = Math.cos(spiralAngle) * r;
      const y = Math.sin(spiralAngle) * r * 0.6;

      // Twinkle
      const twinkle = 0.5 + 0.5 * Math.sin(t * 2 + star.twinklePhase);
      const alpha = star.brightness * twinkle;
      const starHue = hue + star.hueShift;
      const lightness = 70 + star.brightness * 25;

      // Size varies with distance from center (larger near arms)
      const armProximity = 1 - Math.abs(star.armOffset) * 1.2;
      const drawSize = star.size * scaleMul * (0.5 + armProximity * 0.5);

      // Glow for bright stars
      if (star.brightness > 0.6 && drawSize > 1.5) {
        const glowGrad = ctx.createRadialGradient(x, y, 0, x, y, drawSize * 4);
        glowGrad.addColorStop(0, `hsla(${starHue}, 80%, ${lightness}%, ${alpha * 0.3})`);
        glowGrad.addColorStop(1, `hsla(${starHue}, 60%, ${lightness}%, 0)`);
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(x, y, drawSize * 4, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(x, y, drawSize, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${starHue}, 80%, ${lightness}%, ${alpha})`;
      ctx.fill();
    }

    ctx.restore();
  }
}
