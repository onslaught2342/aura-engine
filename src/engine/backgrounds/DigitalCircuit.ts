import type { BackgroundLayer, EffectParams } from "./types";
import { DEFAULT_PARAMS } from "./types";

interface Node {
  x: number;
  y: number;
  connections: number[];
  pulse: number;
  pulseSpeed: number;
  size: number;
}

interface Signal {
  fromNode: number;
  toNode: number;
  progress: number;
  speed: number;
  hueShift: number;
}

export class DigitalCircuit implements BackgroundLayer {
  private nodes: Node[] = [];
  private signals: Signal[] = [];
  private baseHue: number;
  private w: number;
  private h: number;

  constructor(w: number, h: number, color = "160") {
    this.baseHue = parseFloat(color) || 160;
    this.w = w;
    this.h = h;
    this.init(w, h);
  }

  private init(w: number, h: number) {
    const cols = 12;
    const rows = 8;
    const cellW = w / cols;
    const cellH = h / rows;
    this.nodes = [];
    this.signals = [];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        const connections: number[] = [];
        if (c < cols - 1) connections.push(idx + 1);
        if (r < rows - 1) connections.push(idx + cols);
        if (c < cols - 1 && r < rows - 1 && Math.random() > 0.6) connections.push(idx + cols + 1);

        this.nodes.push({
          x: cellW * (c + 0.5) + (Math.random() - 0.5) * cellW * 0.4,
          y: cellH * (r + 0.5) + (Math.random() - 0.5) * cellH * 0.4,
          connections,
          pulse: Math.random() * Math.PI * 2,
          pulseSpeed: 0.5 + Math.random() * 2,
          size: 2 + Math.random() * 3,
        });
      }
    }
  }

  resize(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.init(w, h);
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, params: EffectParams = DEFAULT_PARAMS) {
    const t = time * 0.001;
    const intensityMul = params.intensity / 50;
    const scaleMul = params.scale;
    const turbMul = params.turbulence / 50;

    // Spawn signals
    if (Math.random() < 0.08 * intensityMul) {
      const fromIdx = Math.floor(Math.random() * this.nodes.length);
      const node = this.nodes[fromIdx];
      if (node.connections.length > 0) {
        const toIdx = node.connections[Math.floor(Math.random() * node.connections.length)];
        this.signals.push({
          fromNode: fromIdx,
          toNode: toIdx,
          progress: 0,
          speed: 0.3 + Math.random() * 0.7,
          hueShift: (Math.random() - 0.5) * 40,
        });
      }
    }

    // Draw traces (connections)
    for (const node of this.nodes) {
      const idx = this.nodes.indexOf(node);
      for (const connIdx of node.connections) {
        const target = this.nodes[connIdx];
        if (!target) continue;
        ctx.beginPath();
        ctx.moveTo(node.x, node.y);

        // Right-angle traces like PCB
        const midX = target.x;
        const midY = node.y;
        ctx.lineTo(midX, midY);
        ctx.lineTo(target.x, target.y);

        ctx.strokeStyle = `hsla(${this.baseHue}, 70%, 30%, ${0.15 * intensityMul})`;
        ctx.lineWidth = 1 * scaleMul;
        ctx.stroke();
      }
    }

    // Draw signals
    for (let i = this.signals.length - 1; i >= 0; i--) {
      const sig = this.signals[i];
      sig.progress += sig.speed * 0.016;

      if (sig.progress >= 1) {
        this.signals.splice(i, 1);
        continue;
      }

      const from = this.nodes[sig.fromNode];
      const to = this.nodes[sig.toNode];
      if (!from || !to) continue;

      // Interpolate along the right-angle path
      let sx: number, sy: number;
      if (sig.progress < 0.5) {
        const p = sig.progress * 2;
        sx = from.x + (to.x - from.x) * p;
        sy = from.y;
      } else {
        const p = (sig.progress - 0.5) * 2;
        sx = to.x;
        sy = from.y + (to.y - from.y) * p;
      }

      const hue = this.baseHue + sig.hueShift;
      const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, 12 * scaleMul);
      glow.addColorStop(0, `hsla(${hue}, 100%, 70%, ${0.9 * intensityMul})`);
      glow.addColorStop(0.5, `hsla(${hue}, 90%, 50%, ${0.3 * intensityMul})`);
      glow.addColorStop(1, `hsla(${hue}, 80%, 40%, 0)`);
      ctx.fillStyle = glow;
      ctx.fillRect(sx - 12 * scaleMul, sy - 12 * scaleMul, 24 * scaleMul, 24 * scaleMul);
    }

    // Draw nodes
    for (const node of this.nodes) {
      const pulseAlpha = 0.4 + 0.4 * Math.sin(node.pulse + t * node.pulseSpeed);
      const wobble = Math.sin(t * turbMul + node.pulse) * 2 * turbMul;
      const nx = node.x + wobble;
      const ny = node.y + wobble;
      const sz = node.size * scaleMul;

      // Outer glow
      const g = ctx.createRadialGradient(nx, ny, 0, nx, ny, sz * 4);
      g.addColorStop(0, `hsla(${this.baseHue}, 100%, 60%, ${pulseAlpha * 0.5 * intensityMul})`);
      g.addColorStop(1, `hsla(${this.baseHue}, 100%, 40%, 0)`);
      ctx.fillStyle = g;
      ctx.fillRect(nx - sz * 4, ny - sz * 4, sz * 8, sz * 8);

      // Core
      ctx.beginPath();
      ctx.arc(nx, ny, sz, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${this.baseHue}, 80%, 65%, ${pulseAlpha * intensityMul})`;
      ctx.fill();
    }
  }
}
