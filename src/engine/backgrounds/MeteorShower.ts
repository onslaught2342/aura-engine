import type { BackgroundLayer, EffectParams } from "./types";
import { DEFAULT_PARAMS } from "./types";

interface Star {
  x: number; y: number; size: number; brightness: number; twinkle: number;
}

interface Spark {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; size: number; hue: number;
}

interface Meteor {
  x: number; y: number; vx: number; vy: number;
  speed: number; size: number; life: number; maxLife: number;
  trail: { x: number; y: number; alpha: number }[];
  sparks: Spark[];
  hue: number; brightness: number;
  fragmenting: boolean;
}

interface IonTrail {
  points: { x: number; y: number }[];
  alpha: number; hue: number; width: number;
}

interface SmokeWisp {
  x: number; y: number; radius: number; alpha: number; drift: number;
}

export class MeteorShower implements BackgroundLayer {
  private stars: Star[] = [];
  private meteors: Meteor[] = [];
  private ionTrails: IonTrail[] = [];
  private smokeWisps: SmokeWisp[] = [];
  private lastSpawn = 0;

  constructor(private w: number, private h: number, private color: string = "30") {
    this.initStars(200);
  }

  private initStars(count: number) {
    this.stars = [];
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random(), y: Math.random(),
        size: 0.3 + Math.random() * 1.5,
        brightness: 0.2 + Math.random() * 0.8,
        twinkle: Math.random() * Math.PI * 2,
      });
    }
  }

  resize(w: number, h: number) { this.w = w; this.h = h; }

  private spawnMeteor(w: number, h: number, direction: number, scale: number) {
    const entryAngle = ((direction - 30 + Math.random() * 60) / 180) * Math.PI;
    const speed = 4 + Math.random() * 8;
    const side = Math.random();
    let x: number, y: number;
    if (side < 0.6) { x = Math.random() * w; y = -20; }
    else if (side < 0.8) { x = w + 20; y = Math.random() * h * 0.4; }
    else { x = Math.random() * w * 0.5 + w * 0.5; y = -20; }

    const hue = parseInt(this.color) || 30;
    const meteor: Meteor = {
      x, y,
      vx: Math.cos(entryAngle) * speed,
      vy: Math.sin(entryAngle) * speed,
      speed, size: (1.5 + Math.random() * 3) * scale,
      life: 0, maxLife: 60 + Math.random() * 120,
      trail: [], sparks: [],
      hue: hue + Math.random() * 40 - 20,
      brightness: 0.7 + Math.random() * 0.3,
      fragmenting: Math.random() < 0.4,
    };
    this.meteors.push(meteor);
  }

  /** Atmospheric scattering color: high altitude = blue, low = orange/red */
  private atmosphereColor(yNorm: number): { h: number; s: number; l: number } {
    if (yNorm < 0.3) return { h: 220, s: 60, l: 80 };  // blue-white at high altitude
    if (yNorm < 0.5) return { h: 180, s: 50, l: 75 };  // cyan
    if (yNorm < 0.7) return { h: 50, s: 80, l: 70 };   // yellow
    if (yNorm < 0.85) return { h: 30, s: 90, l: 60 };  // orange
    return { h: 15, s: 95, l: 50 };                      // red near ground
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, params: EffectParams = DEFAULT_PARAMS) {
    const { intensity, scale, turbulence, direction } = params;
    const t = time * 0.001;
    const hue = parseInt(this.color) || 30;
    const spawnRate = Math.max(1, Math.floor(60 / (intensity / 10 + 1)));

    // Adjust star count
    const targetStars = Math.floor(100 + intensity * 2);
    while (this.stars.length < targetStars) {
      this.stars.push({ x: Math.random(), y: Math.random(), size: 0.3 + Math.random() * 1.5, brightness: 0.2 + Math.random() * 0.8, twinkle: Math.random() * Math.PI * 2 });
    }
    if (this.stars.length > targetStars) this.stars.length = targetStars;

    // Background stars
    for (const s of this.stars) {
      const twinkle = 0.5 + 0.5 * Math.sin(t * 2 + s.twinkle);
      const alpha = s.brightness * twinkle;
      ctx.beginPath();
      ctx.arc(s.x * width, s.y * height, s.size * scale * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hue + 60}, 20%, 90%, ${alpha})`;
      ctx.fill();
    }

    // Spawn meteors
    this.lastSpawn++;
    if (this.lastSpawn >= spawnRate) {
      this.spawnMeteor(width, height, direction, scale);
      this.lastSpawn = 0;
    }

    // Update smoke wisps
    for (let i = this.smokeWisps.length - 1; i >= 0; i--) {
      const w = this.smokeWisps[i];
      w.radius += 0.3;
      w.alpha -= 0.004;
      w.x += w.drift;
      if (w.alpha <= 0) { this.smokeWisps.splice(i, 1); continue; }
      ctx.beginPath();
      ctx.arc(w.x, w.y, w.radius, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hue + 20}, 20%, 50%, ${w.alpha * 0.15})`;
      ctx.fill();
    }
    if (this.smokeWisps.length > 40) this.smokeWisps.splice(0, this.smokeWisps.length - 40);

    // Update and render ion trails
    for (let i = this.ionTrails.length - 1; i >= 0; i--) {
      const trail = this.ionTrails[i];
      trail.alpha -= 0.003;
      if (trail.alpha <= 0) { this.ionTrails.splice(i, 1); continue; }
      if (trail.points.length > 1) {
        ctx.beginPath();
        ctx.moveTo(trail.points[0].x, trail.points[0].y);
        for (let j = 1; j < trail.points.length; j++) ctx.lineTo(trail.points[j].x, trail.points[j].y);
        ctx.strokeStyle = `hsla(${trail.hue}, 60%, 70%, ${trail.alpha * 0.3})`;
        ctx.lineWidth = trail.width;
        ctx.stroke();
      }
    }

    // Update and render meteors
    for (let i = this.meteors.length - 1; i >= 0; i--) {
      const m = this.meteors[i];
      m.life++;

      m.vy += 0.02;
      m.vx += (Math.random() - 0.5) * turbulence * 0.002;
      m.vy += (Math.random() - 0.5) * turbulence * 0.001;
      m.x += m.vx;
      m.y += m.vy;

      m.trail.unshift({ x: m.x, y: m.y, alpha: 1 });
      if (m.trail.length > 40) m.trail.pop();
      for (const tp of m.trail) tp.alpha *= 0.94;

      const lifeRatio = m.life / m.maxLife;
      const fadeAlpha = lifeRatio > 0.7 ? 1 - (lifeRatio - 0.7) / 0.3 : 1;
      const yNorm = Math.min(1, Math.max(0, m.y / height));

      // Spawn smoke wisps along trail
      if (m.life % 5 === 0 && lifeRatio < 0.8) {
        this.smokeWisps.push({
          x: m.x + (Math.random() - 0.5) * 5,
          y: m.y + (Math.random() - 0.5) * 5,
          radius: 2 + Math.random() * 4,
          alpha: 0.5 + Math.random() * 0.3,
          drift: (Math.random() - 0.5) * 0.3,
        });
      }

      // Fragmentation sparks
      if (m.fragmenting && m.life % 3 === 0 && lifeRatio < 0.8) {
        const sparkCount = 1 + Math.floor(Math.random() * 2);
        for (let s = 0; s < sparkCount; s++) {
          m.sparks.push({
            x: m.x, y: m.y,
            vx: m.vx * 0.3 + (Math.random() - 0.5) * 3,
            vy: m.vy * 0.3 + (Math.random() - 0.5) * 3,
            life: 0, maxLife: 15 + Math.random() * 20,
            size: 0.5 + Math.random() * 1.2,
            hue: m.hue + Math.random() * 30,
          });
        }
      }

      // Update sparks
      for (let s = m.sparks.length - 1; s >= 0; s--) {
        const sp = m.sparks[s];
        sp.x += sp.vx; sp.y += sp.vy;
        sp.vy += 0.05; sp.life++;
        if (sp.life >= sp.maxLife) { m.sparks.splice(s, 1); continue; }
        const sparkAlpha = (1 - sp.life / sp.maxLife) * fadeAlpha;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.size * scale, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${sp.hue}, 90%, ${70 + sp.life}%, ${sparkAlpha})`;
        ctx.fill();
      }

      // Draw meteor trail with atmospheric scattering colors
      if (m.trail.length > 1) {
        for (let j = 0; j < m.trail.length - 1; j++) {
          const p1 = m.trail[j], p2 = m.trail[j + 1];
          const segAlpha = p1.alpha * fadeAlpha;
          if (segAlpha < 0.01) continue;
          const progress = j / m.trail.length;
          const trailYNorm = Math.min(1, Math.max(0, p1.y / height));
          const atmo = this.atmosphereColor(trailYNorm);
          const segWidth = m.size * scale * (1 - progress * 0.8);

          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = `hsla(${atmo.h}, ${atmo.s}%, ${atmo.l}%, ${segAlpha * 0.7})`;
          ctx.lineWidth = segWidth;
          ctx.lineCap = "round";
          ctx.stroke();
        }
      }

      // Atmospheric glow around head (color shifts with altitude)
      const atmoHead = this.atmosphereColor(yNorm);
      const glowR = m.size * scale * 6;
      const glowGrad = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, glowR);
      glowGrad.addColorStop(0, `hsla(60, 100%, 98%, ${0.8 * fadeAlpha})`);
      glowGrad.addColorStop(0.15, `hsla(${atmoHead.h}, 100%, 85%, ${0.5 * fadeAlpha})`);
      glowGrad.addColorStop(0.4, `hsla(${atmoHead.h + 20}, 90%, 60%, ${0.2 * fadeAlpha})`);
      glowGrad.addColorStop(1, `hsla(${atmoHead.h + 30}, 80%, 30%, 0)`);
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(m.x, m.y, glowR, 0, Math.PI * 2);
      ctx.fill();

      // Ground flash illumination when meteor is near bottom
      if (yNorm > 0.75 && fadeAlpha > 0.3) {
        const flashAlpha = (yNorm - 0.75) * 4 * fadeAlpha * 0.08;
        const flashGrad = ctx.createRadialGradient(m.x, height, 0, m.x, height, height * 0.3);
        flashGrad.addColorStop(0, `hsla(${m.hue}, 80%, 70%, ${flashAlpha})`);
        flashGrad.addColorStop(1, `hsla(${m.hue}, 80%, 70%, 0)`);
        ctx.fillStyle = flashGrad;
        ctx.fillRect(0, height * 0.7, width, height * 0.3);
      }

      // Bright head
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.size * scale * 0.8, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(60, 100%, 97%, ${fadeAlpha})`;
      ctx.fill();

      // Remove dead meteors
      if (m.life >= m.maxLife || m.x < -50 || m.x > width + 50 || m.y > height + 50) {
        if (m.trail.length > 2) {
          this.ionTrails.push({
            points: m.trail.map(tp => ({ x: tp.x, y: tp.y })),
            alpha: 0.5, hue: m.hue, width: m.size * scale * 0.3,
          });
        }
        this.meteors.splice(i, 1);
      }
    }

    if (this.ionTrails.length > 20) this.ionTrails.splice(0, this.ionTrails.length - 20);
  }
}
