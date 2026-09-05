import { memo, useEffect, useRef, useState } from "react";
import type { VideoItem } from "@/engine/config";
import { sanitizeBackground } from "@/lib/cssSanitize";
import { getThumb } from "@/lib/videoThumbCache";

interface Props {
  playlist: VideoItem[];
  currentSlide: number;
  visible: boolean;
  onJump: (index: number) => void;
  effectNames: Record<string, string>;
}

interface ThumbProps {
  src: string;
  fallback: string;
}

const Thumb = memo(({ src, fallback }: ThumbProps) => {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    getThumb(src).then((u) => {
      if (!cancelled) setUrl(u);
    });
    return () => { cancelled = true; };
  }, [src]);

  return (
    <div
      className="w-10 h-6 rounded overflow-hidden"
      style={{ background: fallback }}
    >
      {url && (
        <img
          src={url}
          alt=""
          className="w-full h-full object-cover"
          loading="lazy"
          decoding="async"
        />
      )}
    </div>
  );
});
Thumb.displayName = "Thumb";

export const SlideStrip = ({ playlist, currentSlide, visible, onJump, effectNames }: Props) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (!visible) return;
    const el = itemRefs.current[currentSlide];
    if (el && scrollRef.current) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [currentSlide, visible]);

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 flex items-end justify-center pointer-events-none"
      style={{ zIndex: 25 }}
    >
      <div
        ref={scrollRef}
        className="pointer-events-auto flex gap-1.5 px-4 py-3 overflow-x-auto max-w-[90vw] scrollbar-hide"
        style={{
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(12px)",
          borderRadius: "12px 12px 0 0",
          scrollbarWidth: "none",
        }}
      >
        {playlist.map((item, i) => {
          const active = i === currentSlide;
          const hue = parseInt(item.background?.color) || 0;
          const effectName = effectNames[item.background?.type] || item.background?.type || "—";
          const fallback = sanitizeBackground(item.background?.backgroundGradient) ||
            `hsl(${hue}, 60%, 30%)`;

          return (
            <button
              key={i}
              ref={(el) => { itemRefs.current[i] = el; }}
              onClick={(e) => { e.stopPropagation(); onJump(i); }}
              className="flex-shrink-0 flex flex-col items-center gap-1 rounded-lg px-2 py-1.5 transition-all"
              style={{
                background: active ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.04)",
                border: active ? "1px solid rgba(255,255,255,0.3)" : "1px solid transparent",
                minWidth: 60,
              }}
            >
              <Thumb src={item.src} fallback={fallback} />
              <span
                className="text-[9px] font-mono leading-none truncate max-w-[52px]"
                style={{ color: active ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.4)" }}
              >
                {i + 1}
              </span>
              <span
                className="text-[8px] font-mono leading-none truncate max-w-[52px]"
                style={{ color: active ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.25)" }}
              >
                {effectName}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
