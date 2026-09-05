import type { BackgroundLayer, EffectParams } from "./types";
import { DEFAULT_PARAMS } from "./types";

interface Column {
  x: number; y: number; speed: number; chars: string[]; charSize: number; hue: number;
}

export class MatrixRain implements BackgroundLayer {
  private columns: Column[] = [];
  private color: string;
  private glyphs = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF";

  constructor(w: number, h: number, color = "120, 100%, 45%") {
    this.color = color; this.init(w, h);
  }

  private init(w: number, _h: number) {
    const charSize = 14;
    const cols = Math.ceil(w / charSize);
    const baseHue = parseInt(this.color) || 120;
    this.columns = Array.from({ length: cols }, (_, i) => {
      const chars: string[] = [];
      const len = 8 + Math.floor(Math.random() * 20);
      for (let j = 0; j < len; j++) chars.push(this.glyphs[Math.floor(Math.random() * this.glyphs.length)]);
      return { x: i * charSize, y: -Math.random() * 500, speed: 1 + Math.random() * 3, chars, charSize, hue: baseHue + Math.random() * 20 - 10 };
    });
  }

  resize(w: number, h: number) { this.init(w, h); }

  render(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, params: EffectParams = DEFAULT_PARAMS) {
    const scaleMul = params.scale;
    const fontSize = Math.round(14 * scaleMul);
    ctx.font = `${fontSize}px monospace`;
    ctx.textAlign = "center";
    const speedMul = params.intensity / 50;
    const turbMul = params.turbulence / 50;

    for (const col of this.columns) {
      col.y += col.speed * speedMul;
      if (Math.random() < 0.03 * turbMul) {
        const idx = Math.floor(Math.random() * col.chars.length);
        col.chars[idx] = this.glyphs[Math.floor(Math.random() * this.glyphs.length)];
      }

      for (let j = 0; j < col.chars.length; j++) {
        const cy = col.y + j * col.charSize * scaleMul;
        if (cy < -20 || cy > height + 20) continue;
        const isHead = j === col.chars.length - 1;
        const trailFade = 1 - j / col.chars.length;
        ctx.fillStyle = isHead
          ? `hsla(${col.hue}, 100%, 90%, 0.9)`
          : `hsla(${col.hue}, 100%, 50%, ${trailFade * 0.6})`;
        ctx.fillText(col.chars[j], col.x + col.charSize / 2, cy);
      }

      if (col.y > height + 20) {
        col.y = -col.chars.length * col.charSize * scaleMul - Math.random() * 200;
        col.speed = 1 + Math.random() * 3;
      }
    }
  }
}
