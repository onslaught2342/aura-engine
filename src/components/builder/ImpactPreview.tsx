import { memo, useEffect, useMemo, useRef } from "react";
import type { VideoItem } from "@/engine/config";
import { MiniStage, useInView } from "./MiniStage";
import { impactBus } from "@/lib/impactBus";

/**
 * Tweaks a single field on a deep-cloned slide via dot-path. Supports
 * "background.opacity", "transition.duration", "sources.0.opacity", etc.
 */
function applyTweak(slide: VideoItem, path: string, value: unknown): VideoItem {
  const next = structuredClone(slide);
  const parts = path.split(".");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cur: any = next;
  for (let i = 0; i < parts.length - 1; i++) {
    cur = cur[parts[i]];
    if (cur == null) return next;
  }
  cur[parts[parts.length - 1]] = value;
  return next;
}

export type ImpactVariant =
  | { kind: "bool" }
  | { kind: "range01" }      // 0–1 (e.g. opacity)
  | { kind: "range100" }     // 0–100 (e.g. intensity)
  | { kind: "range360" }     // 0–360 (e.g. direction, color)
  | { kind: "scalar" }       // unbounded (uses 0.5× / 2×)
  | { kind: "select"; a: string; b: string; labelA?: string; labelB?: string };

function resolveAB(variant: ImpactVariant, current: unknown) {
  switch (variant.kind) {
    case "bool":     return { a: false as unknown,  b: true as unknown,   labelA: "Off",   labelB: "On" };
    case "range01":  return { a: 0.5,    b: 1,      labelA: "50%",   labelB: "100%" };
    case "range100": return { a: 50,     b: 100,    labelA: "50%",   labelB: "100%" };
    case "range360": return { a: 180,    b: 360,    labelA: "180°",  labelB: "360°" };
    case "scalar": {
      const n = typeof current === "number" && Number.isFinite(current) ? current : 1;
      const base = n === 0 ? 1 : n;
      return { a: base / 2, b: base * 2, labelA: "0.5×", labelB: "2×" };
    }
    case "select":   return { a: variant.a, b: variant.b, labelA: variant.labelA ?? variant.a, labelB: variant.labelB ?? variant.b };
  }
}

export interface ImpactPreviewProps {
  slide: VideoItem;
  path: string;
  variant: ImpactVariant;
  current: unknown;
  transitionDuration: number;
  /** Optional aspect ratio for each tile. Defaults to 16/9. */
  aspect?: string;
}

/**
 * A/B two-tile renderer. Used by the docked LivePreview when a peek is active.
 */
export const ImpactPreview = memo(function ImpactPreview({
  slide, path, variant, current, transitionDuration, aspect = "16/9",
}: ImpactPreviewProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const visible = useInView(wrapRef);
  const { a, b, labelA, labelB } = useMemo(() => resolveAB(variant, current), [variant, current]);
  const slideA = useMemo(() => applyTweak(slide, path, a), [slide, path, a]);
  const slideB = useMemo(() => applyTweak(slide, path, b), [slide, path, b]);
  return (
    <div ref={wrapRef} className="grid grid-cols-2 gap-1.5 w-full h-full">
      <Tile slide={slideA} label={labelA!} active={visible} transitionDuration={transitionDuration} aspect={aspect} />
      <Tile slide={slideB} label={labelB!} active={visible} transitionDuration={transitionDuration} aspect={aspect} />
    </div>
  );
});

const Tile = ({ slide, label, active, transitionDuration, aspect }: { slide: VideoItem; label: string; active: boolean; transitionDuration: number; aspect: string }) => (
  <div className="relative rounded border border-white/10 overflow-hidden bg-black" style={{ aspectRatio: aspect }}>
    <MiniStage slide={slide} transitionDuration={transitionDuration} active={active} withSources className="w-full h-full" />
    <div className="absolute bottom-1 left-1 text-[9px] font-mono uppercase tracking-wider text-white/80 bg-black/60 px-1.5 py-0.5 rounded-sm pointer-events-none">{label}</div>
  </div>
);

/* ─────────────────────────────────────────────────────────────
 *  ImpactPeek — button-only trigger.
 *  Hover/focus publishes the impact target to impactBus. The
 *  docked LivePreview picks it up and renders the A/B split
 *  in one contained area — no scattered popovers, no flashbang.
 * ───────────────────────────────────────────────────────────── */

export interface ImpactPeekProps {
  slide: VideoItem;
  path: string;
  variant: ImpactVariant;
  current: unknown;
  transitionDuration: number; // kept for API compatibility
  label?: string;
}

const OPEN_DELAY = 90;
const CLOSE_DELAY = 160;

export const ImpactPeek = memo(function ImpactPeek({
  slide, path, variant, current, label,
}: ImpactPeekProps) {
  const openT = useRef<number>(0);
  const closeT = useRef<number>(0);
  const mine = useRef(false);

  const clear = () => { window.clearTimeout(openT.current); window.clearTimeout(closeT.current); };

  const publish = () => {
    clear();
    openT.current = window.setTimeout(() => {
      mine.current = true;
      impactBus.set({ slide, path, variant, current, label: label ?? path });
    }, OPEN_DELAY);
  };
  const retract = () => {
    clear();
    closeT.current = window.setTimeout(() => {
      if (mine.current) { impactBus.set(null); mine.current = false; }
    }, CLOSE_DELAY);
  };

  useEffect(() => () => { clear(); if (mine.current) impactBus.set(null); }, []);

  const aria = `Preview impact of ${label ?? path}`;

  return (
    <button
      type="button"
      aria-label={aria}
      onMouseEnter={publish}
      onMouseLeave={retract}
      onFocus={publish}
      onBlur={retract}
      onClick={(e) => e.preventDefault()}
      className="ml-1 w-4 h-4 inline-flex items-center justify-center text-[10px] rounded-full border border-white/25 text-white/60 hover:text-white hover:border-white/60 hover:bg-white/10 focus:outline-none focus:ring-1 focus:ring-white/40 transition align-middle"
      title={aria}
    >
      <span aria-hidden className="leading-none">◐</span>
    </button>
  );
});
