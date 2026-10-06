import { memo, useEffect, useMemo, useRef, useState } from "react";
import { BackgroundCanvas } from "@/components/BackgroundCanvas";
import type { VideoItem, VideoSource, SlideBackground } from "@/engine/config";
import { sanitizeBackground } from "@/lib/cssSanitize";

/** "base" = only the base effect, a number = only that effect layer. */
export type SoloLayer = "base" | number | null;

interface MiniStageProps {
  slide: VideoItem;
  transitionDuration: number;
  /** When false, pause heavy work (no canvas redraws, no video play). */
  active?: boolean;
  /** Show the per-slide multi-video sources stack. Defaults true. */
  withSources?: boolean;
  /** Render only one layer of the stack, for "what does this layer do?". */
  soloLayer?: SoloLayer;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Shared "what this slide looks like" renderer. Renders the procedural
 * background, the main video, and every entry in slide.sources at their
 * configured x/y/width/height/blendMode/filter. Used by both the docked live
 * preview and the inline A/B impact previews.
 */
export const MiniStage = memo(function MiniStage({
  slide,
  transitionDuration,
  active = true,
  withSources = true,
  soloLayer = null,
  className,
  style,
}: MiniStageProps) {
  const mainRef = useRef<HTMLVideoElement>(null);

  // Sync main video src when slide changes
  useEffect(() => {
    const v = mainRef.current;
    if (!v) return;
    if (slide.src && v.src !== slide.src) {
      v.src = slide.src;
      v.load();
    } else if (!slide.src && v.src) {
      v.removeAttribute("src");
      v.load();
    }
    if (active) v.play().catch(() => {});
    else v.pause();
  }, [slide.src, active]);

  const bg = useMemo<SlideBackground>(() => {
    const base = slide.background;
    if (soloLayer === null || soloLayer === undefined) return base;
    if (soloLayer === "base") return { ...base, effectLayers: [], secondaryEffect: null };
    const layer = base.effectLayers?.[soloLayer];
    if (!layer) return base;
    return { ...base, opacity: 0, secondaryEffect: null, effectLayers: [{ ...layer, opacity: 1 }] };
  }, [slide.background, soloLayer]);


  return (
    <div className={className} style={{ position: "relative", overflow: "hidden", background: "#000", transform: "translateZ(0)", contain: "paint", ...style }}>
      <div className="absolute inset-0">
        {active ? (
          <BackgroundCanvas background={bg} transitionDuration={transitionDuration} />
        ) : (
          <div className="absolute inset-0" style={{ background: sanitizeBackground(bg.backgroundGradient) || "#000" }} />
        )}
      </div>
      {slide.src && (
        <video
          ref={mainRef}
          className="absolute inset-0 w-full h-full"
          style={{ objectFit: "contain" }}
          autoPlay loop muted playsInline
        />
      )}
      {withSources && slide.sources?.map((s, i) => (
        <SourceLayer key={i} source={s} active={active} />
      ))}
    </div>
  );
});

const ALLOWED_BLEND: ReadonlyArray<GlobalCompositeOperation> = [
  "source-over","multiply","screen","overlay","darken","lighten","color-dodge","color-burn",
  "hard-light","soft-light","difference","exclusion","hue","saturation","color","luminosity",
];

const safeFilter = (f: string) => {
  // Same approach as cssSanitize.sanitizeFilter — strict allowlist.
  if (!f) return "";
  if (/[;]|url\(|expression\(/i.test(f)) return "";
  if (!/^[\w\s().,%#\-+]*$/.test(f)) return "";
  return f;
};

const SourceLayer = memo(function SourceLayer({ source, active }: { source: VideoSource; active: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (source.src && v.src !== source.src) { v.src = source.src; v.load(); }
    v.playbackRate = source.playbackRate || 1;
    if (active && source.src) v.play().catch(() => {});
    else v.pause();
  }, [source.src, source.playbackRate, active]);

  if (!source.src) return null;
  const blend = ALLOWED_BLEND.includes(source.blendMode) ? source.blendMode : "source-over";

  return (
    <video
      ref={ref}
      autoPlay={source.src ? true : false}
      loop={source.loop}
      muted={source.muted}
      playsInline
      style={{
        position: "absolute",
        left: `${source.x}%`,
        top: `${source.y}%`,
        width: `${source.width}%`,
        height: `${source.height}%`,
        objectFit: source.fit,
        opacity: source.opacity,
        borderRadius: `${source.borderRadius}px`,
        transform: `rotate(${source.rotation}deg)`,
        filter: safeFilter(source.filter),
        mixBlendMode: blend as React.CSSProperties["mixBlendMode"],
        zIndex: source.zIndex,
      }}
    />
  );
});

/** Hook: only returns true once the element has been visible at least once. */
export function useInView<T extends HTMLElement>(ref: React.RefObject<T>) {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (!ref.current || seen) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setSeen(true); obs.disconnect(); }
    }, { rootMargin: "100px" });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [ref, seen]);
  return seen;
}
