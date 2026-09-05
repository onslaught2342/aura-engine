export interface EffectParams {
  intensity: number;   // 0-100
  scale: number;       // 0.1-3
  turbulence: number;  // 0-100
  direction: number;   // 0-360
  particleCount?: number;  // 10-2000
  blur?: number;           // 0-20
  glow?: number;           // 0-100
  rotation?: number;       // 0-360
  colorSecondary?: string; // secondary hue
  // Wave/cycle params
  frequency?: number;      // 0.1-10
  amplitude?: number;      // 0-100
  phase?: number;          // 0-360
  decay?: number;          // 0-100
  colorMode?: "solid" | "gradient" | "rainbow" | "temperature";
}

export const DEFAULT_PARAMS: EffectParams = {
  intensity: 50,
  scale: 1,
  turbulence: 50,
  direction: 180,
};

export interface BackgroundLayer {
  render(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, params?: EffectParams): void;
  resize?(width: number, height: number): void;
}
