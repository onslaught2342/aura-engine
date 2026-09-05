import { useEffect, useRef, useCallback, useState } from "react";
import type { EngineConfig, VideoItem } from "@/engine/config";
import { getEnterAnimation, getExitAnimation, SLIDE_TRANSITION_TYPES } from "@/components/SlideTransition";
import { prefetchSequential } from "@/lib/videoPrefetch";

interface Props {
  config: EngineConfig;
  playlist: VideoItem[];
  onIndexChange?: (index: number) => void;
}

export const VideoPlayer = ({ config, playlist, onIndexChange }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const autoAdvanceTimer = useRef<number>(0);
  const multiVideoRefs = useRef<HTMLVideoElement[]>([]);
  const [paused, setPaused] = useState(false);
  const exitContainerRef = useRef<HTMLDivElement>(null);
  const exitVideoRef = useRef<HTMLVideoElement>(null);
  const prevIndexRef = useRef<number>(-1);
  const preloadRef = useRef<HTMLVideoElement | null>(null);
  const autoPlayTimerRef = useRef<number>(0);
  const [autoPlayProgress, setAutoPlayProgress] = useState(0);
  const autoPlayStartRef = useRef<number>(0);
  const autoPlayRafRef = useRef<number>(0);

  const currentItem = playlist[index];
  const hasMultiVideo = currentItem?.sources && currentItem.sources.length > 0;

  const getTransitionType = useCallback((item: VideoItem) => {
    if (config.controls.randomTransitions) {
      return SLIDE_TRANSITION_TYPES[Math.floor(Math.random() * SLIDE_TRANSITION_TYPES.length)];
    }
    return (item?.transition ?? config.defaults.defaultTransition)?.type ?? "fade";
  }, [config.controls.randomTransitions, config.defaults.defaultTransition]);

  const load = useCallback(
    (i: number) => {
      const item = playlist[i];
      if (!item) return;

      if (item.sources && item.sources.length > 0) {
        if (videoRef.current) {
          videoRef.current.src = "";
          videoRef.current.style.display = "none";
        }
      } else {
        const video = videoRef.current;
        if (!video) return;
        video.style.display = "block";

        // Use preloaded video if available
        if (preloadRef.current && preloadRef.current.src.includes(item.src) && item.src) {
          video.src = preloadRef.current.src;
        } else {
          video.src = item.src;
        }
        video.loop = item.loop;
        video.muted = item.muted || config.audio.globalMute;
        video.volume = (item.volume ?? 1) * config.video.globalVolume;
        video.play().catch(() => {});
      }
      setIndex(i);
      onIndexChange?.(i);
    },
    [playlist, onIndexChange, config.audio.globalMute, config.video.globalVolume]
  );

  const next = useCallback(() => {
    const nextIdx = (index + 1) % playlist.length;
    if (nextIdx === 0 && !config.controls.loopPlaylist) return;
    load(nextIdx);
  }, [index, playlist.length, load, config.controls.loopPlaylist]);

  const prev = useCallback(() => load((index - 1 + playlist.length) % playlist.length), [index, playlist.length, load]);

  // Sequentially prefetch the next 10 videos into Cache Storage
  useEffect(() => {
    if (config.video.preloadStrategy === "none") return;
    if (!playlist.length) return;

    const urls: string[] = [];
    const loop = config.controls.loopPlaylist;
    for (let i = 1; i <= 10; i++) {
      const idx = index + i;
      if (idx >= playlist.length && !loop) break;
      const item = playlist[idx % playlist.length];
      if (item?.src) urls.push(item.src);
    }
    if (!urls.length) return;

    const ctrl = new AbortController();
    prefetchSequential(urls, ctrl.signal);
    return () => ctrl.abort();
  }, [index, playlist, config.video.preloadStrategy, config.controls.loopPlaylist]);

  // Cleanup preload on unmount
  useEffect(() => {
    return () => {
      if (preloadRef.current) {
        preloadRef.current.remove();
        preloadRef.current = null;
      }
    };
  }, []);

  // Slide transition animation (enter + exit)
  useEffect(() => {
    const item = playlist[index];
    const transition = item?.transition ?? config.defaults.defaultTransition;
    if (!transition || !containerRef.current) return;

    const transitionType = getTransitionType(item);
    const { duration, easing } = transition;
    const enterEl = containerRef.current;

    // --- Exit animation on previous slide ---
    const exitEl = exitContainerRef.current;
    if (exitEl && prevIndexRef.current >= 0 && prevIndexRef.current !== index) {
      const { from: exitFrom, to: exitTo } = getExitAnimation(transitionType);

      if (exitVideoRef.current && videoRef.current) {
        exitVideoRef.current.src = videoRef.current.src || "";
        exitVideoRef.current.currentTime = videoRef.current.currentTime;
        exitVideoRef.current.style.objectFit = config.video.fit;
        exitVideoRef.current.style.display = "block";
        exitVideoRef.current.muted = true;
        exitVideoRef.current.play().catch(() => {});
      }

      exitEl.style.display = "block";
      Object.assign(exitEl.style, exitFrom);
      exitEl.style.transition = "none";
      void exitEl.offsetHeight;

      requestAnimationFrame(() => {
        exitEl.style.transition = `all ${duration}s ${easing}`;
        Object.assign(exitEl.style, exitTo);
      });

      setTimeout(() => {
        exitEl.style.display = "none";
        exitEl.style.transition = "";
        exitEl.style.opacity = "";
        exitEl.style.transform = "";
        exitEl.style.clipPath = "";
        exitEl.style.filter = "";
        if (exitVideoRef.current) {
          exitVideoRef.current.src = "";
          exitVideoRef.current.style.display = "none";
        }
      }, duration * 1000 + 50);
    }

    // --- Enter animation on new slide ---
    const { from, to } = getEnterAnimation(transitionType);
    Object.assign(enterEl.style, from);
    enterEl.style.transition = "none";
    void enterEl.offsetHeight;

    requestAnimationFrame(() => {
      enterEl.style.transition = `all ${duration}s ${easing}`;
      Object.assign(enterEl.style, to);
    });

    const cleanup = setTimeout(() => {
      enterEl.style.transition = "";
      enterEl.style.opacity = "";
      enterEl.style.transform = "";
      enterEl.style.clipPath = "";
      enterEl.style.filter = "";
    }, duration * 1000 + 50);

    prevIndexRef.current = index;

    return () => clearTimeout(cleanup);
  }, [index]); // eslint-disable-line

  // Multi-video rendering
  useEffect(() => {
    if (!hasMultiVideo || !containerRef.current) return;
    const container = containerRef.current;

    multiVideoRefs.current.forEach(v => v.remove());
    multiVideoRefs.current = [];

    for (const src of currentItem.sources) {
      const vid = document.createElement("video");
      vid.src = src.src;
      vid.loop = src.loop;
      vid.muted = src.muted || config.audio.globalMute;
      vid.playsInline = true;
      vid.autoplay = true;
      vid.volume = (src.volume ?? 1) * config.video.globalVolume;
      if (src.playbackRate && src.playbackRate !== 1) vid.playbackRate = src.playbackRate;

      // Sanitization helpers to prevent CSS injection from imported configs.
      const num = (v: unknown, fallback = 0) => {
        const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
        return Number.isFinite(n) ? n : fallback;
      };
      const ALLOWED_FITS = new Set(["fill", "contain", "cover", "none", "scale-down"]);
      const ALLOWED_BLENDS = new Set([
        "normal", "multiply", "screen", "overlay", "darken", "lighten",
        "color-dodge", "color-burn", "hard-light", "soft-light", "difference",
        "exclusion", "hue", "saturation", "color", "luminosity", "plus-lighter",
      ]);
      // Allow only known-safe CSS filter functions.
      const FILTER_RE = /^(\s*(blur|brightness|contrast|drop-shadow|grayscale|hue-rotate|invert|opacity|saturate|sepia)\([^()]*\)\s*)+$/i;
      const safeFilter = src.filter && FILTER_RE.test(src.filter) && !/[;{}]|url\(|expression\(/i.test(src.filter)
        ? src.filter
        : "";
      // Reject shadows containing url(), expressions, or statement separators.
      const safeShadow = src.shadow && !/[;{}]|url\(|expression\(/i.test(src.shadow) ? src.shadow : "";
      const safeFit = ALLOWED_FITS.has(src.fit as string) ? (src.fit as string) : "cover";
      const safeBlend = ALLOWED_BLENDS.has(src.blendMode as string) ? (src.blendMode as string) : "normal";

      const s = vid.style;
      s.position = "absolute";
      s.left = `${num(src.x)}%`;
      s.top = `${num(src.y)}%`;
      s.width = `${num(src.width, 100)}%`;
      s.height = `${num(src.height, 100)}%`;
      s.objectFit = safeFit;
      s.opacity = String(num(src.opacity, 1));
      s.zIndex = String(num(src.zIndex));
      s.pointerEvents = "none";
      s.borderRadius = `${num(src.borderRadius)}%`;
      s.transform = `rotate(${num(src.rotation)}deg)`;
      s.filter = safeFilter;
      s.mixBlendMode = safeBlend;
      if (safeShadow) s.boxShadow = safeShadow;
      if (src.cropTop || src.cropBottom || src.cropLeft || src.cropRight) {
        s.clipPath = `inset(${num(src.cropTop)}% ${num(src.cropRight)}% ${num(src.cropBottom)}% ${num(src.cropLeft)}%)`;
      }
      container.appendChild(vid);

      if (src.startTime > 0) vid.currentTime = src.startTime;
      if (src.endTime > 0) {
        const checkEnd = () => {
          if (vid.currentTime >= src.endTime) {
            if (src.loop) { vid.currentTime = src.startTime || 0; }
            else { vid.pause(); }
          }
        };
        vid.addEventListener("timeupdate", checkEnd);
      }

      vid.play().catch(() => {});
      multiVideoRefs.current.push(vid);
    }

    return () => {
      multiVideoRefs.current.forEach(v => v.remove());
      multiVideoRefs.current = [];
    };
  }, [index, hasMultiVideo, currentItem, config.audio.globalMute, config.video.globalVolume]);

  // External jump command (from SlideJumpBar / SlideStrip)
  useEffect(() => {
    const onJump = (e: Event) => {
      const detail = (e as CustomEvent<{ index: number }>).detail;
      if (!detail) return;
      const i = Math.max(0, Math.min(playlist.length - 1, detail.index));
      load(i);
    };
    window.addEventListener("slide:jump", onJump as EventListener);
    return () => window.removeEventListener("slide:jump", onJump as EventListener);
  }, [load, playlist.length]);

  // Keyboard navigation (extended with Space and ?)
  useEffect(() => {
    if (!config.controls.keyboardShortcutsEnabled) return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inField = !!target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (inField) return;
      if (config.controls.arrowNavigation) {
        if (e.key === "ArrowRight") next();
        if (e.key === "ArrowLeft") prev();
      }
      if (e.key === "f" && config.controls.fullscreenEnabled) {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
        else document.exitFullscreen().catch(() => {});
      }
      if (e.key === " " && !e.altKey) {
        e.preventDefault();
        if (videoRef.current) {
          if (videoRef.current.paused) {
            videoRef.current.play().catch(() => {});
            multiVideoRefs.current.forEach(v => v.play().catch(() => {}));
            setPaused(false);
          } else {
            videoRef.current.pause();
            multiVideoRefs.current.forEach(v => v.pause());
            setPaused(true);
          }
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [next, prev, config.controls.arrowNavigation, config.controls.keyboardShortcutsEnabled, config.controls.fullscreenEnabled]);

  // Click navigation
  useEffect(() => {
    if (!config.controls.clickNavigation) return;
    const handler = (e: MouseEvent) => {
      const x = e.clientX / window.innerWidth;
      if (x > 0.5) next(); else prev();
    };
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [next, prev, config.controls.clickNavigation]);

  // Touch/swipe
  useEffect(() => {
    if (!config.controls.swipeNavigation) return;
    const onStart = (e: TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
    const onEnd = (e: TouchEvent) => {
      if (touchStartX.current === null) return;
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      if (Math.abs(dx) > 50) { dx < 0 ? next() : prev(); }
      touchStartX.current = null;
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => { window.removeEventListener("touchstart", onStart); window.removeEventListener("touchend", onEnd); };
  }, [next, prev, config.controls.swipeNavigation]);

  useEffect(() => { if (config.controls.autoPlayFirst) load(0); }, []); // eslint-disable-line

  // Pause on hover
  useEffect(() => {
    if (!config.controls.pauseOnHover) return;
    const container = containerRef.current;
    if (!container) return;
    const onEnter = () => {
      setPaused(true);
      videoRef.current?.pause();
      multiVideoRefs.current.forEach(v => v.pause());
    };
    const onLeave = () => {
      setPaused(false);
      videoRef.current?.play().catch(() => {});
      multiVideoRefs.current.forEach(v => v.play().catch(() => {}));
    };
    container.addEventListener("mouseenter", onEnter);
    container.addEventListener("mouseleave", onLeave);
    return () => { container.removeEventListener("mouseenter", onEnter); container.removeEventListener("mouseleave", onLeave); };
  }, [config.controls.pauseOnHover]);

  // Effective per-slide auto-advance (slide override beats global)
  const slideAdvance = playlist[index]?.autoAdvance ?? "inherit";
  const advanceEnabled = slideAdvance === "on" || (slideAdvance !== "off" && config.controls.autoAdvance);
  const advanceDelay = playlist[index]?.autoAdvanceDelay ?? config.controls.autoAdvanceDelay;

  // Auto-advance (video ended)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onEnded = () => {
      if (!playlist[index]?.loop && advanceEnabled) {
        clearTimeout(autoAdvanceTimer.current);
        autoAdvanceTimer.current = window.setTimeout(() => next(), advanceDelay * 1000);
      }
    };
    video.addEventListener("ended", onEnded);
    return () => { video.removeEventListener("ended", onEnded); clearTimeout(autoAdvanceTimer.current); };
  }, [index, next, playlist, advanceEnabled, advanceDelay]);

  // Timer-based auto-advance for looping/no-video slides
  useEffect(() => {
    if (!advanceEnabled) {
      setAutoPlayProgress(0);
      return;
    }

    const item = playlist[index];
    const hasVideo = item?.src && item.src.length > 0 && !item.loop;
    if (hasVideo) {
      setAutoPlayProgress(0);
      return;
    }

    const delay = advanceDelay * 1000;
    if (delay <= 0) return;

    autoPlayStartRef.current = performance.now();

    const tick = () => {
      const elapsed = performance.now() - autoPlayStartRef.current;
      const progress = Math.min(1, elapsed / delay);
      setAutoPlayProgress(progress);
      if (progress < 1) {
        autoPlayRafRef.current = requestAnimationFrame(tick);
      }
    };
    autoPlayRafRef.current = requestAnimationFrame(tick);

    autoPlayTimerRef.current = window.setTimeout(() => {
      setAutoPlayProgress(0);
      next();
    }, delay);

    return () => {
      clearTimeout(autoPlayTimerRef.current);
      cancelAnimationFrame(autoPlayRafRef.current);
      setAutoPlayProgress(0);
    };
  }, [index, next, advanceEnabled, advanceDelay, playlist]);


  return (
    <>
      {/* Exit container (outgoing slide) */}
      <div ref={exitContainerRef} className="fixed inset-0" style={{ zIndex: 0, display: "none", willChange: "transform, opacity, clip-path, filter" }}>
        <video
          ref={exitVideoRef}
          className="w-full h-full"
          style={{ objectFit: config.video.fit, background: "transparent", display: "none" }}
          playsInline
          muted
        />
      </div>

      {/* Enter container (incoming slide) */}
      <div ref={containerRef} className="fixed inset-0" style={{ zIndex: 1, willChange: "transform, opacity, clip-path, filter" }}>
        <video
          ref={videoRef}
          className="w-full h-full"
          style={{ objectFit: config.video.fit, background: "transparent" }}
          playsInline
          controls={config.video.controls}
        />
      </div>

      {/* Progress bar */}
      {config.controls.showProgressBar && (
        <div className="fixed bottom-0 left-0 right-0 h-1" style={{ zIndex: 10, background: "rgba(255,255,255,0.1)" }}>
          <div
            style={{
              width: `${((index + 1) / playlist.length) * 100}%`,
              height: "100%",
              background: "rgba(255,255,255,0.5)",
              transition: "width 0.3s ease",
            }}
          />
        </div>
      )}

      {/* Slide number + label */}
      {config.controls.showSlideNumber && (
        <div
          className="fixed bottom-6 right-6 text-right select-none pointer-events-none"
          style={{ zIndex: 10 }}
        >
          <div className="text-sm font-mono tracking-wider" style={{ color: "rgba(255,255,255,0.35)" }}>
            {index + 1} / {playlist.length}
          </div>
          {currentItem?.label && (
            <div className="text-xs font-mono mt-0.5" style={{ color: "rgba(255,255,255,0.25)" }}>
              {currentItem.label}
            </div>
          )}
        </div>
      )}

      {/* Auto-play indicator */}
      {advanceEnabled && autoPlayProgress > 0 && (
        <div className="fixed bottom-6 left-6 pointer-events-none select-none" style={{ zIndex: 10 }}>
          <svg width="32" height="32" viewBox="0 0 32 32">
            <circle cx="16" cy="16" r="12" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
            <circle
              cx="16" cy="16" r="12" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2"
              strokeDasharray={2 * Math.PI * 12}
              strokeDashoffset={2 * Math.PI * 12 * (1 - autoPlayProgress)}
              strokeLinecap="round"
              transform="rotate(-90 16 16)"
              style={{ transition: "stroke-dashoffset 0.1s linear" }}
            />
          </svg>
        </div>
      )}
    </>
  );
};
