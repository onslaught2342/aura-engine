import { useState, useCallback, useRef, useEffect } from "react";

import { CONFIG } from "@/engine/config";
import type { EngineConfig, VideoItem } from "@/engine/config";
import { BackgroundCanvas } from "@/components/BackgroundCanvas";
import { VideoPlayer } from "@/components/VideoPlayer";
import { SettingsPanel } from "@/components/SettingsPanel";
import { SlideStrip } from "@/components/SlideStrip";
import { ShortcutOverlay } from "@/components/ShortcutOverlay";
import { SlideJumpBar } from "@/components/SlideJumpBar";
import { EFFECT_NAMES } from "@/engine/effectNames";
import { sanitizeBackground } from "@/lib/cssSanitize";
import { prewarmThumbs } from "@/lib/videoThumbCache";
import { builderStore } from "@/lib/builderStore";

const Index = () => {
  const [engineConfig, setEngineConfig] = useState<EngineConfig>(() => {
    const fromBuilder = builderStore.consume();
    return fromBuilder ?? structuredClone(CONFIG);
  });
  const [playlist, setPlaylist] = useState<VideoItem[]>(() => structuredClone(engineConfig.video.playlist));
  const [currentSlide, setCurrentSlide] = useState(0);
  const importRef = useRef<HTMLInputElement>(null);
  const [uiVisible, setUiVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const idleTimer = useRef<number>(0);
  const [stripVisible, setStripVisible] = useState(false);
  const [shortcutsVisible, setShortcutsVisible] = useState(false);

  // Track fullscreen state
  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // Keyboard: T for strip, ? for shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "t" || e.key === "T") setStripVisible(v => !v);
      if (e.key === "?") setShortcutsVisible(v => !v);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Quietly prewarm thumbnails for the whole playlist during browser idle time
  useEffect(() => {
    const urls = playlist.map((p) => p.src).filter(Boolean);
    prewarmThumbs(urls);
  }, [playlist]);

  const handleIndexChange = useCallback((index: number) => setCurrentSlide(index), []);

  const handleJump = useCallback((index: number) => {
    setCurrentSlide(index);
    window.dispatchEvent(new CustomEvent("slide:jump", { detail: { index } }));
  }, []);

  const currentBg = playlist[currentSlide]?.background ?? CONFIG.video.playlist[0].background;

  // Idle UI hide
  useEffect(() => {
    if (!engineConfig.controls.idleHideUI) { setUiVisible(true); return; }
    const resetIdle = () => {
      setUiVisible(true);
      clearTimeout(idleTimer.current);
      idleTimer.current = window.setTimeout(() => setUiVisible(false), engineConfig.controls.idleTimeout * 1000);
    };
    resetIdle();
    window.addEventListener("mousemove", resetIdle);
    window.addEventListener("keydown", resetIdle);
    return () => {
      clearTimeout(idleTimer.current);
      window.removeEventListener("mousemove", resetIdle);
      window.removeEventListener("keydown", resetIdle);
    };
  }, [engineConfig.controls.idleHideUI, engineConfig.controls.idleTimeout]);

  const handleExport = useCallback(() => {
    const exportData: EngineConfig = {
      meta: { ...engineConfig.meta, updatedAt: new Date().toISOString() },
      defaults: engineConfig.defaults,
      backgrounds: engineConfig.backgrounds,
      video: { ...engineConfig.video, playlist },
      controls: engineConfig.controls,
      audio: engineConfig.audio,
      theme: engineConfig.theme,
      performance: engineConfig.performance,
      export: engineConfig.export,
      watermark: engineConfig.watermark,
      accessibility: engineConfig.accessibility,
    };

    if (!engineConfig.export.embedVideos) {
      exportData.video.playlist = exportData.video.playlist.map(item => ({
        ...item,
        src: "",
        sources: item.sources.map(s => ({ ...s, src: "" })),
      }));
    }

    let assetManifest = "";
    if (engineConfig.export.includeAssets) {
      const urls = new Set<string>();
      playlist.forEach(item => {
        if (item.src) urls.add(item.src);
        item.sources?.forEach(s => { if (s.src) urls.add(s.src); });
        if (item.background?.backgroundGradient) urls.add(item.background.backgroundGradient);
      });
      if (engineConfig.watermark.mode === "image" && engineConfig.watermark.imageUrl) {
        urls.add(engineConfig.watermark.imageUrl);
      }
      assetManifest = `\n/* ── Asset Manifest ──\n${[...urls].map((u, i) => `   ${i + 1}. ${u}`).join("\n")}\n── End Manifest ── */\n`;
    }

    if (engineConfig.export.format === "json") {
      const jsonData = engineConfig.export.includeAssets
        ? { ...exportData, _assetManifest: [...new Set(playlist.flatMap(item => [item.src, ...item.sources.map(s => s.src)]).filter(Boolean))] }
        : exportData;
      const data = engineConfig.export.minify ? JSON.stringify(jsonData) : JSON.stringify(jsonData, null, 2);
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${engineConfig.meta.title.replace(/\s+/g, "-").toLowerCase() || "config"}-config.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const jsonStr = engineConfig.export.minify ? JSON.stringify(exportData) : JSON.stringify(exportData, null, 2);
      const tsFile = `/* Generated ${new Date().toISOString()} */\nexport const CONFIG = ${jsonStr};${assetManifest}`;
      const blob = new Blob([tsFile], { type: "text/typescript" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "config.ts";
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [engineConfig, playlist]);

  const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        if (data.meta && data.video) {
          const imported: EngineConfig = {
            meta: { ...CONFIG.meta, ...data.meta },
            defaults: { ...CONFIG.defaults, ...data.defaults },
            backgrounds: data.backgrounds ?? [],
            video: {
              fit: data.video.fit ?? CONFIG.video.fit,
              controls: data.video.controls ?? CONFIG.video.controls,
              bgColor: data.video.bgColor ?? CONFIG.video.bgColor,
              globalVolume: data.video.globalVolume ?? CONFIG.video.globalVolume,
              preloadStrategy: data.video.preloadStrategy ?? CONFIG.video.preloadStrategy,
              bufferSize: data.video.bufferSize ?? CONFIG.video.bufferSize,
              playlist: (data.video.playlist ?? CONFIG.video.playlist).map((item: VideoItem) => ({
                ...item,
                sources: item.sources ?? [],
                transition: item.transition ?? CONFIG.defaults.defaultTransition,
                background: {
                  ...CONFIG.defaults.background,
                  ...item.background,
                  effectLayers: item.background?.effectLayers ?? [],
                },
              })),
            },
            controls: { ...CONFIG.controls, ...data.controls },
            audio: { ...CONFIG.audio, ...data.audio },
            theme: { ...CONFIG.theme, ...data.theme },
            performance: { ...CONFIG.performance, ...data.performance },
            export: { ...CONFIG.export, ...data.export },
            watermark: { ...CONFIG.watermark, ...data.watermark },
            accessibility: { ...CONFIG.accessibility, ...data.accessibility },
          };
          setPlaylist(imported.video.playlist);
          setEngineConfig(imported);
        }
      } catch { /* ignore bad json */ }
    };
    reader.readAsText(file);
    e.target.value = "";
  }, []);

  const wmPosStyles: Record<string, React.CSSProperties> = {
    "top-left": { top: 16, left: 16 },
    "top-right": { top: 16, right: 16 },
    "bottom-left": { bottom: 16, left: 16 },
    "bottom-right": { bottom: 16, right: 16 },
    "center": { top: "50%", left: "50%", transform: "translate(-50%, -50%)" },
    "custom": { top: `${engineConfig.watermark.y}%`, left: `${engineConfig.watermark.x}%`, transform: "translate(-50%, -50%)" },
  };

  const reducedMotion = engineConfig.accessibility.reducedMotion;

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: engineConfig.video.bgColor }}>
      {(() => {
        const safeBg = sanitizeBackground(currentBg.backgroundGradient);
        return safeBg ? (
          <div className="fixed inset-0 pointer-events-none" style={{ background: safeBg, zIndex: 0 }} />
        ) : null;
      })()}
      <BackgroundCanvas
        background={currentBg}
        transitionDuration={reducedMotion ? 0 : engineConfig.controls.transitionDuration}
        performance={engineConfig.performance}
      />
      <VideoPlayer config={engineConfig} playlist={playlist} onIndexChange={handleIndexChange} />

      {/* Watermark */}
      {engineConfig.watermark.enabled && (engineConfig.watermark.text || engineConfig.watermark.imageUrl) && (
        <div
          className="fixed pointer-events-none select-none font-mono"
          style={{
            zIndex: 15,
            opacity: engineConfig.watermark.opacity,
            ...wmPosStyles[engineConfig.watermark.position],
            ...(engineConfig.watermark.position === "custom" || engineConfig.watermark.position === "center"
              ? { transform: `translate(-50%, -50%) rotate(${engineConfig.watermark.rotation}deg)` }
              : { transform: `rotate(${engineConfig.watermark.rotation}deg)` }),
          }}
        >
          {engineConfig.watermark.mode === "image" && engineConfig.watermark.imageUrl ? (
            <img
              src={engineConfig.watermark.imageUrl}
              alt="Watermark"
              style={{
                width: engineConfig.watermark.imageWidth || "auto",
                height: engineConfig.watermark.imageHeight || "auto",
                maxWidth: "50vw",
              }}
              draggable={false}
            />
          ) : (
            <span style={{ fontSize: engineConfig.watermark.fontSize, color: engineConfig.watermark.color }}>
              {engineConfig.watermark.text}
            </span>
          )}
        </div>
      )}

      {/* Scanlines overlay */}
      {currentBg.scanlines && (
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            zIndex: 2,
            background: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,${currentBg.scanlineIntensity / 200}) 2px, rgba(0,0,0,${currentBg.scanlineIntensity / 200}) 4px)`,
          }}
        />
      )}

      {/* Film grain overlay */}
      {currentBg.filmGrain > 0 && (
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            zIndex: 2,
            opacity: currentBg.filmGrain / 100,
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`,
          }}
        />
      )}

      {!isFullscreen && (
        <div style={{ opacity: uiVisible ? 1 : 0, transition: "opacity 0.5s" }}>
          <SettingsPanel
            config={engineConfig}
            playlist={playlist}
            currentSlide={currentSlide}
            onPlaylistChange={setPlaylist}
            onConfigChange={setEngineConfig}
            onExport={handleExport}
            onImport={() => importRef.current?.click()}
          />
        </div>
      )}
      <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport} />

      {/* Slide thumbnail strip */}
      {uiVisible && (
        <SlideStrip
          playlist={playlist}
          currentSlide={currentSlide}
          visible={stripVisible}
          onJump={handleJump}
          effectNames={EFFECT_NAMES}
        />
      )}

      {/* Keyboard shortcut overlay */}
      <ShortcutOverlay visible={shortcutsVisible} onClose={() => setShortcutsVisible(false)} />

      {/* ⌘/Ctrl + G slide jump bar */}
      <SlideJumpBar total={playlist.length} />

      {/* Keyboard hint (brief) */}
      {uiVisible && !isFullscreen && !stripVisible && <KeyboardHintBrief />}
    </div>
  );
};

/** Brief hint that fades after 4s — shows extended shortcuts */
const KeyboardHintBrief = () => {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 4000);
    return () => clearTimeout(timer);
  }, []);
  if (!visible) return null;
  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 font-mono text-xs tracking-widest select-none pointer-events-none transition-opacity duration-1000"
      style={{ zIndex: 10, color: "rgba(255,255,255,0.3)", opacity: visible ? 1 : 0 }}
    >
      ← → navigate &nbsp;·&nbsp; T thumbnails &nbsp;·&nbsp; ⌘G jump &nbsp;·&nbsp; ? shortcuts
    </div>
  );
};

export default Index;
