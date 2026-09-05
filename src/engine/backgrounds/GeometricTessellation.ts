import type { BackgroundLayer, EffectParams } from "./types";
import { DEFAULT_PARAMS } from "./types";

interface Tile {
  cx: number;
  cy: number;
  sides: number;
  size: number;
  rotation: number;
  rotSpeed: number;
  hueOffset: number;
  phase: number;
}

export class GeometricTessellation implements BackgroundLayer {
  private tiles: Tile[] = [];
  private baseHue: number;

  constructor(w: number, h: number, color = "270") {
    this.baseHue = parseFloat(color) || 270;
    this.init(w, h);
  }

  private init(w: number, h: number) {
    this.tiles = [];
    const gridSize = 80;
    const cols = Math.ceil(w / gridSize) + 1;
    const rows = Math.ceil(h / gridSize) + 1;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const offsetX = (r % 2) * gridSize * 0.5;
        this.tiles.push({
          cx: c * gridSize + offsetX,
          cy: r * gridSize,
          sides: [3, 4, 5, 6][Math.floor(Math.random() * 4)],
          size: gridSize * (0.25 + Math.random() * 0.2),
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.3,
          hueOffset: Math.random() * 60 - 30,
          phase: Math.random() * Math.PI * 2,
        });
      }
    }
  }

  resize(w: number, h: number) {
    this.init(w, h);
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, params: EffectParams = DEFAULT_PARAMS) {
    const t = time * 0.001;
    const intensityMul = params.intensity / 50;
    const scaleMul = params.scale;
    const turbMul = params.turbulence / 50;

    for (const tile of this.tiles) {
      const pulse = 0.8 + 0.2 * Math.sin(t * 0.5 + tile.phase);
      const sz = tile.size * scaleMul * pulse;
      const rot = tile.rotation + t * tile.rotSpeed * turbMul;
      const morphSides = tile.sides + Math.sin(t * 0.3 + tile.phase) * 0.5 * turbMul;
      const sides = Math.max(3, Math.round(morphSides));
      const hue = this.baseHue + tile.hueOffset + Math.sin(t * 0.2 + tile.phase) * 20;
      const alpha = (0.15 + 0.15 * Math.sin(t * 0.4 + tile.phase)) * intensityMul;

      ctx.save();
      ctx.translate(tile.cx, tile.cy);
      ctx.rotate(rot);

      // Draw polygon
      ctx.beginPath();
      for (let i = 0; i <= sides; i++) {
        const angle = (i / sides) * Math.PI * 2;
        const x = Math.cos(angle) * sz;
        const y = Math.sin(angle) * sz;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();

      // Fill with gradient
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, sz);
      g.addColorStop(0, `hsla(${hue}, 70%, 55%, ${alpha * 0.6})`);
      g.addColorStop(1, `hsla(${hue + 30}, 60%, 35%, ${alpha * 0.2})`);
      ctx.fillStyle = g;
      ctx.fill();

      // Stroke
      ctx.strokeStyle = `hsla(${hue}, 80%, 60%, ${alpha * 1.5})`;
      ctx.lineWidth = 1 * scaleMul;
      ctx.stroke();

      ctx.restore();
    }
  }
}
