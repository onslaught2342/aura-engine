import { useEffect, useRef, useState } from "react";
import { getEnterAnimation, SLIDE_TRANSITION_NAMES } from "@/components/SlideTransition";

interface Props {
  transitionType: string;
  configPath?: string;
}

export const TransitionCard = ({ transitionType, configPath }: Props) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => setCycle((c) => c + 1), 2400);
    return () => clearInterval(interval);
  }, [visible]);

  useEffect(() => {
    const el = boxRef.current;
    if (!el || !visible) return;

    const { from, to } = getEnterAnimation(transitionType);
    Object.assign(el.style, from);
    el.style.transition = "none";

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transition = "all 1.2s ease-in-out";
        Object.assign(el.style, to);
      });
    });
  }, [cycle, visible, transitionType]);

  const name = SLIDE_TRANSITION_NAMES[transitionType] || transitionType;
  const hue = (Object.keys(SLIDE_TRANSITION_NAMES).indexOf(transitionType) * 18) % 360;

  return (
    <div ref={containerRef} className="group flex flex-col items-center gap-2">
      <div className="relative w-[200px] h-[140px] overflow-hidden rounded-xl border border-border/20 bg-background/10 backdrop-blur-sm shadow-lg transition-transform duration-200 group-hover:scale-105">
        <div
          ref={boxRef}
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, hsl(${hue}, 70%, 50%), hsl(${(hue + 60) % 360}, 70%, 40%))`,
          }}
        />
        <div className="absolute bottom-2 left-2 right-2 text-center">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-foreground/90 bg-background/40 backdrop-blur-sm px-2 py-0.5 rounded">
            {name}
          </span>
        </div>
        {configPath && (
          <div className="absolute inset-0 flex items-start justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
            <span className="mt-1.5 px-2 py-0.5 rounded bg-background/80 backdrop-blur-sm text-[9px] font-mono text-primary/90 border border-primary/20 max-w-[190px] truncate">
              {configPath}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
