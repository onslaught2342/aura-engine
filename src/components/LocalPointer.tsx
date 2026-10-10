import { memo, useEffect, useRef, useState } from "react";

/**
 * On-screen pointer for hardware presenters that move the mouse cursor
 * (Logitech Spotlight/R500, Kensington, gyro "air mouse" clickers, KDE Connect
 * touchpad, gamepad sticks). MAIN PAGE ONLY.
 *  L          cycles Off → Laser → Spotlight → Off
 *  Hold Ctrl  shows the laser temporarily (common clicker "pointer" button mapping)
 *  Gamepad right/left stick moves the pointer while a mode is on.
 * Position updates go straight to the DOM — no React re-renders per move.
 */
type Mode = "off" | "laser" | "spot";
const NEXT: Record<Mode, Mode> = { off: "laser", laser: "spot", spot: "off" };

export const LocalPointer = memo(function LocalPointer({ enabled }: { enabled: boolean }) {
  const [mode, setMode] = useState<Mode>("off");
  const [held, setHeld] = useState(false);
  const dot = useRef<HTMLDivElement>(null);
  const spot = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const active: Mode = mode !== "off" ? mode : held ? "laser" : "off";

  useEffect(() => {
    if (!enabled) return;
    const typing = (t: EventTarget | null) => {
      const el = t as HTMLElement | null;
      return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
    };
    const onKey = (e: KeyboardEvent) => {
      if (typing(e.target) || e.metaKey || e.altKey) return;
      if ((e.key === "l" || e.key === "L") && !e.ctrlKey) { e.preventDefault(); setMode((m) => NEXT[m]); }
      else if (e.key === "Control") setHeld(true);
      else if (e.key === "Escape") setMode("off");
    };
    const onUp = (e: KeyboardEvent) => { if (e.key === "Control") setHeld(false); };
    const onBlur = () => setHeld(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || active === "off") return;
    const paint = () => {
      const { x, y } = pos.current;
      if (dot.current) dot.current.style.transform = `translate(${x}px, ${y}px) translate(-50%,-50%)`;
      if (spot.current) spot.current.style.background =
        `radial-gradient(circle 140px at ${x}px ${y}px, transparent 0, transparent 120px, rgba(0,0,0,0.78) 150px)`;
    };
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      pos.current = { x: e.clientX, y: e.clientY };
      if (!frame) frame = requestAnimationFrame(() => { frame = 0; paint(); });
    };
    // Gamepad sticks
    let raf = 0;
    const poll = () => {
      for (const pad of navigator.getGamepads?.() ?? []) {
        if (!pad) continue;
        const ax = Math.abs(pad.axes[2] ?? 0) > Math.abs(pad.axes[0] ?? 0) ? pad.axes[2] : pad.axes[0];
        const ay = Math.abs(pad.axes[3] ?? 0) > Math.abs(pad.axes[1] ?? 0) ? pad.axes[3] : pad.axes[1];
        const dz = (v = 0) => (Math.abs(v) < 0.15 ? 0 : v);
        if (dz(ax) || dz(ay)) {
          pos.current = {
            x: Math.max(0, Math.min(window.innerWidth, pos.current.x + dz(ax) * 14)),
            y: Math.max(0, Math.min(window.innerHeight, pos.current.y + dz(ay) * 14)),
          };
          paint();
        }
      }
      raf = requestAnimationFrame(poll);
    };
    paint();
    window.addEventListener("pointermove", onMove, { passive: true });
    if (navigator.getGamepads) raf = requestAnimationFrame(poll);
    const prevCursor = document.body.style.cursor;
    document.body.style.cursor = "none";
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
      cancelAnimationFrame(raf);
      document.body.style.cursor = prevCursor;
    };
  }, [enabled, active]);

  if (!enabled || active === "off") return null;
  return (
    <>
      {active === "spot" && <div ref={spot} className="fixed inset-0" style={{ zIndex: 44, pointerEvents: "none" }} />}
      <div
        ref={dot}
        className="fixed left-0 top-0 rounded-full"
        style={{
          zIndex: 45, pointerEvents: "none", width: 16, height: 16, willChange: "transform",
          background: "#ff3b3b", boxShadow: "0 0 14px 6px rgba(255,59,59,0.55)",
          opacity: active === "spot" ? 0.6 : 1,
        }}
      />
    </>
  );
});
