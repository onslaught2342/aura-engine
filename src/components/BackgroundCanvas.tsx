import { useEffect, useRef } from "react";
import type { SlideBackground, EffectLayer, PerformanceConfig } from "@/engine/config";
import type { BackgroundLayer, EffectParams } from "@/engine/backgrounds/types";
import { backgroundRegistry } from "@/engine/backgrounds/registry";
import { sanitizeFilter, sanitizeRgbTriplet } from "@/lib/cssSanitize";

interface Props {
  background: SlideBackground;
  transitionDuration: number;
  performance?: PerformanceConfig;
}

interface LayerState {
  layer: BackgroundLayer;
  type: string;
  color: string;
}

// ── LRU Cache for effect instances ──
class EffectCache {
  private cache = new Map<string, { layer: BackgroundLayer; lastUsed: number }>();
  private maxSize: number;

  constructor(maxSize = 10) {
    this.maxSize = maxSize;
  }

  get(key: string): BackgroundLayer | null {
    const entry = this.cache.get(key);
    if (entry) {
      entry.lastUsed = Date.now();
      return entry.layer;
    }
    return null;
  }

  set(key: string, layer: BackgroundLayer): void {
    if (this.cache.size >= this.maxSize) {
      // Evict least recently used
      let oldestKey = "";
      let oldestTime = Infinity;
      for (const [k, v] of this.cache) {
        if (v.lastUsed < oldestTime) {
          oldestTime = v.lastUsed;
          oldestKey = k;
        }
      }
      if (oldestKey) this.cache.delete(oldestKey);
    }
    this.cache.set(key, { layer, lastUsed: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }
}

// Module-level cache shared across renders but scoped to component lifetime via ref
const globalEffectCache = new EffectCache(12);

export const BackgroundCanvas = ({ background, transitionDuration, performance }: Props) => {
  const canvasARef = useRef<HTMLCanvasElement>(null);
  const canvasBRef = useRef<HTMLCanvasElement>(null);
  const extraCanvasesRef = useRef<HTMLCanvasElement[]>([]);
  const extraLayersRef = useRef<LayerState[]>([]);
  const layerARef = useRef<LayerState | null>(null);
  const layerBRef = useRef<LayerState | null>(null);
  const activeRef = useRef<"A" | "B">("A");
  const fadeRef = useRef({ progress: 1, startTime: 0, duration: transitionDuration });
  const rafRef = useRef<number>(0);
  const prevBgRef = useRef<string>("");
  const containerRef = useRef<HTMLDivElement>(null);
  const prevLayerKeysRef = useRef<string>("");
  const lastFrameTime = useRef<number>(0);

  useEffect(() => { fadeRef.current.duration = transitionDuration; }, [transitionDuration]);

  // Helper: get or create a BackgroundLayer with LRU caching
  const getOrCreateLayer = (type: string, color: string, w: number, h: number): BackgroundLayer | null => {
    const key = `${type}-${color}`;
    const cached = globalEffectCache.get(key);
    if (cached) {
      cached.resize?.(w, h);
      return cached;
    }
    const factory = backgroundRegistry[type];
    if (!factory) return null;
    const layer = factory(w, h, color);
    globalEffectCache.set(key, layer);
    return layer;
  };

  useEffect(() => {
    const canvasA = canvasARef.current;
    const canvasB = canvasBRef.current;
    const container = containerRef.current;
    if (!canvasA || !canvasB || !container) return;
    const ctxA = canvasA.getContext("2d");
    const ctxB = canvasB.getContext("2d");
    if (!ctxA || !ctxB) return;

    const res = performance?.resolution ?? 1;
    const maxFPS = performance?.maxFPS ?? 60;
    const frameInterval = 1000 / maxFPS;

    // Build the effectLayers list
    const effectLayers: EffectLayer[] = [];
    if (background.effectLayers && background.effectLayers.length > 0) {
      effectLayers.push(...background.effectLayers);
    } else if (background.secondaryEffect) {
      effectLayers.push({
        type: background.secondaryEffect,
        color: background.secondaryColor,
        opacity: background.secondaryOpacity,
        blendMode: background.blendMode,
        intensity: background.intensity,
        scale: background.scale,
        turbulence: background.turbulence,
        direction: background.direction,
        speed: background.speed,
        saturation: background.saturation,
        brightness: background.brightness,
        particleCount: 200,
        colorSecondary: "180",
        blur: 0, glow: 0, rotation: 0,
        mirror: false, invert: false, noiseAmount: 0,
        frequency: 1, amplitude: 50, phase: 0, decay: 0, colorMode: "solid",
      });
    }

    // Create/update extra canvases for effect layers
    const layerKey = effectLayers.map(l => `${l.type}-${l.color}`).join("|");
    if (layerKey !== prevLayerKeysRef.current) {
      extraCanvasesRef.current.forEach(c => c.remove());
      extraCanvasesRef.current = [];
      extraLayersRef.current = [];

      for (const el of effectLayers) {
        const canvas = document.createElement("canvas");
        canvas.style.cssText = "position:fixed;inset:0;width:100%;height:100%;z-index:0;pointer-events:none";
        const w = Math.floor(window.innerWidth * res);
        const h = Math.floor(window.innerHeight * res);
        canvas.width = w;
        canvas.height = h;
        container.appendChild(canvas);
        extraCanvasesRef.current.push(canvas);

        const layer = getOrCreateLayer(el.type, el.color, w, h);
        if (layer) {
          extraLayersRef.current.push({ layer, type: el.type, color: el.color });
        }
      }
      prevLayerKeysRef.current = layerKey;
    }

    const resize = () => {
      const w = Math.floor(window.innerWidth * res);
      const h = Math.floor(window.innerHeight * res);
      canvasA.width = canvasB.width = w;
      canvasA.height = canvasB.height = h;
      layerARef.current?.layer.resize?.(w, h);
      layerBRef.current?.layer.resize?.(w, h);
      for (let i = 0; i < extraCanvasesRef.current.length; i++) {
        extraCanvasesRef.current[i].width = w;
        extraCanvasesRef.current[i].height = h;
        extraLayersRef.current[i]?.layer.resize?.(w, h);
      }
    };

    const bgKey = `${background.type}-${background.color}`;
    if (prevBgRef.current && prevBgRef.current !== bgKey) {
      const incoming = activeRef.current === "A" ? "B" : "A";
      const w = Math.floor(window.innerWidth * res);
      const h = Math.floor(window.innerHeight * res);
      const layer = getOrCreateLayer(background.type, background.color, w, h);
      if (layer) {
        const ref = incoming === "A" ? layerARef : layerBRef;
        ref.current = { layer, type: background.type, color: background.color };
      }
      activeRef.current = incoming;
      fadeRef.current = { progress: 0, startTime: globalThis.performance.now(), duration: fadeRef.current.duration };
    } else if (!prevBgRef.current) {
      const w = Math.floor(window.innerWidth * res);
      const h = Math.floor(window.innerHeight * res);
      const layer = getOrCreateLayer(background.type, background.color, w, h);
      if (layer) {
        layerARef.current = { layer, type: background.type, color: background.color };
      }
    }
    prevBgRef.current = bgKey;

    resize();
    window.addEventListener("resize", resize);

    const params: EffectParams = {
      intensity: background.intensity,
      scale: background.scale,
      turbulence: background.turbulence,
      direction: background.direction,
    };

    const loop = (time: number) => {
      if (time - lastFrameTime.current < frameInterval) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }
      lastFrameTime.current = time;

      const adjustedTime = time * background.speed;
      if (fadeRef.current.progress < 1) {
        fadeRef.current.progress = Math.min(1, (time - fadeRef.current.startTime) / fadeRef.current.duration);
      }

      const fadeIn = fadeRef.current.progress;
      const fadeOut = 1 - fadeIn;
      const activeIsA = activeRef.current === "A";
      const inCtx = activeIsA ? ctxA : ctxB;
      const outCtx = activeIsA ? ctxB : ctxA;
      const inLayer = activeIsA ? layerARef.current : layerBRef.current;
      const outLayer = activeIsA ? layerBRef.current : layerARef.current;
      const inCanvas = activeIsA ? canvasA : canvasB;
      const outCanvas = activeIsA ? canvasB : canvasA;

      params.intensity = background.intensity;
      params.scale = background.scale;
      params.turbulence = background.turbulence;
      params.direction = background.direction;

      if (outLayer && fadeOut > 0.01) {
        outCtx.clearRect(0, 0, outCanvas.width, outCanvas.height);
        outCtx.save();
        outCtx.globalAlpha = background.opacity * fadeOut;
        outCtx.globalCompositeOperation = background.blendMode;
        outLayer.layer.render(outCtx, outCanvas.width, outCanvas.height, adjustedTime, params);
        outCtx.restore();
        outCanvas.style.opacity = "1";
      } else {
        outCtx.clearRect(0, 0, outCanvas.width, outCanvas.height);
        outCanvas.style.opacity = "0";
      }

      if (inLayer) {
        inCtx.clearRect(0, 0, inCanvas.width, inCanvas.height);
        inCtx.save();
        inCtx.globalAlpha = background.opacity * fadeIn;
        inCtx.globalCompositeOperation = background.blendMode;
        inLayer.layer.render(inCtx, inCanvas.width, inCanvas.height, adjustedTime, params);
        inCtx.restore();
        inCanvas.style.opacity = "1";
      }

      // Extra effect layers
      for (let i = 0; i < extraCanvasesRef.current.length; i++) {
        const eCanvas = extraCanvasesRef.current[i];
        const eLayer = extraLayersRef.current[i];
        const eConfig = effectLayers[i];
        if (!eLayer || !eConfig) continue;

        const eCtx = eCanvas.getContext("2d");
        if (!eCtx) continue;

        const layerParams: EffectParams = {
          intensity: eConfig.intensity,
          scale: eConfig.scale,
          turbulence: eConfig.turbulence,
          direction: eConfig.direction,
          particleCount: eConfig.particleCount,
          blur: eConfig.blur,
          glow: eConfig.glow,
          rotation: eConfig.rotation,
          colorSecondary: eConfig.colorSecondary,
          frequency: eConfig.frequency,
          amplitude: eConfig.amplitude,
          phase: eConfig.phase,
          decay: eConfig.decay,
          colorMode: eConfig.colorMode,
        };

        eCtx.clearRect(0, 0, eCanvas.width, eCanvas.height);
        eCtx.save();
        eCtx.globalAlpha = eConfig.opacity;
        eCtx.globalCompositeOperation = eConfig.blendMode;

        if (eConfig.rotation) {
          eCtx.translate(eCanvas.width / 2, eCanvas.height / 2);
          eCtx.rotate((eConfig.rotation * Math.PI) / 180);
          eCtx.translate(-eCanvas.width / 2, -eCanvas.height / 2);
        }

        if (eConfig.mirror) {
          eCtx.translate(eCanvas.width, 0);
          eCtx.scale(-1, 1);
        }

        eLayer.layer.render(eCtx, eCanvas.width, eCanvas.height, time * eConfig.speed, layerParams);
        eCtx.restore();

        const filters: string[] = [];
        if (eConfig.blur > 0) filters.push(`blur(${eConfig.blur}px)`);
        if (eConfig.invert) filters.push("invert(1)");
        if (eConfig.glow > 0) filters.push(`brightness(${1 + eConfig.glow / 100})`);
        if (eConfig.noiseAmount > 0) filters.push(`contrast(${1 + eConfig.noiseAmount / 200})`);
        eCanvas.style.filter = filters.length ? filters.join(" ") : "";
        eCanvas.style.opacity = "1";
      }

      if (background.pixelate > 0) {
        const px = background.pixelate;
        [inCanvas, outCanvas].forEach(c => {
          c.style.imageRendering = px > 0 ? "pixelated" : "auto";
        });
      }

      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [background, performance]);

  useEffect(() => {
    return () => {
      extraCanvasesRef.current.forEach(c => c.remove());
    };
  }, []);

  const canvasStyle = { position: "fixed" as const, inset: 0, width: "100%", height: "100%", zIndex: 0, pointerEvents: "none" as const };

  const safeVignetteColor = sanitizeRgbTriplet(background.vignetteColor) ?? "0,0,0";
  const vignetteStyle = background.vignetteStrength > 0 ? {
    position: "fixed" as const, inset: 0, width: "100%", height: "100%", zIndex: 0, pointerEvents: "none" as const,
    background: `radial-gradient(ellipse at center, transparent 40%, rgba(${safeVignetteColor}, ${background.vignetteStrength / 100}) 100%)`,
  } : undefined;

  const containerFilter = sanitizeFilter(background.colorFilter);
  const motionBlurFilter = background.motionBlur > 0 ? `blur(${background.motionBlur * 0.5}px)` : "";
  const combinedFilter = [containerFilter, motionBlurFilter].filter(Boolean).join(" ") || undefined;

  return (
    <div ref={containerRef} style={{ filter: combinedFilter }}>
      <canvas ref={canvasARef} style={canvasStyle} />
      <canvas ref={canvasBRef} style={canvasStyle} />
      {vignetteStyle && <div style={vignetteStyle} />}
    </div>
  );
};
