import { useEffect, useRef } from "react";

/**
 * Presentation remote support — MAIN PAGE ONLY.
 * Covers USB/Bluetooth clickers, projector remotes, KDE Connect / Unified Remote
 * (virtual keyboard + MPRIS media keys), Media Session and gamepad-style remotes.
 * Arrow keys and Space stay owned by VideoPlayer to avoid double navigation.
 */
interface Opts {
  enabled: boolean;
  current: number;
  count: number;
  onBlankToggle: () => void;
}

const NEXT_KEYS = new Set(["PageDown", "MediaTrackNext", "n", "N", "Enter"]);
const PREV_KEYS = new Set(["PageUp", "MediaTrackPrevious", "p", "P", "Backspace"]);

export function usePresentationRemotes({ enabled, current, count, onBlankToggle }: Opts) {
  const state = useRef({ current, count, onBlankToggle });
  state.current = { current, count, onBlankToggle };

  useEffect(() => {
    if (!enabled) return;
    const go = (i: number) => {
      const { count: c } = state.current;
      if (c <= 0) return;
      const idx = Math.max(0, Math.min(c - 1, i));
      window.dispatchEvent(new CustomEvent("slide:jump", { detail: { index: idx } }));
    };
    const step = (d: number) => go(state.current.current + d);
    const playback = (action: "play" | "pause" | "toggle") =>
      window.dispatchEvent(new CustomEvent("slide:playback", { detail: { action } }));

    // Keyboard-emulating clickers & software remotes
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      if (document.querySelector("[role=dialog]")) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key;
      if (NEXT_KEYS.has(k)) { e.preventDefault(); step(1); }
      else if (PREV_KEYS.has(k)) { e.preventDefault(); step(-1); }
      else if (k === "Home") { e.preventDefault(); go(0); }
      else if (k === "End") { e.preventDefault(); go(state.current.count - 1); }
      else if (k === "b" || k === "B" || k === "." || k === "w" || k === "W") { e.preventDefault(); state.current.onBlankToggle(); }
      else if (k === "MediaPlayPause") { e.preventDefault(); playback("toggle"); }
      else if (k === "F5" || (k === "F5" && e.shiftKey)) {
        e.preventDefault();
        if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
      }
    };
    window.addEventListener("keydown", onKey);

    // Media Session (OS media keys, KDE Connect MPRIS, headset buttons)
    const ms = "mediaSession" in navigator ? navigator.mediaSession : null;
    const set = (a: MediaSessionAction, h: MediaSessionActionHandler | null) => { try { ms?.setActionHandler(a, h); } catch { /* unsupported */ } };
    if (ms) {
      set("nexttrack", () => step(1));
      set("previoustrack", () => step(-1));
      set("seekforward", () => step(1));
      set("seekbackward", () => step(-1));
      set("play", () => playback("play"));
      set("pause", () => playback("pause"));
    }

    // Gamepad / Bluetooth HID remotes
    let raf = 0;
    const prevPressed: Record<string, boolean> = {};
    const poll = () => {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      for (const pad of pads) {
        if (!pad) continue;
        const btn = (i: number) => !!pad.buttons[i]?.pressed;
        const map: [string, boolean, () => void][] = [
          ["next", btn(15) || btn(0) || btn(5) || btn(7), () => step(1)],
          ["prev", btn(14) || btn(1) || btn(4) || btn(6), () => step(-1)],
          ["blank", btn(3), () => state.current.onBlankToggle()],
          ["play", btn(9), () => playback("toggle")],
        ];
        for (const [id, down, fn] of map) {
          const key = pad.index + id;
          if (down && !prevPressed[key]) fn();
          prevPressed[key] = down;
        }
      }
      raf = requestAnimationFrame(poll);
    };
    const startPoll = () => { if (!raf) raf = requestAnimationFrame(poll); };
    window.addEventListener("gamepadconnected", startPoll);
    if (navigator.getGamepads?.().some(Boolean)) startPoll();

    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("gamepadconnected", startPoll);
      cancelAnimationFrame(raf);
      if (ms) (["nexttrack", "previoustrack", "seekforward", "seekbackward", "play", "pause"] as MediaSessionAction[]).forEach(a => set(a, null));
    };
  }, [enabled]);

  // Keep OS "now playing" metadata informative for software remotes
  useEffect(() => {
    if (!enabled || !("mediaSession" in navigator) || typeof MediaMetadata === "undefined") return;
    navigator.mediaSession.metadata = new MediaMetadata({ title: `Slide ${current + 1} / ${count}`, artist: "Aura" });
  }, [enabled, current, count]);
}
