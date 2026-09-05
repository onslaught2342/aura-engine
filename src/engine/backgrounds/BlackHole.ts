import type { BackgroundLayer, EffectParams } from "./types";
import { DEFAULT_PARAMS } from "./types";

interface Particle {
  angle: number;
  radius: number;
  speed: number;
  size: number;
  brightness: number;
  trail: number;
}

export class BlackHole implements BackgroundLayer {
  private color: string;
  private particles: Particle[] = [];
  private cx: number;
  private cy: number;

  constructor(w: number, h: number, color = "200") {
    this.color = color;
    this.cx = w / 2;
    this.cy = h / 2;
    this.initParticles(200);
  }

  private initParticles(count: number) {
    this.particles = [];
    for (let i = 0; i < count; i++) {
      this.particles.push({
        angle: Math.random() * Math.PI * 2,
        radius: 80 + Math.random() * 350,
        speed: 0.2 + Math.random() * 0.8,
        size: 0.5 + Math.random() * 2.5,
        brightness: 0.3 + Math.random() * 0.7,
        trail: 0.1 + Math.random() * 0.3,
      });
    }
  }

  resize(w: number, h: number) {
    this.cx = w / 2;
    this.cy = h / 2;
  }

  /** Wien's law approximation: maps normalized distance (0=inner hot, 1=outer cool) to HSL */
  private tempColor(dist: number): { h: number; s: number; l: number } {
    // Inner: blue-white (high temp), outer: orange-red (low temp)
    if (dist < 0.15) return { h: 210, s: 60, l: 95 }; // white-blue
    if (dist < 0.3) return { h: 200, s: 80, l: 85 };  // blue
    if (dist < 0.5) return { h: 180, s: 70, l: 70 };  // cyan
    if (dist < 0.7) return { h: 50, s: 90, l: 65 };   // yellow
    if (dist < 0.85) return { h: 30, s: 95, l: 55 };  // orange
    return { h: 10, s: 90, l: 45 };                     // red
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, params: EffectParams = DEFAULT_PARAMS) {
    const { intensity, scale, turbulence, direction } = params;
    const cx = width / 2;
    const cy = height / 2;
    const t = time * 0.001;
    const hue = parseInt(this.color) || 200;
    const scaleMul = scale;
    const densityMul = intensity / 50;
    const warpFactor = turbulence / 50;
    const tiltAngle = (direction / 360) * Math.PI;

    const targetCount = Math.floor(200 * densityMul);
    while (this.particles.length < targetCount) {
      this.particles.push({
        angle: Math.random() * Math.PI * 2,
        radius: 80 + Math.random() * 350,
        speed: 0.2 + Math.random() * 0.8,
        size: 0.5 + Math.random() * 2.5,
        brightness: 0.3 + Math.random() * 0.7,
        trail: 0.1 + Math.random() * 0.3,
      });
    }
    if (this.particles.length > targetCount) this.particles.length = targetCount;

    const eventHorizonR = 30 * scaleMul;
    const photonRingR = 50 * scaleMul;
    const photonSphereR = eventHorizonR * 1.5; // photon sphere at 1.5x Schwarzschild radius
    const diskOuterR = 220 * scaleMul;
    const diskInnerR = 60 * scaleMul;

    ctx.save();
    ctx.translate(cx, cy);

    // ── Gravitational lensing glow ──
    const lensGrad = ctx.createRadialGradient(0, 0, photonRingR, 0, 0, diskOuterR * 1.8);
    lensGrad.addColorStop(0, `hsla(${hue}, 80%, 70%, 0.12)`);
    lensGrad.addColorStop(0.2, `hsla(${hue + 30}, 70%, 50%, 0.06)`);
    lensGrad.addColorStop(0.5, `hsla(${hue - 20}, 40%, 40%, 0.03)`);
    lensGrad.addColorStop(1, `hsla(${hue}, 50%, 30%, 0)`);
    ctx.fillStyle = lensGrad;
    ctx.beginPath();
    ctx.arc(0, 0, diskOuterR * 1.8, 0, Math.PI * 2);
    ctx.fill();

    // ── Distortion arcs (gravitational lensing) ──
    for (let i = 0; i < 6; i++) {
      const arcAngle = t * 0.1 + (i / 6) * Math.PI * 2;
      const arcR = diskOuterR * (1.1 + 0.3 * Math.sin(t * 0.5 + i * 1.5));
      const arcStart = arcAngle - 0.3;
      const arcEnd = arcAngle + 0.3;
      ctx.beginPath();
      ctx.arc(0, 0, arcR, arcStart, arcEnd);
      ctx.strokeStyle = `hsla(${hue + 60}, 50%, 80%, ${0.04 + 0.02 * Math.sin(t * 2 + i)})`;
      ctx.lineWidth = 1 + Math.sin(t + i) * 0.5;
      ctx.stroke();
    }

    // ── Accretion disk with temperature gradient ──
    ctx.save();
    ctx.scale(1, 0.35 + Math.sin(tiltAngle) * 0.25);
    const diskRotation = t * 0.3 * warpFactor;

    for (let ring = 0; ring < 12; ring++) {
      const ringNorm = ring / 12;
      const ringR = diskInnerR + (diskOuterR - diskInnerR) * ringNorm;
      const temp = this.tempColor(ringNorm);
      const ringAlpha = 0.55 - ring * 0.035;
      const ringWidth = (diskOuterR - diskInnerR) / 8;

      ctx.beginPath();
      ctx.arc(0, 0, ringR, 0, Math.PI * 2);
      ctx.strokeStyle = `hsla(${temp.h}, ${temp.s}%, ${temp.l}%, ${ringAlpha})`;
      ctx.lineWidth = ringWidth * (1 + 0.2 * Math.sin(t * 2.5 + ring * 0.7));
      ctx.stroke();
    }

    // Bright orbital streaks with Doppler shift
    for (let i = 0; i < 16; i++) {
      const streakAngle = diskRotation + (i / 16) * Math.PI * 2;
      const streakNorm = Math.random();
      const streakR = diskInnerR + streakNorm * (diskOuterR - diskInnerR) * 0.8;
      const temp = this.tempColor(streakNorm);
      const streakLen = 0.2 + Math.random() * 0.4;
      // Doppler: approaching side brighter
      const doppler = 0.5 + 0.5 * Math.cos(streakAngle - Math.PI);

      ctx.beginPath();
      ctx.arc(0, 0, streakR, streakAngle, streakAngle + streakLen);
      ctx.strokeStyle = `hsla(${temp.h}, ${temp.s}%, ${temp.l}%, ${(0.15 + 0.2 * doppler) * (0.8 + 0.2 * Math.sin(t * 3 + i))})`;
      ctx.lineWidth = 1 + Math.random() * 2;
      ctx.stroke();
    }
    ctx.restore();

    // ── Photon sphere (thin bright ring at 1.5x event horizon) ──
    const psAlpha = 0.35 + 0.15 * Math.sin(t * 6);
    ctx.beginPath();
    ctx.arc(0, 0, photonSphereR, 0, Math.PI * 2);
    ctx.strokeStyle = `hsla(${hue + 60}, 100%, 90%, ${psAlpha})`;
    ctx.lineWidth = 1.5 * scaleMul;
    ctx.stroke();
    // Subtle glow around photon sphere
    const psGlow = ctx.createRadialGradient(0, 0, photonSphereR - 3, 0, 0, photonSphereR + 8);
    psGlow.addColorStop(0, `hsla(${hue + 60}, 100%, 90%, 0)`);
    psGlow.addColorStop(0.5, `hsla(${hue + 60}, 100%, 85%, ${psAlpha * 0.3})`);
    psGlow.addColorStop(1, `hsla(${hue + 60}, 100%, 80%, 0)`);
    ctx.fillStyle = psGlow;
    ctx.beginPath();
    ctx.arc(0, 0, photonSphereR + 8, 0, Math.PI * 2);
    ctx.fill();

    // ── Photon ring ──
    for (let i = 0; i < 3; i++) {
      const pr = photonRingR + i * 3 * scaleMul;
      ctx.beginPath();
      ctx.arc(0, 0, pr, 0, Math.PI * 2);
      const alpha = 0.5 - i * 0.12 + 0.08 * Math.sin(t * 4 + i);
      ctx.strokeStyle = `hsla(${hue + 60}, 100%, 85%, ${alpha})`;
      ctx.lineWidth = 2 - i * 0.5;
      ctx.stroke();
    }

    // ── Event horizon (black center) ──
    const ehGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, eventHorizonR * 1.6);
    ehGrad.addColorStop(0, `rgba(0, 0, 0, 1)`);
    ehGrad.addColorStop(0.6, `rgba(0, 0, 0, 0.98)`);
    ehGrad.addColorStop(0.85, `rgba(0, 0, 0, 0.7)`);
    ehGrad.addColorStop(1, `rgba(0, 0, 0, 0)`);
    ctx.fillStyle = ehGrad;
    ctx.beginPath();
    ctx.arc(0, 0, eventHorizonR * 1.6, 0, Math.PI * 2);
    ctx.fill();

    // Pure black core
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(0, 0, eventHorizonR, 0, Math.PI * 2);
    ctx.fill();

    // Edge glow with pulsation
    ctx.beginPath();
    ctx.arc(0, 0, eventHorizonR + 2, 0, Math.PI * 2);
    ctx.strokeStyle = `hsla(${hue + 40}, 100%, 70%, ${0.3 + 0.2 * Math.sin(t * 5)})`;
    ctx.lineWidth = 2;
    ctx.stroke();

    // ── Spiraling particles with temperature coloring ──
    for (const p of this.particles) {
      p.angle += (p.speed * 0.02 * warpFactor) / Math.max(p.radius * 0.01, 0.3);
      p.radius -= p.speed * 0.15 * warpFactor;

      if (p.radius < eventHorizonR) {
        p.radius = diskOuterR * (0.8 + Math.random() * 0.4);
        p.angle = Math.random() * Math.PI * 2;
      }

      const px = Math.cos(p.angle) * p.radius;
      const py = Math.sin(p.angle) * p.radius * (0.35 + Math.sin(tiltAngle) * 0.25);
      const distNorm = (p.radius - eventHorizonR) / (diskOuterR - eventHorizonR);
      const temp = this.tempColor(1 - distNorm);
      const alpha = p.brightness * (0.5 + (1 - distNorm) * 0.5);

      // Trail
      const trailAngle = p.angle - p.trail;
      const tx = Math.cos(trailAngle) * p.radius;
      const ty = Math.sin(trailAngle) * p.radius * (0.35 + Math.sin(tiltAngle) * 0.25);
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(px, py);
      ctx.strokeStyle = `hsla(${temp.h}, ${temp.s}%, ${temp.l}%, ${alpha * 0.4})`;
      ctx.lineWidth = p.size * scaleMul * 0.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(px, py, p.size * scaleMul, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${temp.h}, ${temp.s}%, ${temp.l}%, ${alpha})`;
      ctx.fill();
    }

    ctx.restore();
  }
}
