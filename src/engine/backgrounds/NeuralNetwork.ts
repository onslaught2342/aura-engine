import type { BackgroundLayer, EffectParams } from "./types";
import { DEFAULT_PARAMS } from "./types";

interface Node { x: number; y: number; vx: number; vy: number; radius: number; pulse: number; hue: number; }
interface DataPacket { fromIdx: number; toIdx: number; progress: number; speed: number; }

export class NeuralNetwork implements BackgroundLayer {
  private nodes: Node[] = [];
  private packets: DataPacket[] = [];
  private w: number; private h: number;
  private baseHue: number;

  constructor(w: number, h: number, color = "180") {
    this.w = w; this.h = h;
    this.baseHue = parseInt(color) || 180;
    this.initNodes(40);
  }

  private initNodes(count: number) {
    this.nodes = [];
    for (let i = 0; i < count; i++) {
      this.nodes.push({ x: Math.random() * this.w, y: Math.random() * this.h, vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5, radius: 3 + Math.random() * 4, pulse: Math.random() * Math.PI * 2, hue: Math.random() * 40 - 20 });
    }
  }

  resize(w: number, h: number) { this.w = w; this.h = h; }

  render(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, params: EffectParams = DEFAULT_PARAMS) {
    const iMul = params.intensity / 50;
    const sMul = params.scale;
    const tMul = params.turbulence / 50;
    const connDist = 150 * sMul;
    const targetNodes = Math.floor(40 * iMul);
    while (this.nodes.length < targetNodes) this.nodes.push({ x: Math.random()*width, y: Math.random()*height, vx: (Math.random()-0.5)*0.5, vy: (Math.random()-0.5)*0.5, radius: 3+Math.random()*4, pulse: Math.random()*Math.PI*2, hue: Math.random()*40-20 });
    if (this.nodes.length > targetNodes) this.nodes.length = targetNodes;

    // Move nodes
    for (const n of this.nodes) {
      n.x += n.vx * tMul; n.y += n.vy * tMul;
      if (n.x < 0 || n.x > width) n.vx *= -1;
      if (n.y < 0 || n.y > height) n.vy *= -1;
      n.x = Math.max(0, Math.min(width, n.x));
      n.y = Math.max(0, Math.min(height, n.y));
    }

    // Draw connections
    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const a = this.nodes[i], b = this.nodes[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < connDist) {
          const alpha = (1 - dist / connDist) * 0.4 * iMul;
          ctx.strokeStyle = `hsla(${this.baseHue}, 60%, 55%, ${alpha})`;
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
    }

    // Spawn data packets
    if (Math.random() < 0.05 * iMul && this.nodes.length > 1) {
      const from = Math.floor(Math.random() * this.nodes.length);
      let to = Math.floor(Math.random() * this.nodes.length);
      if (to === from) to = (to + 1) % this.nodes.length;
      this.packets.push({ fromIdx: from, toIdx: to, progress: 0, speed: 0.01 + Math.random() * 0.02 });
    }

    // Draw packets
    this.packets = this.packets.filter(p => p.progress < 1);
    for (const p of this.packets) {
      p.progress += p.speed * iMul;
      if (p.fromIdx >= this.nodes.length || p.toIdx >= this.nodes.length) continue;
      const a = this.nodes[p.fromIdx], b = this.nodes[p.toIdx];
      const px = a.x + (b.x - a.x) * p.progress;
      const py = a.y + (b.y - a.y) * p.progress;
      ctx.beginPath();
      ctx.arc(px, py, 2.5 * sMul, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${this.baseHue + 60}, 90%, 70%, ${0.9 * iMul})`;
      ctx.fill();
      ctx.shadowColor = `hsla(${this.baseHue + 60}, 90%, 70%, 0.5)`;
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Draw nodes
    for (const n of this.nodes) {
      const pulseR = n.radius * sMul * (1 + Math.sin(time * 0.003 + n.pulse) * 0.2);
      // Outer glow
      const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, pulseR * 3);
      grad.addColorStop(0, `hsla(${this.baseHue + n.hue}, 80%, 60%, ${0.15 * iMul})`);
      grad.addColorStop(1, `hsla(${this.baseHue + n.hue}, 80%, 60%, 0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(n.x - pulseR * 3, n.y - pulseR * 3, pulseR * 6, pulseR * 6);
      // Core
      ctx.beginPath();
      ctx.arc(n.x, n.y, pulseR, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${this.baseHue + n.hue}, 80%, 70%, ${0.8 * iMul})`;
      ctx.fill();
    }
  }
}
