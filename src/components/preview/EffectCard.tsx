import { useEffect, useRef, useState, useCallback, memo } from "react";
import { backgroundRegistry } from "@/engine/backgrounds/registry";
import type { BackgroundLayer } from "@/engine/backgrounds/types";
import { DEFAULT_PARAMS } from "@/engine/backgrounds/types";

interface Props {
  effectKey: string;
  name: string;
  configPath?: string;
}

const W = 240;
const H = 160;

export const EffectCard = memo(({ effectKey, name, configPath }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<BackgroundLayer | null>(null);
  const rafRef = useRef<number>(0);
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(false);
  const hasSnapshot = useRef(false);

  // Intersection observer — only create layer when scrolled into view
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.05, rootMargin: "100px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Create layer + render a single static frame when first visible
  useEffect(() => {
    if (!visible || !canvasRef.current || hasSnapshot.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = W;
    canvas.height = H;

    const factory = backgroundRegistry[effectKey];
    if (!factory) return;
    layerRef.current = factory(W, H);

    // Render one snapshot frame at t=1000 so effects have some initial state
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "hsl(222.2, 84%, 4.9%)";
    ctx.fillRect(0, 0, W, H);
    layerRef.current.render(ctx, W, H, 1000, DEFAULT_PARAMS);
    hasSnapshot.current = true;
  }, [visible, effectKey]);

  // Animate only while hovered AND visible
  useEffect(() => {
    if (!hovered || !visible || !canvasRef.current || !layerRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const layer = layerRef.current;

    let running = true;
    const loop = (time: number) => {
      if (!running) return;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "hsl(222.2, 84%, 4.9%)";
      ctx.fillRect(0, 0, W, H);
      layer.render(ctx, W, H, time, DEFAULT_PARAMS);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [hovered, visible]);

  const onEnter = useCallback(() => setHovered(true), []);
  const onLeave = useCallback(() => setHovered(false), []);

  return (
    <div
      ref={containerRef}
      className="group flex flex-col items-center gap-2"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <div className="relative overflow-hidden rounded-xl border border-border/20 bg-background/5 backdrop-blur-sm shadow-lg transition-transform duration-200 group-hover:scale-105 group-hover:border-primary/40">
        <canvas
          ref={canvasRef}
          className="block w-[240px] h-[160px]"
          style={{ imageRendering: "auto" }}
        />
        {!visible && !hasSnapshot.current && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <span className="text-xs text-muted-foreground">Loading…</span>
          </div>
        )}
        {/* Play indicator */}
        {visible && hasSnapshot.current && !hovered && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-8 h-8 rounded-full bg-background/40 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-l-[10px] border-l-foreground/70 ml-0.5" />
            </div>
          </div>
        )}
        {configPath && (
          <div className="absolute inset-0 flex items-end justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
            <span className="mb-1.5 px-2 py-0.5 rounded bg-background/80 backdrop-blur-sm text-[9px] font-mono text-primary/90 border border-primary/20 max-w-[230px] truncate">
              {configPath}
            </span>
          </div>
        )}
      </div>
      <span className="text-xs font-medium text-foreground/80 tracking-wide">{name}</span>
    </div>
  );
});

EffectCard.displayName = "EffectCard";
