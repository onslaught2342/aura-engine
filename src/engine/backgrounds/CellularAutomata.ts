import type { BackgroundLayer, EffectParams } from "./types";
import { DEFAULT_PARAMS } from "./types";

export class CellularAutomata implements BackgroundLayer {
  private grid: number[] = [];
  private nextGrid: number[] = [];
  private cols = 0;
  private rows = 0;
  private cellSize = 8;
  private baseHue: number;
  private lastStep = 0;

  constructor(w: number, h: number, color = "120") {
    this.baseHue = parseFloat(color) || 120;
    this.init(w, h);
  }

  private init(w: number, h: number) {
    this.cols = Math.ceil(w / this.cellSize);
    this.rows = Math.ceil(h / this.cellSize);
    const len = this.cols * this.rows;
    this.grid = new Array(len);
    this.nextGrid = new Array(len);
    for (let i = 0; i < len; i++) {
      this.grid[i] = Math.random() > 0.7 ? 1 : 0;
      this.nextGrid[i] = 0;
    }
  }

  resize(w: number, h: number) { this.init(w, h); }

  private step(turb: number) {
    const { cols, rows, grid, nextGrid } = this;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        let neighbors = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = (x + dx + cols) % cols;
            const ny = (y + dy + rows) % rows;
            neighbors += grid[ny * cols + nx];
          }
        }
        const idx = y * cols + x;
        const alive = grid[idx];
        // Classic Conway with slight turbulence variation
        const birthMin = 3;
        const surviveMin = 2;
        const surviveMax = 3;
        if (alive) {
          nextGrid[idx] = (neighbors >= surviveMin && neighbors <= surviveMax) ? 1 : 0;
        } else {
          nextGrid[idx] = neighbors === birthMin ? 1 : 0;
        }
        // Spontaneous generation from turbulence
        if (!nextGrid[idx] && Math.random() < 0.001 * turb) {
          nextGrid[idx] = 1;
        }
      }
    }
    // Swap
    const tmp = this.grid;
    this.grid = this.nextGrid;
    this.nextGrid = tmp;
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, params: EffectParams = DEFAULT_PARAMS) {
    const t = time * 0.001;
    const intensity = params.intensity / 50;
    const scale = params.scale;
    const turb = params.turbulence / 50;

    // Step simulation ~15 times per second
    if (t - this.lastStep > 0.066) {
      this.step(turb);
      this.lastStep = t;
    }

    const cs = this.cellSize * scale;
    const { cols, rows, grid } = this;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (grid[y * cols + x]) {
          const hue = this.baseHue + (x + y) * 0.5 + t * 5;
          const alpha = 0.25 * intensity;
          ctx.fillStyle = `hsla(${hue}, 65%, 50%, ${alpha})`;
          ctx.fillRect(x * cs, y * cs, cs - 0.5, cs - 0.5);
        }
      }
    }
  }
}
