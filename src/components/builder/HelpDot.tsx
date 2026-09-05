import { memo, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Portal-anchored help tooltip. Uses fixed positioning measured from the
 * trigger, so it can never be clipped by tab strips or scroll containers.
 * High-contrast, wide enough to read comfortably, edge-aware.
 */
export const HelpDot = memo(function HelpDot({ text }: { text?: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; caret: "left" | "right" } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const openT = useRef<number>(0);
  const closeT = useRef<number>(0);

  const clear = () => { window.clearTimeout(openT.current); window.clearTimeout(closeT.current); };

  const measure = useCallback(() => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const W = 260;
    const margin = 8;
    let left = r.right + margin;
    let caret: "left" | "right" = "left";
    if (left + W > window.innerWidth - margin) {
      left = Math.max(margin, r.left - W - margin);
      caret = "right";
    }
    const top = Math.min(window.innerHeight - 90, Math.max(margin, r.top + r.height / 2 - 20));
    setPos({ top, left, caret });
  }, []);

  const scheduleOpen = () => {
    clear();
    openT.current = window.setTimeout(() => { measure(); setOpen(true); }, 80);
  };
  const scheduleClose = () => {
    clear();
    closeT.current = window.setTimeout(() => setOpen(false), 120);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const onScroll = () => measure();
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open, measure]);

  useEffect(() => () => clear(), []);

  if (!text) return null;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label="Help"
        aria-expanded={open}
        onMouseEnter={scheduleOpen}
        onMouseLeave={scheduleClose}
        onFocus={scheduleOpen}
        onBlur={scheduleClose}
        onClick={(e) => e.preventDefault()}
        className="ml-1 w-4 h-4 inline-flex items-center justify-center text-[10px] rounded-full border border-white/25 text-white/60 hover:text-white hover:border-white/60 hover:bg-white/10 focus:outline-none focus:ring-1 focus:ring-white/40 transition align-middle cursor-help"
      >
        <span aria-hidden className="leading-none font-semibold">?</span>
      </button>
      {open && pos && createPortal(
        <div
          role="tooltip"
          onMouseEnter={() => { clear(); setOpen(true); }}
          onMouseLeave={scheduleClose}
          className="fixed z-[80] w-[260px] rounded-md border border-white/25 bg-zinc-900 text-white shadow-2xl px-3 py-2 text-[12px] leading-snug font-sans"
          style={{ top: pos.top, left: pos.left }}
        >
          {text}
        </div>,
        document.body,
      )}
    </>
  );
});
