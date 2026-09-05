import { Settings, Download, Upload, RotateCcw, Plus, Trash2, ChevronDown, ChevronRight, Copy, ArrowUp, ArrowDown } from "lucide-react";
import type { VideoItem, EngineConfig, EffectLayer, VideoSource, SlideTransition } from "@/engine/config";
import { CONFIG } from "@/engine/config";
import { SLIDE_TRANSITION_TYPES, SLIDE_TRANSITION_NAMES, SLIDE_TRANSITION_EASINGS } from "@/components/SlideTransition";
import { backgroundRegistry } from "@/engine/backgrounds/registry";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription,
} from "@/components/ui/sheet";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerDescription,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

import { EFFECT_NAMES } from "@/engine/effectNames";

const BLEND_MODES: GlobalCompositeOperation[] = [
  "source-over", "screen", "multiply", "overlay", "lighten", "color-dodge", "hard-light", "soft-light",
];

const TRANSITION_TYPES = ["fade", "wipe", "zoom"] as const;
const COLOR_MODES = ["solid", "gradient", "rainbow", "temperature"] as const;

interface Props {
  config: EngineConfig;
  playlist: VideoItem[];
  currentSlide: number;
  onPlaylistChange: (playlist: VideoItem[]) => void;
  onConfigChange: (config: EngineConfig) => void;
  onExport: () => void;
  onImport: () => void;
}

export const SettingsPanel = ({
  config, playlist, currentSlide, onPlaylistChange, onConfigChange, onExport, onImport,
}: Props) => {
  const isMobile = useIsMobile();
  const currentItem = playlist[currentSlide];
  const [expandedLayers, setExpandedLayers] = useState<Set<number>>(new Set());
  const [expandedSources, setExpandedSources] = useState<Set<number>>(new Set());

  if (!currentItem) return null;

  const updateSlide = (updates: Partial<VideoItem>) => {
    const newPlaylist = [...playlist];
    newPlaylist[currentSlide] = { ...newPlaylist[currentSlide], ...updates };
    onPlaylistChange(newPlaylist);
  };

  const updateBackground = (updates: Partial<VideoItem["background"]>) => {
    updateSlide({ background: { ...currentItem.background, ...updates } });
  };

  const updateControls = (updates: Partial<EngineConfig["controls"]>) => {
    onConfigChange({ ...config, controls: { ...config.controls, ...updates } });
  };

  const updateVideo = (updates: Partial<EngineConfig["video"]>) => {
    onConfigChange({ ...config, video: { ...config.video, ...updates } });
  };

  const updateMeta = (updates: Partial<EngineConfig["meta"]>) => {
    onConfigChange({ ...config, meta: { ...config.meta, ...updates } });
  };

  const updateAudio = (updates: Partial<EngineConfig["audio"]>) => {
    onConfigChange({ ...config, audio: { ...config.audio, ...updates } });
  };

  const updateTheme = (updates: Partial<EngineConfig["theme"]>) => {
    onConfigChange({ ...config, theme: { ...config.theme, ...updates } });
  };

  const updatePerf = (updates: Partial<EngineConfig["performance"]>) => {
    onConfigChange({ ...config, performance: { ...config.performance, ...updates } });
  };

  const updateWatermark = (updates: Partial<EngineConfig["watermark"]>) => {
    onConfigChange({ ...config, watermark: { ...config.watermark, ...updates } });
  };

  const updateA11y = (updates: Partial<EngineConfig["accessibility"]>) => {
    onConfigChange({ ...config, accessibility: { ...config.accessibility, ...updates } });
  };

  const updateExportCfg = (updates: Partial<EngineConfig["export"]>) => {
    onConfigChange({ ...config, export: { ...config.export, ...updates } });
  };

  const resetSlideToDefaults = () => {
    updateSlide({ background: { ...config.defaults.background } });
  };

  // ── Effect Layer helpers ──
  const layers = currentItem.background.effectLayers || [];

  const addLayer = () => {
    const newLayer: EffectLayer = { ...config.defaults.effectLayer };
    updateBackground({ effectLayers: [...layers, newLayer] });
  };

  const removeLayer = (idx: number) => {
    updateBackground({ effectLayers: layers.filter((_, i) => i !== idx) });
  };

  const updateLayer = (idx: number, updates: Partial<EffectLayer>) => {
    const newLayers = [...layers];
    newLayers[idx] = { ...newLayers[idx], ...updates };
    updateBackground({ effectLayers: newLayers });
  };

  const toggleLayer = (idx: number) => {
    const s = new Set(expandedLayers);
    s.has(idx) ? s.delete(idx) : s.add(idx);
    setExpandedLayers(s);
  };

  // ── Video Source helpers ──
  const sources = currentItem.sources || [];

  const addSource = () => {
    const newSrc: VideoSource = { ...config.defaults.videoSource };
    updateSlide({ sources: [...sources, newSrc] });
  };

  const removeSource = (idx: number) => {
    updateSlide({ sources: sources.filter((_, i) => i !== idx) });
  };

  const updateSource = (idx: number, updates: Partial<VideoSource>) => {
    const newSources = [...sources];
    newSources[idx] = { ...newSources[idx], ...updates };
    updateSlide({ sources: newSources });
  };

  const toggleSource = (idx: number) => {
    const s = new Set(expandedSources);
    s.has(idx) ? s.delete(idx) : s.add(idx);
    setExpandedSources(s);
  };

  const triggerButton = (
    <button
      className="fixed top-6 right-6 p-2 rounded-full transition-opacity hover:opacity-100 opacity-40"
      style={{ zIndex: 20, color: "white", background: "rgba(255,255,255,0.1)", backdropFilter: "blur(8px)" }}
    >
      <Settings className="w-5 h-5" />
    </button>
  );

  const settingsContent = (
    <>
      <Accordion type="multiple" defaultValue={["meta", "global", "slide", "effect"]} className="mt-4">
          {/* ─── META ─── */}
          <AccordionItem value="meta" className="border-white/10">
            <AccordionTrigger className="text-xs font-semibold uppercase tracking-widest text-white/50 hover:text-white/70">Project</AccordionTrigger>
            <AccordionContent className="space-y-3 pt-2">
              <div className="space-y-1">
                <Label className="text-white/70 text-xs">Title</Label>
                <Input value={config.meta.title} onChange={(e) => updateMeta({ title: e.target.value })}
                  className="bg-white/5 border-white/10 text-white h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-white/70 text-xs">Author</Label>
                <Input value={config.meta.author} onChange={(e) => updateMeta({ author: e.target.value })}
                  className="bg-white/5 border-white/10 text-white h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-white/70 text-xs">Description</Label>
                <Input value={config.meta.description} onChange={(e) => updateMeta({ description: e.target.value })}
                  className="bg-white/5 border-white/10 text-white h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-white/70 text-xs">License</Label>
                <Input value={config.meta.license} onChange={(e) => updateMeta({ license: e.target.value })}
                  className="bg-white/5 border-white/10 text-white h-8 text-sm" placeholder="MIT, CC-BY-4.0..." />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-white/70 text-xs">Language</Label>
                  <Input value={config.meta.language} onChange={(e) => updateMeta({ language: e.target.value })}
                    className="bg-white/5 border-white/10 text-white h-8 text-sm" placeholder="en" />
                </div>
                <div className="space-y-1">
                  <Label className="text-white/70 text-xs">Category</Label>
                  <Input value={config.meta.category} onChange={(e) => updateMeta({ category: e.target.value })}
                    className="bg-white/5 border-white/10 text-white h-8 text-sm" />
                </div>
              </div>
              <div className="text-white/30 text-xs">v{config.meta.version}</div>
            </AccordionContent>
          </AccordionItem>

          {/* ─── GLOBAL ─── */}
          <AccordionItem value="global" className="border-white/10">
            <AccordionTrigger className="text-xs font-semibold uppercase tracking-widest text-white/50 hover:text-white/70">Global</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <Row label="Video Fit">
                <Select value={config.video.fit} onValueChange={(v) => updateVideo({ fit: v as "contain" | "cover" })}>
                  <SelectTrigger className="w-28 bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default" className="text-white/40">Default</SelectItem>
                    <SelectItem value="contain">Contain</SelectItem>
                    <SelectItem value="cover">Cover</SelectItem>
                  </SelectContent>
                </Select>
              </Row>
              <Row label="Background Color">
                <input type="color" value={config.video.bgColor} onChange={(e) => updateVideo({ bgColor: e.target.value })}
                  className="w-10 h-8 rounded border border-white/10 bg-transparent cursor-pointer" />
              </Row>
              <div className="space-y-1">
                <Label className="text-white/50 text-xs">Global Volume: {Math.round(config.video.globalVolume * 100)}%</Label>
                <Slider value={[config.video.globalVolume]} min={0} max={1} step={0.05}
                  onValueChange={([v]) => updateVideo({ globalVolume: v })} />
              </div>
              <Row label="Preload Strategy">
                <Select value={config.video.preloadStrategy} onValueChange={(v) => updateVideo({ preloadStrategy: v as "none" | "next" | "all" })}>
                  <SelectTrigger className="w-24 bg-white/5 border-white/10 text-white h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="next">Next</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                  </SelectContent>
                </Select>
              </Row>

              <div className="border-t border-white/10 pt-3 space-y-3">
                <Label className="text-white/50 text-xs font-semibold uppercase tracking-wider">Navigation</Label>
                <Row label="Arrow Navigation"><Switch checked={config.controls.arrowNavigation} onCheckedChange={(v) => updateControls({ arrowNavigation: v })} /></Row>
                <Row label="Swipe Navigation"><Switch checked={config.controls.swipeNavigation} onCheckedChange={(v) => updateControls({ swipeNavigation: v })} /></Row>
                <Row label="Click Navigation"><Switch checked={config.controls.clickNavigation} onCheckedChange={(v) => updateControls({ clickNavigation: v })} /></Row>
                <Row label="Scroll Navigation"><Switch checked={config.controls.scrollNavigation} onCheckedChange={(v) => updateControls({ scrollNavigation: v })} /></Row>
                <Row label="Keyboard Shortcuts"><Switch checked={config.controls.keyboardShortcutsEnabled} onCheckedChange={(v) => updateControls({ keyboardShortcutsEnabled: v })} /></Row>
                <Row label="Fullscreen (F key)"><Switch checked={config.controls.fullscreenEnabled} onCheckedChange={(v) => updateControls({ fullscreenEnabled: v })} /></Row>
                <Row label="Gesture Zoom"><Switch checked={config.controls.gestureZoom} onCheckedChange={(v) => updateControls({ gestureZoom: v })} /></Row>
                <Row label="Double Tap">
                   <Select value={config.controls.doubleTapAction} onValueChange={(v) => updateControls({ doubleTapAction: v as "fullscreen" | "next" | "none" })}>
                    <SelectTrigger className="w-28 bg-white/5 border-white/10 text-white h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="default" className="text-white/40">Default</SelectItem>
                      <SelectItem value="fullscreen">Fullscreen</SelectItem>
                      <SelectItem value="next">Next</SelectItem>
                    </SelectContent>
                  </Select>
                </Row>
              </div>

              <div className="border-t border-white/10 pt-3 space-y-3">
                <Label className="text-white/50 text-xs font-semibold uppercase tracking-wider">Playback</Label>
                <Row label="Auto-play First"><Switch checked={config.controls.autoPlayFirst} onCheckedChange={(v) => updateControls({ autoPlayFirst: v })} /></Row>
                <Row label="Auto-advance"><Switch checked={config.controls.autoAdvance} onCheckedChange={(v) => updateControls({ autoAdvance: v })} /></Row>
                <Row label="Random Transitions"><Switch checked={config.controls.randomTransitions} onCheckedChange={(v) => updateControls({ randomTransitions: v })} /></Row>
                <Row label="Loop Playlist"><Switch checked={config.controls.loopPlaylist} onCheckedChange={(v) => updateControls({ loopPlaylist: v })} /></Row>
                <Row label="Pause on Hover"><Switch checked={config.controls.pauseOnHover} onCheckedChange={(v) => updateControls({ pauseOnHover: v })} /></Row>
                {config.controls.autoAdvance && (
                  <div className="space-y-2">
                    <Label className="text-white/70">Advance Delay: {config.controls.autoAdvanceDelay}s</Label>
                    <Slider value={[config.controls.autoAdvanceDelay]} min={0} max={10} step={0.5}
                      onValueChange={([v]) => updateControls({ autoAdvanceDelay: v })} />
                  </div>
                )}
                <div className="space-y-2">
                  <Label className="text-white/70">Transition: {config.controls.transitionDuration}ms</Label>
                  <Slider value={[config.controls.transitionDuration]} min={200} max={2000} step={100}
                    onValueChange={([v]) => updateControls({ transitionDuration: v })} />
                </div>
              </div>

              <div className="border-t border-white/10 pt-3 space-y-3">
                <Label className="text-white/50 text-xs font-semibold uppercase tracking-wider">UI</Label>
                <Row label="Show Slide Number"><Switch checked={config.controls.showSlideNumber} onCheckedChange={(v) => updateControls({ showSlideNumber: v })} /></Row>
                <Row label="Show Progress Bar"><Switch checked={config.controls.showProgressBar} onCheckedChange={(v) => updateControls({ showProgressBar: v })} /></Row>
                <Row label="Idle Hide UI"><Switch checked={config.controls.idleHideUI} onCheckedChange={(v) => updateControls({ idleHideUI: v })} /></Row>
                {config.controls.idleHideUI && (
                  <div className="space-y-2">
                    <Label className="text-white/70">Idle Timeout: {config.controls.idleTimeout}s</Label>
                    <Slider value={[config.controls.idleTimeout]} min={1} max={30} step={1}
                      onValueChange={([v]) => updateControls({ idleTimeout: v })} />
                  </div>
                )}
                <Row label="Enable Builder route"><Switch checked={config.controls.builderEnabled} onCheckedChange={(v) => updateControls({ builderEnabled: v })} /></Row>
                <Row label="Enable Preview page"><Switch checked={config.controls.previewPageEnabled} onCheckedChange={(v) => updateControls({ previewPageEnabled: v })} /></Row>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* ─── SLIDE ─── */}
          <AccordionItem value="slide" className="border-white/10">
            <AccordionTrigger className="text-xs font-semibold uppercase tracking-widest text-white/50 hover:text-white/70">
              Slide {currentSlide + 1}
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              {/* Slide management buttons */}
              <div className="flex gap-1.5">
                <Button variant="outline" size="sm" onClick={() => {
                  const dup = structuredClone(currentItem);
                  const newPlaylist = [...playlist];
                  newPlaylist.splice(currentSlide + 1, 0, dup);
                  onPlaylistChange(newPlaylist);
                }} className="flex-1 bg-white/5 border-white/10 text-white/70 hover:bg-white/10 h-7 text-xs">
                  <Copy className="w-3 h-3 mr-1" /> Duplicate
                </Button>
                {playlist.length > 1 && (
                  <Button variant="outline" size="sm" onClick={() => {
                    const newPlaylist = playlist.filter((_, i) => i !== currentSlide);
                    onPlaylistChange(newPlaylist);
                  }} className="bg-white/5 border-white/10 text-red-400 hover:bg-red-500/10 h-7 text-xs">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
                <Button variant="outline" size="sm" disabled={currentSlide === 0} onClick={() => {
                  const newPlaylist = [...playlist];
                  [newPlaylist[currentSlide - 1], newPlaylist[currentSlide]] = [newPlaylist[currentSlide], newPlaylist[currentSlide - 1]];
                  onPlaylistChange(newPlaylist);
                }} className="bg-white/5 border-white/10 text-white/70 hover:bg-white/10 h-7 text-xs">
                  <ArrowUp className="w-3 h-3" />
                </Button>
                <Button variant="outline" size="sm" disabled={currentSlide >= playlist.length - 1} onClick={() => {
                  const newPlaylist = [...playlist];
                  [newPlaylist[currentSlide], newPlaylist[currentSlide + 1]] = [newPlaylist[currentSlide + 1], newPlaylist[currentSlide]];
                  onPlaylistChange(newPlaylist);
                }} className="bg-white/5 border-white/10 text-white/70 hover:bg-white/10 h-7 text-xs">
                  <ArrowDown className="w-3 h-3" />
                </Button>
              </div>

              <div className="space-y-1">
                <Label className="text-white/70 text-xs">Label</Label>
                <Input value={currentItem.label || ""} onChange={(e) => updateSlide({ label: e.target.value })}
                  className="bg-white/5 border-white/10 text-white h-8 text-xs" placeholder="Slide label..." />
              </div>
              <div className="space-y-1">
                <Label className="text-white/70 text-xs">Notes</Label>
                <Input value={currentItem.notes || ""} onChange={(e) => updateSlide({ notes: e.target.value })}
                  className="bg-white/5 border-white/10 text-white h-8 text-xs" placeholder="Notes..." />
              </div>

              <Row label="Loop"><Switch checked={currentItem.loop} onCheckedChange={(v) => updateSlide({ loop: v })} /></Row>
              <Row label="Muted"><Switch checked={currentItem.muted} onCheckedChange={(v) => updateSlide({ muted: v })} /></Row>
              <div className="space-y-1">
                <Label className="text-white/50 text-xs">Slide Volume: {Math.round((currentItem.volume ?? 1) * 100)}%</Label>
                <Slider value={[currentItem.volume ?? 1]} min={0} max={1} step={0.05}
                  onValueChange={([v]) => updateSlide({ volume: v })} />
              </div>
              <div className="space-y-1">
                <Label className="text-white/70 text-xs">Video URL</Label>
                <Input value={currentItem.src} onChange={(e) => updateSlide({ src: e.target.value })}
                  className="bg-white/5 border-white/10 text-white h-8 text-xs" placeholder="https://..." />
              </div>

              <div className="border-t border-white/10 pt-3 space-y-3">
                <Label className="text-white/50 text-xs font-semibold uppercase tracking-wider">Background</Label>
                <div className="space-y-1">
                  <Label className="text-white/70 text-xs">Gradient (CSS)</Label>
                  <Input value={currentItem.background.backgroundGradient || ""} onChange={(e) => updateBackground({ backgroundGradient: e.target.value })}
                    className="bg-white/5 border-white/10 text-white h-8 text-xs" placeholder="linear-gradient(135deg, #000, #333)" />
                </div>
                <div className="space-y-1">
                  <Label className="text-white/50 text-xs">Vignette: {currentItem.background.vignetteStrength || 0}%</Label>
                  <Slider value={[currentItem.background.vignetteStrength || 0]} min={0} max={100} step={1}
                    onValueChange={([v]) => updateBackground({ vignetteStrength: v })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-white/70 text-xs">Vignette Color (r,g,b)</Label>
                  <Input value={currentItem.background.vignetteColor || "0,0,0"} onChange={(e) => updateBackground({ vignetteColor: e.target.value })}
                    className="bg-white/5 border-white/10 text-white h-8 text-xs" placeholder="0,0,0" />
                </div>
                <div className="space-y-1">
                  <Label className="text-white/70 text-xs">Color Filter (CSS)</Label>
                  <Input value={currentItem.background.colorFilter || ""} onChange={(e) => updateBackground({ colorFilter: e.target.value })}
                    className="bg-white/5 border-white/10 text-white h-8 text-xs" placeholder="hue-rotate(90deg)" />
                </div>
                <Row label="Transition Type">
                  <Select value={currentItem.background.transitionType || "fade"} onValueChange={(v) => updateBackground({ transitionType: v as "fade" | "wipe" | "zoom" })}>
                    <SelectTrigger className="w-24 bg-white/5 border-white/10 text-white h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="text-white/40">None</SelectItem>
                      <SelectItem value="default" className="text-white/40">Default</SelectItem>
                      {TRANSITION_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Row>
              </div>

              <div className="border-t border-white/10 pt-3 space-y-3">
                <Label className="text-white/50 text-xs font-semibold uppercase tracking-wider">Post-Processing</Label>
                <div className="space-y-1">
                  <Label className="text-white/50 text-xs">Motion Blur: {currentItem.background.motionBlur || 0}</Label>
                  <Slider value={[currentItem.background.motionBlur || 0]} min={0} max={20} step={1}
                    onValueChange={([v]) => updateBackground({ motionBlur: v })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-white/50 text-xs">Pixelate: {currentItem.background.pixelate || 0}</Label>
                  <Slider value={[currentItem.background.pixelate || 0]} min={0} max={50} step={1}
                    onValueChange={([v]) => updateBackground({ pixelate: v })} />
                </div>
                <Row label="Scanlines"><Switch checked={currentItem.background.scanlines || false} onCheckedChange={(v) => updateBackground({ scanlines: v })} /></Row>
                {currentItem.background.scanlines && (
                  <div className="space-y-1">
                    <Label className="text-white/50 text-xs">Scanline Intensity: {currentItem.background.scanlineIntensity || 30}%</Label>
                    <Slider value={[currentItem.background.scanlineIntensity || 30]} min={0} max={100} step={1}
                      onValueChange={([v]) => updateBackground({ scanlineIntensity: v })} />
                  </div>
                )}
                <div className="space-y-1">
                  <Label className="text-white/50 text-xs">Film Grain: {currentItem.background.filmGrain || 0}%</Label>
                  <Slider value={[currentItem.background.filmGrain || 0]} min={0} max={100} step={1}
                    onValueChange={([v]) => updateBackground({ filmGrain: v })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-white/70 text-xs">Chroma Key Color</Label>
                  <Input value={currentItem.background.chromaKey || ""} onChange={(e) => updateBackground({ chromaKey: e.target.value })}
                    className="bg-white/5 border-white/10 text-white h-7 text-xs" placeholder="#00ff00" />
                </div>
              </div>

              <div className="border-t border-white/10 pt-3 space-y-3">
                <Label className="text-white/50 text-xs font-semibold uppercase tracking-wider">Slide Transition</Label>
                <Row label="Type">
                  <Select value={currentItem.transition?.type || "fade"} onValueChange={(v) => {
                    const cur = currentItem.transition || { type: "fade" as const, duration: 0.8, easing: "ease" as const };
                    updateSlide({ transition: { ...cur, type: v as SlideTransition["type"] } });
                  }}>
                     <SelectTrigger className="w-28 bg-white/5 border-white/10 text-white h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="text-white/40">None</SelectItem>
                      <SelectItem value="default" className="text-white/40">Default</SelectItem>
                      {SLIDE_TRANSITION_TYPES.map(t => <SelectItem key={t} value={t}>{SLIDE_TRANSITION_NAMES[t]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Row>
                <div className="space-y-1">
                  <Label className="text-white/50 text-xs">Duration: {(currentItem.transition?.duration || 0.8).toFixed(1)}s</Label>
                  <Slider value={[currentItem.transition?.duration || 0.8]} min={0.1} max={3} step={0.1}
                    onValueChange={([v]) => {
                      const cur = currentItem.transition || { type: "fade" as const, duration: 0.8, easing: "ease" as const };
                      updateSlide({ transition: { ...cur, duration: v } });
                    }} />
                </div>
                <Row label="Easing">
                  <Select value={currentItem.transition?.easing || "ease"} onValueChange={(v) => {
                    const cur = currentItem.transition || { type: "fade" as const, duration: 0.8, easing: "ease" as const };
                    updateSlide({ transition: { ...cur, easing: v as SlideTransition["easing"] } });
                  }}>
                     <SelectTrigger className="w-28 bg-white/5 border-white/10 text-white h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default" className="text-white/40">Default</SelectItem>
                      {SLIDE_TRANSITION_EASINGS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Row>
              </div>

              <Button variant="outline" size="sm" onClick={resetSlideToDefaults}
                className="w-full bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white">
                <RotateCcw className="w-3 h-3 mr-2" /> Reset to Defaults
              </Button>
            </AccordionContent>
          </AccordionItem>

          {/* ─── PRIMARY EFFECT ─── */}
          <AccordionItem value="effect" className="border-white/10">
            <AccordionTrigger className="text-xs font-semibold uppercase tracking-widest text-white/50 hover:text-white/70">
              Primary Effect
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <EffectControls
                type={currentItem.background.type}
                color={currentItem.background.color}
                opacity={currentItem.background.opacity}
                blendMode={currentItem.background.blendMode}
                speed={currentItem.background.speed}
                saturation={currentItem.background.saturation}
                brightness={currentItem.background.brightness}
                intensity={currentItem.background.intensity}
                scale={currentItem.background.scale}
                turbulence={currentItem.background.turbulence}
                direction={currentItem.background.direction}
                onUpdate={updateBackground}
              />
            </AccordionContent>
          </AccordionItem>

          {/* ─── EFFECT LAYERS ─── */}
          <AccordionItem value="layers" className="border-white/10">
            <AccordionTrigger className="text-xs font-semibold uppercase tracking-widest text-white/50 hover:text-white/70">
              Effect Layers ({layers.length})
            </AccordionTrigger>
            <AccordionContent className="space-y-3 pt-2">
              {layers.map((layer, idx) => (
                <div key={idx} className="border border-white/10 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleLayer(idx)}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs text-white/70 hover:bg-white/5"
                  >
                    <span className="flex items-center gap-2">
                      {expandedLayers.has(idx) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                      {EFFECT_NAMES[layer.type] || layer.type}
                    </span>
                    <button onClick={(e) => { e.stopPropagation(); removeLayer(idx); }}
                      className="p-1 hover:bg-red-500/20 rounded"><Trash2 className="w-3 h-3 text-red-400" /></button>
                  </button>
                  {expandedLayers.has(idx) && (
                    <div className="px-3 pb-3 space-y-3">
                      <EffectControls
                        type={layer.type} color={layer.color} opacity={layer.opacity}
                        blendMode={layer.blendMode} speed={layer.speed} saturation={layer.saturation}
                        brightness={layer.brightness} intensity={layer.intensity} scale={layer.scale}
                        turbulence={layer.turbulence} direction={layer.direction}
                        onUpdate={(updates) => updateLayer(idx, updates)}
                      />
                      <div className="border-t border-white/10 pt-3 space-y-3">
                        <Label className="text-white/50 text-xs font-semibold uppercase tracking-wider">Advanced</Label>
                        <div className="space-y-1">
                          <Label className="text-white/50 text-xs">Particle Count: {layer.particleCount}</Label>
                          <Slider value={[layer.particleCount]} min={10} max={2000} step={10}
                            onValueChange={([v]) => updateLayer(idx, { particleCount: v })} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-white/50 text-xs">Secondary Hue: {layer.colorSecondary}°</Label>
                          <input type="range" min="0" max="360" value={parseInt(layer.colorSecondary) || 0}
                            onChange={(e) => updateLayer(idx, { colorSecondary: e.target.value })}
                            className="w-full h-2 rounded-full appearance-none cursor-pointer"
                            style={{ background: "linear-gradient(to right, hsl(0,100%,50%), hsl(60,100%,50%), hsl(120,100%,50%), hsl(180,100%,50%), hsl(240,100%,50%), hsl(300,100%,50%), hsl(360,100%,50%))" }} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-white/50 text-xs">Blur: {layer.blur}px</Label>
                          <Slider value={[layer.blur]} min={0} max={20} step={0.5}
                            onValueChange={([v]) => updateLayer(idx, { blur: v })} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-white/50 text-xs">Glow: {layer.glow}%</Label>
                          <Slider value={[layer.glow]} min={0} max={100} step={1}
                            onValueChange={([v]) => updateLayer(idx, { glow: v })} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-white/50 text-xs">Rotation: {layer.rotation}°</Label>
                          <Slider value={[layer.rotation]} min={0} max={360} step={1}
                            onValueChange={([v]) => updateLayer(idx, { rotation: v })} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-white/50 text-xs">Noise: {layer.noiseAmount}%</Label>
                          <Slider value={[layer.noiseAmount]} min={0} max={100} step={1}
                            onValueChange={([v]) => updateLayer(idx, { noiseAmount: v })} />
                        </div>
                        <Row label="Mirror"><Switch checked={layer.mirror} onCheckedChange={(v) => updateLayer(idx, { mirror: v })} /></Row>
                        <Row label="Invert"><Switch checked={layer.invert} onCheckedChange={(v) => updateLayer(idx, { invert: v })} /></Row>

                        <div className="border-t border-white/10 pt-3 space-y-3">
                          <Label className="text-white/50 text-xs font-semibold uppercase tracking-wider">Wave</Label>
                          <div className="space-y-1">
                            <Label className="text-white/50 text-xs">Frequency: {layer.frequency?.toFixed(1)}</Label>
                            <Slider value={[layer.frequency || 1]} min={0.1} max={10} step={0.1}
                              onValueChange={([v]) => updateLayer(idx, { frequency: v })} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-white/50 text-xs">Amplitude: {layer.amplitude || 50}</Label>
                            <Slider value={[layer.amplitude || 50]} min={0} max={100} step={1}
                              onValueChange={([v]) => updateLayer(idx, { amplitude: v })} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-white/50 text-xs">Phase: {layer.phase || 0}°</Label>
                            <Slider value={[layer.phase || 0]} min={0} max={360} step={1}
                              onValueChange={([v]) => updateLayer(idx, { phase: v })} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-white/50 text-xs">Decay: {layer.decay || 0}%</Label>
                            <Slider value={[layer.decay || 0]} min={0} max={100} step={1}
                              onValueChange={([v]) => updateLayer(idx, { decay: v })} />
                          </div>
                          <Row label="Color Mode">
                             <Select value={layer.colorMode || "solid"} onValueChange={(v) => updateLayer(idx, { colorMode: v as EffectLayer["colorMode"] })}>
                              <SelectTrigger className="w-28 bg-white/5 border-white/10 text-white h-7 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none" className="text-white/40">None</SelectItem>
                                <SelectItem value="default" className="text-white/40">Default</SelectItem>
                                {COLOR_MODES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </Row>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addLayer}
                className="w-full bg-white/5 border-white/10 text-white/70 hover:bg-white/10">
                <Plus className="w-3 h-3 mr-2" /> Add Layer
              </Button>
            </AccordionContent>
          </AccordionItem>

          {/* ─── VIDEO SOURCES ─── */}
          <AccordionItem value="videos" className="border-white/10">
            <AccordionTrigger className="text-xs font-semibold uppercase tracking-widest text-white/50 hover:text-white/70">
              Video Sources ({sources.length})
            </AccordionTrigger>
            <AccordionContent className="space-y-3 pt-2">
              <p className="text-white/30 text-xs">Add multiple positioned videos per slide.</p>
              {sources.map((src, idx) => (
                <div key={idx} className="border border-white/10 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleSource(idx)}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs text-white/70 hover:bg-white/5"
                  >
                    <span className="flex items-center gap-2">
                      {expandedSources.has(idx) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                      Source {idx + 1}
                    </span>
                    <button onClick={(e) => { e.stopPropagation(); removeSource(idx); }}
                      className="p-1 hover:bg-red-500/20 rounded"><Trash2 className="w-3 h-3 text-red-400" /></button>
                  </button>
                  {expandedSources.has(idx) && (
                    <div className="px-3 pb-3 space-y-3">
                      <div className="space-y-1">
                        <Label className="text-white/70 text-xs">URL</Label>
                        <Input value={src.src} onChange={(e) => updateSource(idx, { src: e.target.value })}
                          className="bg-white/5 border-white/10 text-white h-7 text-xs" placeholder="https://..." />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-white/50 text-xs">X: {src.x}%</Label>
                          <Slider value={[src.x]} min={0} max={100} step={1} onValueChange={([v]) => updateSource(idx, { x: v })} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-white/50 text-xs">Y: {src.y}%</Label>
                          <Slider value={[src.y]} min={0} max={100} step={1} onValueChange={([v]) => updateSource(idx, { y: v })} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-white/50 text-xs">W: {src.width}%</Label>
                          <Slider value={[src.width]} min={1} max={100} step={1} onValueChange={([v]) => updateSource(idx, { width: v })} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-white/50 text-xs">H: {src.height}%</Label>
                          <Slider value={[src.height]} min={1} max={100} step={1} onValueChange={([v]) => updateSource(idx, { height: v })} />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-white/50 text-xs">Opacity: {Math.round(src.opacity * 100)}%</Label>
                        <Slider value={[src.opacity]} min={0} max={1} step={0.05} onValueChange={([v]) => updateSource(idx, { opacity: v })} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-white/50 text-xs">Volume: {Math.round((src.volume ?? 1) * 100)}%</Label>
                        <Slider value={[src.volume ?? 1]} min={0} max={1} step={0.05} onValueChange={([v]) => updateSource(idx, { volume: v })} />
                      </div>
                      <Row label="Fit">
                         <Select value={src.fit} onValueChange={(v) => updateSource(idx, { fit: v as "contain" | "cover" })}>
                          <SelectTrigger className="w-24 bg-white/5 border-white/10 text-white h-7 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default" className="text-white/40">Default</SelectItem>
                            <SelectItem value="contain">Contain</SelectItem>
                            <SelectItem value="cover">Cover</SelectItem>
                          </SelectContent>
                        </Select>
                      </Row>
                      <Row label="Blend Mode">
                         <Select value={src.blendMode || "source-over"} onValueChange={(v) => updateSource(idx, { blendMode: v as GlobalCompositeOperation })}>
                          <SelectTrigger className="w-28 bg-white/5 border-white/10 text-white h-7 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none" className="text-white/40">None</SelectItem>
                            <SelectItem value="default" className="text-white/40">Default</SelectItem>
                            {BLEND_MODES.map((mode) => (<SelectItem key={mode} value={mode}>{mode}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      </Row>
                      <Row label="Loop"><Switch checked={src.loop} onCheckedChange={(v) => updateSource(idx, { loop: v })} /></Row>
                      <Row label="Muted"><Switch checked={src.muted} onCheckedChange={(v) => updateSource(idx, { muted: v })} /></Row>

                      <div className="border-t border-white/10 pt-3 space-y-3">
                        <Label className="text-white/50 text-xs font-semibold uppercase tracking-wider">Transform</Label>
                        <div className="space-y-1">
                          <Label className="text-white/50 text-xs">Border Radius: {src.borderRadius || 0}%</Label>
                          <Slider value={[src.borderRadius || 0]} min={0} max={50} step={1}
                            onValueChange={([v]) => updateSource(idx, { borderRadius: v })} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-white/50 text-xs">Rotation: {src.rotation || 0}°</Label>
                          <Slider value={[src.rotation || 0]} min={0} max={360} step={1}
                            onValueChange={([v]) => updateSource(idx, { rotation: v })} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-white/50 text-xs">Playback Rate: {(src.playbackRate || 1).toFixed(1)}x</Label>
                          <Slider value={[src.playbackRate || 1]} min={0.1} max={4} step={0.1}
                            onValueChange={([v]) => updateSource(idx, { playbackRate: v })} />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-white/50 text-xs">Start: {src.startTime || 0}s</Label>
                            <Slider value={[src.startTime || 0]} min={0} max={300} step={0.5}
                              onValueChange={([v]) => updateSource(idx, { startTime: v })} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-white/50 text-xs">End: {src.endTime || 0}s</Label>
                            <Slider value={[src.endTime || 0]} min={0} max={300} step={0.5}
                              onValueChange={([v]) => updateSource(idx, { endTime: v })} />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-white/70 text-xs">CSS Filter</Label>
                          <Input value={src.filter || ""} onChange={(e) => updateSource(idx, { filter: e.target.value })}
                            className="bg-white/5 border-white/10 text-white h-7 text-xs" placeholder="brightness(1.2)" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-white/70 text-xs">Shadow</Label>
                          <Input value={src.shadow || ""} onChange={(e) => updateSource(idx, { shadow: e.target.value })}
                            className="bg-white/5 border-white/10 text-white h-7 text-xs" placeholder="0 4px 20px rgba(0,0,0,0.5)" />
                        </div>
                      </div>

                      <div className="border-t border-white/10 pt-3 space-y-3">
                        <Label className="text-white/50 text-xs font-semibold uppercase tracking-wider">Crop</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-white/50 text-xs">Top: {src.cropTop || 0}%</Label>
                            <Slider value={[src.cropTop || 0]} min={0} max={50} step={1}
                              onValueChange={([v]) => updateSource(idx, { cropTop: v })} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-white/50 text-xs">Bottom: {src.cropBottom || 0}%</Label>
                            <Slider value={[src.cropBottom || 0]} min={0} max={50} step={1}
                              onValueChange={([v]) => updateSource(idx, { cropBottom: v })} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-white/50 text-xs">Left: {src.cropLeft || 0}%</Label>
                            <Slider value={[src.cropLeft || 0]} min={0} max={50} step={1}
                              onValueChange={([v]) => updateSource(idx, { cropLeft: v })} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-white/50 text-xs">Right: {src.cropRight || 0}%</Label>
                            <Slider value={[src.cropRight || 0]} min={0} max={50} step={1}
                              onValueChange={([v]) => updateSource(idx, { cropRight: v })} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addSource}
                className="w-full bg-white/5 border-white/10 text-white/70 hover:bg-white/10">
                <Plus className="w-3 h-3 mr-2" /> Add Video Source
              </Button>
            </AccordionContent>
          </AccordionItem>

          {/* ─── AUDIO ─── */}
          <AccordionItem value="audio" className="border-white/10">
            <AccordionTrigger className="text-xs font-semibold uppercase tracking-widest text-white/50 hover:text-white/70">Audio</AccordionTrigger>
            <AccordionContent className="space-y-3 pt-2">
              <Row label="Enabled"><Switch checked={config.audio.enabled} onCheckedChange={(v) => updateAudio({ enabled: v })} /></Row>
              <Row label="Global Mute"><Switch checked={config.audio.globalMute} onCheckedChange={(v) => updateAudio({ globalMute: v })} /></Row>
              <div className="space-y-1">
                <Label className="text-white/50 text-xs">Volume: {Math.round(config.audio.volume * 100)}%</Label>
                <Slider value={[config.audio.volume]} min={0} max={1} step={0.05}
                  onValueChange={([v]) => updateAudio({ volume: v })} />
              </div>
              <Row label="Fade In"><Switch checked={config.audio.fadeIn} onCheckedChange={(v) => updateAudio({ fadeIn: v })} /></Row>
              {config.audio.fadeIn && (
                <div className="space-y-1">
                  <Label className="text-white/50 text-xs">Fade In: {config.audio.fadeInDuration}ms</Label>
                  <Slider value={[config.audio.fadeInDuration]} min={100} max={3000} step={100}
                    onValueChange={([v]) => updateAudio({ fadeInDuration: v })} />
                </div>
              )}
              <Row label="Fade Out"><Switch checked={config.audio.fadeOut} onCheckedChange={(v) => updateAudio({ fadeOut: v })} /></Row>
              {config.audio.fadeOut && (
                <div className="space-y-1">
                  <Label className="text-white/50 text-xs">Fade Out: {config.audio.fadeOutDuration}ms</Label>
                  <Slider value={[config.audio.fadeOutDuration]} min={100} max={3000} step={100}
                    onValueChange={([v]) => updateAudio({ fadeOutDuration: v })} />
                </div>
              )}
              <Row label="Crossfade"><Switch checked={config.audio.crossfade} onCheckedChange={(v) => updateAudio({ crossfade: v })} /></Row>
              {config.audio.crossfade && (
                <div className="space-y-1">
                  <Label className="text-white/50 text-xs">Crossfade: {config.audio.crossfadeDuration}ms</Label>
                  <Slider value={[config.audio.crossfadeDuration]} min={200} max={5000} step={100}
                    onValueChange={([v]) => updateAudio({ crossfadeDuration: v })} />
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* ─── THEME ─── */}
          <AccordionItem value="theme" className="border-white/10">
            <AccordionTrigger className="text-xs font-semibold uppercase tracking-widest text-white/50 hover:text-white/70">Theme</AccordionTrigger>
            <AccordionContent className="space-y-3 pt-2">
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-white/50 text-xs">Primary</Label>
                  <input type="color" value={config.theme.primaryColor} onChange={(e) => updateTheme({ primaryColor: e.target.value })}
                    className="w-full h-8 rounded border border-white/10 bg-transparent cursor-pointer" />
                </div>
                <div className="space-y-1">
                  <Label className="text-white/50 text-xs">Secondary</Label>
                  <input type="color" value={config.theme.secondaryColor} onChange={(e) => updateTheme({ secondaryColor: e.target.value })}
                    className="w-full h-8 rounded border border-white/10 bg-transparent cursor-pointer" />
                </div>
                <div className="space-y-1">
                  <Label className="text-white/50 text-xs">Accent</Label>
                  <input type="color" value={config.theme.accentColor} onChange={(e) => updateTheme({ accentColor: e.target.value })}
                    className="w-full h-8 rounded border border-white/10 bg-transparent cursor-pointer" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-white/70 text-xs">Font Family</Label>
                <Input value={config.theme.fontFamily} onChange={(e) => updateTheme({ fontFamily: e.target.value })}
                  className="bg-white/5 border-white/10 text-white h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-white/50 text-xs">UI Opacity: {Math.round(config.theme.uiOpacity * 100)}%</Label>
                <Slider value={[config.theme.uiOpacity]} min={0.1} max={1} step={0.05}
                  onValueChange={([v]) => updateTheme({ uiOpacity: v })} />
              </div>
              <Row label="UI Position">
                <Select value={config.theme.uiPosition} onValueChange={(v) => updateTheme({ uiPosition: v as EngineConfig["theme"]["uiPosition"] })}>
                  <SelectTrigger className="w-28 bg-white/5 border-white/10 text-white h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default" className="text-white/40">Default</SelectItem>
                    <SelectItem value="top-right">Top Right</SelectItem>
                    <SelectItem value="top-left">Top Left</SelectItem>
                    <SelectItem value="bottom-right">Bottom Right</SelectItem>
                    <SelectItem value="bottom-left">Bottom Left</SelectItem>
                  </SelectContent>
                </Select>
              </Row>
              <Row label="Dark Mode"><Switch checked={config.theme.darkMode} onCheckedChange={(v) => updateTheme({ darkMode: v })} /></Row>
            </AccordionContent>
          </AccordionItem>

          {/* ─── PERFORMANCE ─── */}
          <AccordionItem value="performance" className="border-white/10">
            <AccordionTrigger className="text-xs font-semibold uppercase tracking-widest text-white/50 hover:text-white/70">Performance</AccordionTrigger>
            <AccordionContent className="space-y-3 pt-2">
              <div className="space-y-1">
                <Label className="text-white/50 text-xs">Max FPS: {config.performance.maxFPS}</Label>
                <Slider value={[config.performance.maxFPS]} min={15} max={144} step={1}
                  onValueChange={([v]) => updatePerf({ maxFPS: v })} />
              </div>
              <div className="space-y-1">
                <Label className="text-white/50 text-xs">Resolution: {config.performance.resolution.toFixed(2)}x</Label>
                <Slider value={[config.performance.resolution]} min={0.25} max={2} step={0.25}
                  onValueChange={([v]) => updatePerf({ resolution: v })} />
              </div>
              <div className="space-y-1">
                <Label className="text-white/50 text-xs">Max Particles: {config.performance.maxParticles}</Label>
                <Slider value={[config.performance.maxParticles]} min={100} max={10000} step={100}
                  onValueChange={([v]) => updatePerf({ maxParticles: v })} />
              </div>
              <Row label="GPU Acceleration"><Switch checked={config.performance.enableGPU} onCheckedChange={(v) => updatePerf({ enableGPU: v })} /></Row>
              <Row label="Bloom"><Switch checked={config.performance.enableBloom} onCheckedChange={(v) => updatePerf({ enableBloom: v })} /></Row>
              <Row label="Antialiasing"><Switch checked={config.performance.antialiasing} onCheckedChange={(v) => updatePerf({ antialiasing: v })} /></Row>
            </AccordionContent>
          </AccordionItem>

          {/* ─── WATERMARK ─── */}
          <AccordionItem value="watermark" className="border-white/10">
            <AccordionTrigger className="text-xs font-semibold uppercase tracking-widest text-white/50 hover:text-white/70">Watermark</AccordionTrigger>
            <AccordionContent className="space-y-3 pt-2">
              <Row label="Enabled"><Switch checked={config.watermark.enabled} onCheckedChange={(v) => updateWatermark({ enabled: v })} /></Row>
              <Row label="Mode">
                <Select value={config.watermark.mode ?? "text"} onValueChange={(v) => updateWatermark({ mode: v as "text" | "image" })}>
                  <SelectTrigger className="w-28 bg-white/5 border-white/10 text-white h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="image">Logo/Image</SelectItem>
                  </SelectContent>
                </Select>
              </Row>
              {(config.watermark.mode ?? "text") === "text" ? (
                <>
                  <div className="space-y-1">
                    <Label className="text-white/70 text-xs">Text</Label>
                    <Input value={config.watermark.text} onChange={(e) => updateWatermark({ text: e.target.value })}
                      className="bg-white/5 border-white/10 text-white h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-white/50 text-xs">Font Size: {config.watermark.fontSize}px</Label>
                    <Slider value={[config.watermark.fontSize]} min={8} max={72} step={1}
                      onValueChange={([v]) => updateWatermark({ fontSize: v })} />
                  </div>
                  <Row label="Color">
                    <input type="color" value={config.watermark.color} onChange={(e) => updateWatermark({ color: e.target.value })}
                      className="w-10 h-8 rounded border border-white/10 bg-transparent cursor-pointer" />
                  </Row>
                </>
              ) : (
                <>
                  <div className="space-y-1">
                    <Label className="text-white/70 text-xs">Image URL</Label>
                    <Input value={config.watermark.imageUrl ?? ""} onChange={(e) => updateWatermark({ imageUrl: e.target.value })}
                      placeholder="https://example.com/logo.png"
                      className="bg-white/5 border-white/10 text-white h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-white/50 text-xs">Width: {config.watermark.imageWidth ?? 100}px</Label>
                    <Slider value={[config.watermark.imageWidth ?? 100]} min={16} max={500} step={1}
                      onValueChange={([v]) => updateWatermark({ imageWidth: v })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-white/50 text-xs">Height: {config.watermark.imageHeight ?? 0}px (0 = auto)</Label>
                    <Slider value={[config.watermark.imageHeight ?? 0]} min={0} max={500} step={1}
                      onValueChange={([v]) => updateWatermark({ imageHeight: v })} />
                  </div>
                </>
              )}
              <Row label="Position">
                <Select value={config.watermark.position} onValueChange={(v) => updateWatermark({ position: v as EngineConfig["watermark"]["position"] })}>
                  <SelectTrigger className="w-28 bg-white/5 border-white/10 text-white h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="top-left">Top Left</SelectItem>
                    <SelectItem value="top-right">Top Right</SelectItem>
                    <SelectItem value="bottom-left">Bottom Left</SelectItem>
                    <SelectItem value="bottom-right">Bottom Right</SelectItem>
                    <SelectItem value="center">Center</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </Row>
              {config.watermark.position === "custom" && (
                <>
                  <div className="space-y-1">
                    <Label className="text-white/50 text-xs">X Position: {config.watermark.x ?? 50}%</Label>
                    <Slider value={[config.watermark.x ?? 50]} min={0} max={100} step={1}
                      onValueChange={([v]) => updateWatermark({ x: v })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-white/50 text-xs">Y Position: {config.watermark.y ?? 50}%</Label>
                    <Slider value={[config.watermark.y ?? 50]} min={0} max={100} step={1}
                      onValueChange={([v]) => updateWatermark({ y: v })} />
                  </div>
                </>
              )}
              <div className="space-y-1">
                <Label className="text-white/50 text-xs">Opacity: {Math.round(config.watermark.opacity * 100)}%</Label>
                <Slider value={[config.watermark.opacity]} min={0} max={1} step={0.05}
                  onValueChange={([v]) => updateWatermark({ opacity: v })} />
              </div>
              <div className="space-y-1">
                <Label className="text-white/50 text-xs">Rotation: {config.watermark.rotation}°</Label>
                <Slider value={[config.watermark.rotation]} min={0} max={360} step={1}
                  onValueChange={([v]) => updateWatermark({ rotation: v })} />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* ─── ACCESSIBILITY ─── */}
          <AccordionItem value="a11y" className="border-white/10">
            <AccordionTrigger className="text-xs font-semibold uppercase tracking-widest text-white/50 hover:text-white/70">Accessibility</AccordionTrigger>
            <AccordionContent className="space-y-3 pt-2">
              <Row label="Reduced Motion"><Switch checked={config.accessibility.reducedMotion} onCheckedChange={(v) => updateA11y({ reducedMotion: v })} /></Row>
              <Row label="High Contrast"><Switch checked={config.accessibility.highContrast} onCheckedChange={(v) => updateA11y({ highContrast: v })} /></Row>
              <Row label="Screen Reader"><Switch checked={config.accessibility.screenReaderAnnouncements} onCheckedChange={(v) => updateA11y({ screenReaderAnnouncements: v })} /></Row>
              <Row label="Focus Indicators"><Switch checked={config.accessibility.focusIndicators} onCheckedChange={(v) => updateA11y({ focusIndicators: v })} /></Row>
            </AccordionContent>
          </AccordionItem>

          {/* ─── EXPORT ─── */}
          <AccordionItem value="exportcfg" className="border-white/10">
            <AccordionTrigger className="text-xs font-semibold uppercase tracking-widest text-white/50 hover:text-white/70">Export Settings</AccordionTrigger>
            <AccordionContent className="space-y-3 pt-2">
              <Row label="Format">
                <Select value={config.export.format} onValueChange={(v) => updateExportCfg({ format: v as "json" | "ts" })}>
                  <SelectTrigger className="w-24 bg-white/5 border-white/10 text-white h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="json">JSON</SelectItem>
                    <SelectItem value="ts">config.ts</SelectItem>
                  </SelectContent>
                </Select>
              </Row>
              <Row label="Minify"><Switch checked={config.export.minify} onCheckedChange={(v) => updateExportCfg({ minify: v })} /></Row>
              <Row label="Include Assets"><Switch checked={config.export.includeAssets} onCheckedChange={(v) => updateExportCfg({ includeAssets: v })} /></Row>
              <Row label="Embed Videos"><Switch checked={config.export.embedVideos} onCheckedChange={(v) => updateExportCfg({ embedVideos: v })} /></Row>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* ─── EXPORT / IMPORT ─── */}
        <div className="mt-6 flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10" onClick={onExport}>
            <Download className="w-4 h-4 mr-2" /> Export
          </Button>
          <Button variant="outline" size="sm" className="flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10" onClick={onImport}>
            <Upload className="w-4 h-4 mr-2" /> Import
          </Button>
        </div>
      </>
    );

  if (isMobile) {
    return (
      <Drawer>
        <DrawerTrigger asChild>{triggerButton}</DrawerTrigger>
        <DrawerContent
          className="overflow-y-auto max-h-[60vh] border-t border-white/10"
          style={{ background: "rgba(10,10,10,0.95)", backdropFilter: "blur(20px)" }}
        >
          <DrawerHeader>
            <DrawerTitle className="text-white">Settings</DrawerTitle>
            <DrawerDescription className="text-white/50">
              Slide {currentSlide + 1} / {playlist.length}
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-4">
            {settingsContent}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet>
      <SheetTrigger asChild>{triggerButton}</SheetTrigger>
      <SheetContent
        side="right"
        className="overflow-y-auto border-l border-white/10 w-[360px]"
        style={{ background: "rgba(10,10,10,0.95)", backdropFilter: "blur(20px)" }}
      >
        <SheetHeader>
          <SheetTitle className="text-white">Settings</SheetTitle>
          <SheetDescription className="text-white/50">
            Slide {currentSlide + 1} / {playlist.length}
          </SheetDescription>
        </SheetHeader>
        {settingsContent}
      </SheetContent>
    </Sheet>
  );
};

// ── Reusable effect controls ──

interface EffectControlsProps {
  type: string; color: string; opacity: number; blendMode: GlobalCompositeOperation;
  speed: number; saturation: number; brightness: number;
  intensity: number; scale: number; turbulence: number; direction: number;
  onUpdate: (updates: Record<string, unknown>) => void;
}

const EffectControls = ({ type, color, opacity, blendMode, speed, saturation, brightness, intensity, scale, turbulence, direction, onUpdate }: EffectControlsProps) => (
  <div className="space-y-3">
    <div className="space-y-1">
      <Label className="text-white/70 text-xs">Effect</Label>
       <Select value={type} onValueChange={(v) => onUpdate({ type: v })}>
        <SelectTrigger className="w-full bg-white/5 border-white/10 text-white h-8 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none" className="text-white/40">None</SelectItem>
          <SelectItem value="default" className="text-white/40">Default</SelectItem>
          {Object.keys(backgroundRegistry).map((key) => (
            <SelectItem key={key} value={key}>{EFFECT_NAMES[key] || key}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
    <div className="space-y-1">
      <Label className="text-white/70 text-xs">Hue: {color}°</Label>
      <input type="range" min="0" max="360" value={parseInt(color) || 0}
        onChange={(e) => onUpdate({ color: e.target.value })}
        className="w-full h-2 rounded-full appearance-none cursor-pointer"
        style={{ background: "linear-gradient(to right, hsl(0,100%,50%), hsl(60,100%,50%), hsl(120,100%,50%), hsl(180,100%,50%), hsl(240,100%,50%), hsl(300,100%,50%), hsl(360,100%,50%))" }} />
    </div>
    <div className="space-y-1">
      <Label className="text-white/50 text-xs">Opacity: {Math.round(opacity * 100)}%</Label>
      <Slider value={[opacity]} min={0} max={1} step={0.05} onValueChange={([v]) => onUpdate({ opacity: v })} />
    </div>
    <div className="space-y-1">
      <Label className="text-white/50 text-xs">Speed: {speed.toFixed(1)}x</Label>
      <Slider value={[speed]} min={0.1} max={3} step={0.1} onValueChange={([v]) => onUpdate({ speed: v })} />
    </div>
    <div className="space-y-1">
      <Label className="text-white/50 text-xs">Intensity: {intensity}</Label>
      <Slider value={[intensity]} min={0} max={100} step={1} onValueChange={([v]) => onUpdate({ intensity: v })} />
    </div>
    <div className="space-y-1">
      <Label className="text-white/50 text-xs">Scale: {scale.toFixed(1)}x</Label>
      <Slider value={[scale]} min={0.1} max={3} step={0.1} onValueChange={([v]) => onUpdate({ scale: v })} />
    </div>
    <div className="space-y-1">
      <Label className="text-white/50 text-xs">Turbulence: {turbulence}</Label>
      <Slider value={[turbulence]} min={0} max={100} step={1} onValueChange={([v]) => onUpdate({ turbulence: v })} />
    </div>
    <div className="space-y-1">
      <Label className="text-white/50 text-xs">Direction: {direction}°</Label>
      <Slider value={[direction]} min={0} max={360} step={1} onValueChange={([v]) => onUpdate({ direction: v })} />
    </div>
    <div className="space-y-1">
      <Label className="text-white/50 text-xs">Saturation: {saturation}%</Label>
      <Slider value={[saturation]} min={0} max={100} step={1} onValueChange={([v]) => onUpdate({ saturation: v })} />
    </div>
    <div className="space-y-1">
      <Label className="text-white/50 text-xs">Brightness: {brightness}%</Label>
      <Slider value={[brightness]} min={0} max={100} step={1} onValueChange={([v]) => onUpdate({ brightness: v })} />
    </div>
    <div className="space-y-1">
      <Label className="text-white/50 text-xs">Blend Mode</Label>
       <Select value={blendMode} onValueChange={(v) => onUpdate({ blendMode: v })}>
        <SelectTrigger className="w-full bg-white/5 border-white/10 text-white h-7 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none" className="text-white/40">None</SelectItem>
          <SelectItem value="default" className="text-white/40">Default</SelectItem>
          {BLEND_MODES.map((mode) => (<SelectItem key={mode} value={mode}>{mode}</SelectItem>))}
        </SelectContent>
      </Select>
    </div>
  </div>
);

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-center justify-between">
    <Label className="text-white/70 text-xs">{label}</Label>
    {children}
  </div>
);
