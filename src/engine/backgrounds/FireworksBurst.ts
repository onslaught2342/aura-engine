import type { BackgroundLayer, EffectParams } from "./types";
import { DEFAULT_PARAMS } from "./types";

interface Spark {
  x: number; y: number; vx: number; vy: number; life: number; maxLife: number;
  hue: number; size: number; trail: { x: number; y: number }[];
}

interface Shell {
  x: number; y: number; sparks: Spark[]; life: number; maxLife: number;
  hue: number; type: number;
}

export class FireworksBurst implements BackgroundLayer {
  private baseHue: number;
  private shells: Shell[] = [];
  private w: number;
  private h: number;
  private lastSpawn = 0;

  constructor(w: number, h: number, color?: string) {
    this.w = w; this.h = h;
    this.baseHue = color ? parseInt(color, 10) || 30 : 30;
  }

  resize(w: number, h: number) { this.w = w; this.h = h; }

  private createShell(width: number, height: number, intensity: number): Shell {
    const x = width * 0.15 + Math.random() * width * 0.7;
    const y = height * 0.1 + Math.random() * height * 0.4;
    const hue = this.baseHue + Math.random() * 120;
    const count = Math.floor(40 + 60 * intensity);
    const type = Math.floor(Math.random() * 3);
    const sparks: Spark[] = [];

    for (let i = 0; i < count; i++) {
      let angle: number, speed: number;
      if (type === 0) { // circular
        angle = (i / count) * Math.PI * 2;
        speed = 2 + Math.random() * 3;
      } else if (type === 1) { // ring
        angle = (i / count) * Math.PI * 2;
        speed = 3 + Math.random() * 0.5;
      } else { // random burst
        angle = Math.random() * Math.PI * 2;
        speed = 1 + Math.random() * 4;
      }

      sparks.push({
        x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        life: 0, maxLife: 60 + Math.random() * 40,
        hue: hue + Math.random() * 30 - 15, size: 1.5 + Math.random() * 2,
        trail: [],
      });
    }
    return { x, y, sparks, life: 0, maxLife: 120, hue, type };
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, params: EffectParams = DEFAULT_PARAMS) {
    const intensity = params.intensity / 50;
    const scale = params.scale;

    // Spawn new shells
    if (time - this.lastSpawn > (1500 / intensity)) {
      this.shells.push(this.createShell(width, height, intensity));
      this.lastSpawn = time;
    }

    // Update and render
    for (let s = this.shells.length - 1; s >= 0; s--) {
      const shell = this.shells[s];
      shell.life++;
      if (shell.life > shell.maxLife) { this.shells.splice(s, 1); continue; }

      // Afterglow
      if (shell.life < 20) {
        const glowR = 50 * scale * (shell.life / 20);
        const glow = ctx.createRadialGradient(shell.x, shell.y, 0, shell.x, shell.y, glowR);
        glow.addColorStop(0, `hsla(${shell.hue}, 100%, 95%, ${0.4 * (1 - shell.life / 20)})`);
        glow.addColorStop(1, `hsla(${shell.hue}, 100%, 80%, 0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(shell.x, shell.y, glowR, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const p of shell.sparks) {
        p.life++;
        if (p.life > p.maxLife) continue;

        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > 6) p.trail.shift();

        p.x += p.vx * scale;
        p.y += p.vy * scale;
        p.vy += 0.03; // gravity
        p.vx *= 0.98;
        p.vy *= 0.98;

        const a = (1 - p.life / p.maxLife);

        // Trail
        if (p.trail.length > 1) {
          ctx.beginPath();
          ctx.moveTo(p.trail[0].x, p.trail[0].y);
          for (let i = 1; i < p.trail.length; i++) {
            ctx.lineTo(p.trail[i].x, p.trail[i].y);
          }
          ctx.strokeStyle = `hsla(${p.hue}, 100%, 70%, ${a * 0.3})`;
          ctx.lineWidth = p.size * 0.5 * scale;
          ctx.stroke();
        }

        // Spark head
        ctx.fillStyle = `hsla(${p.hue}, 100%, ${70 + a * 30}%, ${a})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * scale * a, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Keep shells manageable
    if (this.shells.length > 8) this.shells.splice(0, this.shells.length - 8);
  }
}
