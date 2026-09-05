import type { BackgroundLayer, EffectParams } from "./types";
import { DEFAULT_PARAMS } from "./types";

export class RetroSunset implements BackgroundLayer {
  private baseHue: number;

  constructor(_w: number, _h: number, color?: string) {
    this.baseHue = color ? parseFloat(color) || 340 : 340;
  }

  resize() {}

  render(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, params: EffectParams = DEFAULT_PARAMS) {
    const t = time * 0.001;
    const speed = params.scale;
    const intensity = params.intensity / 50;
    const horizon = height * 0.55;

    // Sky gradient with slow hue drift
    const drift = Math.sin(t * 0.1) * 8;
    const skyGrad = ctx.createLinearGradient(0, 0, 0, horizon);
    skyGrad.addColorStop(0, `hsla(${(this.baseHue + 40 + drift) % 360}, 60%, 15%, 1)`);
    skyGrad.addColorStop(0.4, `hsla(${(this.baseHue + drift) % 360}, 80%, 30%, 1)`);
    skyGrad.addColorStop(0.7, `hsla(${(this.baseHue + 20 + drift) % 360}, 90%, 50%, 1)`);
    skyGrad.addColorStop(1, `hsla(50, 100%, 70%, 1)`);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, horizon);

    // Sun — visible bob + radius pulse
    const pulse = 1 + Math.sin(t * 1.2) * 0.04;
    const sunR = width * 0.12 * params.scale * pulse;
    const sunBob = Math.sin(t * 0.8) * 14;
    const sunY = horizon - sunR * 0.3 + sunBob;
    const sunX = width / 2;
    const sunGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR);
    sunGrad.addColorStop(0, `hsla(50, 100%, 95%, 1)`);
    sunGrad.addColorStop(0.5, `hsla(${this.baseHue}, 100%, 60%, 1)`);
    sunGrad.addColorStop(1, `hsla(${this.baseHue}, 100%, 50%, 0)`);
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
    ctx.fill();

    // Scrolling scanline bands across the sun
    const bandCount = 8 + Math.floor(params.turbulence * 0.1);
    const bandSpan = (sunR * 2) / bandCount;
    const scroll = ((t * 30 * speed) % bandSpan + bandSpan) % bandSpan;
    for (let i = -1; i < bandCount; i++) {
      const by = sunY - sunR + i * bandSpan + scroll;
      const bh = sunR * 0.06;
      ctx.fillStyle = `hsla(${(this.baseHue + 40) % 360}, 60%, 15%, 0.85)`;
      ctx.fillRect(sunX - sunR, by, sunR * 2, bh);
    }

    // Ground
    ctx.fillStyle = `hsla(${(this.baseHue + 40) % 360}, 60%, 8%, 1)`;
    ctx.fillRect(0, horizon, width, height - horizon);

    // Perspective grid — scrolls toward viewer
    const gridLines = 20 + Math.floor(params.intensity * 0.3);
    ctx.strokeStyle = `hsla(${this.baseHue}, 100%, 60%, 0.4)`;
    ctx.lineWidth = 1;
    const scrollPhase = (t * 0.25 * speed) % (1 / gridLines);

    for (let i = 1; i <= gridLines + 1; i++) {
      const ratio = i / gridLines - scrollPhase;
      if (ratio <= 0 || ratio > 1) continue;
      const y = horizon + ratio * ratio * (height - horizon);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.globalAlpha = 0.3 + ratio * 0.5;
      ctx.stroke();
    }

    // Vertical lines converging to horizon
    const vLines = 16;
    ctx.globalAlpha = 0.5;
    for (let i = -vLines; i <= vLines; i++) {
      const xBottom = width / 2 + i * (width / vLines) * 1.5;
      ctx.beginPath();
      ctx.moveTo(width / 2, horizon);
      ctx.lineTo(xBottom, height);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Pulsing horizon glow
    const glowA = (0.25 + Math.sin(t * 1.5) * 0.12) * intensity;
    const glowGrad = ctx.createLinearGradient(0, horizon - 30, 0, horizon + 30);
    glowGrad.addColorStop(0, `hsla(50, 100%, 80%, 0)`);
    glowGrad.addColorStop(0.5, `hsla(50, 100%, 80%, ${glowA})`);
    glowGrad.addColorStop(1, `hsla(50, 100%, 80%, 0)`);
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, horizon - 30, width, 60);
  }
}
