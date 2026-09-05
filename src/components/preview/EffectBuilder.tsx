import { useEffect, useRef, useState, useCallback } from "react";
import { backgroundRegistry } from "@/engine/backgrounds/registry";
import type { BackgroundLayer, EffectParams } from "@/engine/backgrounds/types";
import { DEFAULT_PARAMS } from "@/engine/backgrounds/types";
import { SLIDE_TRANSITION_TYPES, SLIDE_TRANSITION_NAMES, SLIDE_TRANSITION_EASINGS } from "@/components/SlideTransition";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { X, Copy, Check, Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const BLEND_MODES: GlobalCompositeOperation[] = [
  "source-over", "screen", "multiply", "overlay", "lighten",
  "color-dodge", "hard-light", "soft-light", "difference", "exclusion",
];

const COLOR_MODES = ["solid", "gradient", "rainbow", "temperature"] as const;
const TRANSITION_TYPES_BG = ["fade", "wipe", "zoom"] as const;

interface Props {
  onClose: () => void;
}

const effectKeys = Object.keys(backgroundRegistry);

import { EFFECT_NAMES } from "@/engine/effectNames";

// ── Full slide state matching VideoItem + SlideBackground ──
interface EffectLayerState {
  type: string; color: string; opacity: number; blendMode: GlobalCompositeOperation;
  intensity: number; scale: number; turbulence: number; direction: number; speed: number;
  saturation: number; brightness: number; particleCount: number; colorSecondary: string;
  blur: number; glow: number; rotation: number; mirror: boolean; invert: boolean;
  noiseAmount: number; frequency: number; amplitude: number; phase: number; decay: number;
  colorMode: "solid" | "gradient" | "rainbow" | "temperature";
}

interface VideoSourceState {
  src: string; x: number; y: number; width: number; height: number;
  fit: "contain" | "cover"; opacity: number; volume: number; zIndex: number;
  loop: boolean; muted: boolean; borderRadius: number; rotation: number;
  filter: string; startTime: number; endTime: number; playbackRate: number;
  chromaKey: string; chromaKeyThreshold: number; shadow: string;
  blendMode: GlobalCompositeOperation;
  cropTop: number; cropBottom: number; cropLeft: number; cropRight: number;
}

interface SlideState {
  // Slide-level
  src: string; loop: boolean; muted: boolean; volume: number;
  // Transition
  transitionType: string; transitionDuration: number; transitionEasing: string;
  // Background primary
  bgType: string; bgColor: string; bgOpacity: number; bgBlendMode: GlobalCompositeOperation;
  bgSpeed: number; bgIntensity: number; bgScale: number; bgTurbulence: number;
  bgDirection: number; bgSaturation: number; bgBrightness: number;
  // Background extras
  backgroundGradient: string; vignetteStrength: number; vignetteColor: string;
  colorFilter: string; bgTransitionType: string;
  // Post-processing
  motionBlur: number; pixelate: number; scanlines: boolean; scanlineIntensity: number;
  filmGrain: number; chromaKey: string; chromaKeyThreshold: number;
  // Layers & sources
  effectLayers: EffectLayerState[];
  videoSources: VideoSourceState[];
}

const DEFAULT_LAYER: EffectLayerState = {
  type: "starfield", color: "200", opacity: 0.5, blendMode: "screen",
  intensity: 50, scale: 1, turbulence: 50, direction: 180, speed: 1,
  saturation: 100, brightness: 100, particleCount: 200, colorSecondary: "300",
  blur: 0, glow: 0, rotation: 0, mirror: false, invert: false,
  noiseAmount: 0, frequency: 1, amplitude: 50, phase: 0, decay: 0, colorMode: "solid",
};

const DEFAULT_SOURCE: VideoSourceState = {
  src: "", x: 0, y: 0, width: 100, height: 100,
  fit: "cover", opacity: 1, volume: 1, zIndex: 1,
  loop: true, muted: true, borderRadius: 0, rotation: 0,
  filter: "", startTime: 0, endTime: 0, playbackRate: 1,
  chromaKey: "", chromaKeyThreshold: 50, shadow: "",
  blendMode: "source-over",
  cropTop: 0, cropBottom: 0, cropLeft: 0, cropRight: 0,
};

const DEFAULT_SLIDE: SlideState = {
  src: "", loop: false, muted: true, volume: 1,
  transitionType: "fade", transitionDuration: 0.8, transitionEasing: "ease",
  bgType: "starfield", bgColor: "200", bgOpacity: 1, bgBlendMode: "screen",
  bgSpeed: 1, bgIntensity: 50, bgScale: 1, bgTurbulence: 50,
  bgDirection: 180, bgSaturation: 100, bgBrightness: 100,
  backgroundGradient: "", vignetteStrength: 0, vignetteColor: "0,0,0",
  colorFilter: "", bgTransitionType: "fade",
  motionBlur: 0, pixelate: 0, scanlines: false, scanlineIntensity: 30,
  filmGrain: 0, chromaKey: "", chromaKeyThreshold: 50,
  effectLayers: [],
  videoSources: [],
};

// ── Compact row ──
const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-center justify-between">
    <Label className="text-foreground/70 text-[10px]">{label}</Label>
    {children}
  </div>
);

const SliderRow = ({ label, value, min, max, step, onChange, unit = "" }: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; unit?: string;
}) => (
  <div className="space-y-0.5">
    <Label className="text-foreground/50 text-[10px]">{label}: {typeof value === "number" ? (step < 1 ? value.toFixed(1) : value) : value}{unit}</Label>
    <Slider value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)} />
  </div>
);

export const EffectBuilder = ({ onClose }: Props) => {
  const [state, setState] = useState<SlideState>(DEFAULT_SLIDE);
  const [copied, setCopied] = useState(false);
  const [expandedLayers, setExpandedLayers] = useState<Set<number>>(new Set());
  const [expandedSources, setExpandedSources] = useState<Set<number>>(new Set());
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const layerRef = useRef<BackgroundLayer | null>(null);
  const rafRef = useRef<number>(0);

  const set = useCallback(<K extends keyof SlideState>(key: K, val: SlideState[K]) => {
    setState(prev => ({ ...prev, [key]: val }));
  }, []);

  // Recreate layer when type/color changes
  useEffect(() => {
    const factory = backgroundRegistry[state.bgType];
    if (factory) layerRef.current = factory(400, 280, state.bgColor);
  }, [state.bgType, state.bgColor]);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = 400; canvas.height = 280;

    let running = true;
    const loop = (time: number) => {
      if (!running) return;
      ctx.clearRect(0, 0, 400, 280);
      ctx.fillStyle = "hsl(222.2, 84%, 4.9%)";
      ctx.fillRect(0, 0, 400, 280);

      if (layerRef.current) {
        ctx.globalAlpha = state.bgOpacity;
        ctx.globalCompositeOperation = state.bgBlendMode;
        const params: EffectParams = {
          intensity: state.bgIntensity, scale: state.bgScale,
          turbulence: state.bgTurbulence, direction: state.bgDirection,
        };
        layerRef.current.render(ctx, 400, 280, time * state.bgSpeed, params);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
      }

      // Vignette
      if (state.vignetteStrength > 0) {
        const vGrad = ctx.createRadialGradient(200, 140, 80, 200, 140, 220);
        vGrad.addColorStop(0, `rgba(${state.vignetteColor}, 0)`);
        vGrad.addColorStop(1, `rgba(${state.vignetteColor}, ${state.vignetteStrength / 100})`);
        ctx.fillStyle = vGrad;
        ctx.fillRect(0, 0, 400, 280);
      }

      // Scanlines
      if (state.scanlines) {
        ctx.fillStyle = `rgba(0,0,0,${state.scanlineIntensity / 400})`;
        for (let y = 0; y < 280; y += 4) ctx.fillRect(0, y, 400, 2);
      }

      canvas.style.filter = state.motionBlur > 0 ? `blur(${state.motionBlur}px)` : "";

      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { running = false; cancelAnimationFrame(rafRef.current); };
  }, [state]);

  // Layer helpers
  const addLayer = () => set("effectLayers", [...state.effectLayers, { ...DEFAULT_LAYER }]);
  const removeLayer = (idx: number) => set("effectLayers", state.effectLayers.filter((_, i) => i !== idx));
  const updateLayer = (idx: number, updates: Partial<EffectLayerState>) => {
    const newLayers = [...state.effectLayers];
    newLayers[idx] = { ...newLayers[idx], ...updates };
    set("effectLayers", newLayers);
  };
  const toggleLayer = (idx: number) => {
    const s = new Set(expandedLayers);
    s.has(idx) ? s.delete(idx) : s.add(idx);
    setExpandedLayers(s);
  };

  // Source helpers
  const addSource = () => set("videoSources", [...state.videoSources, { ...DEFAULT_SOURCE }]);
  const removeSource = (idx: number) => set("videoSources", state.videoSources.filter((_, i) => i !== idx));
  const updateSource = (idx: number, updates: Partial<VideoSourceState>) => {
    const newSources = [...state.videoSources];
    newSources[idx] = { ...newSources[idx], ...updates };
    set("videoSources", newSources);
  };
  const toggleSource = (idx: number) => {
    const s = new Set(expandedSources);
    s.has(idx) ? s.delete(idx) : s.add(idx);
    setExpandedSources(s);
  };

  const copyConfig = () => {
    const config = {
      src: state.src || "https://cdn.onslaught2342.qzz.io/assets/videos/pptx/1.webm",
      loop: state.loop, muted: state.muted, volume: state.volume,
      transition: { type: state.transitionType, duration: state.transitionDuration, easing: state.transitionEasing },
      sources: state.videoSources,
      background: {
        type: state.bgType, color: state.bgColor, opacity: state.bgOpacity,
        blendMode: state.bgBlendMode, saturation: state.bgSaturation,
        brightness: state.bgBrightness, speed: state.bgSpeed,
        intensity: state.bgIntensity, scale: state.bgScale,
        turbulence: state.bgTurbulence, direction: state.bgDirection,
        secondaryEffect: null, secondaryOpacity: 0.5, secondaryColor: "180",
        effectLayers: state.effectLayers,
        backgroundGradient: state.backgroundGradient,
        vignetteStrength: state.vignetteStrength,
        vignetteColor: state.vignetteColor,
        colorFilter: state.colorFilter,
        transitionType: state.bgTransitionType,
        chromaKey: state.chromaKey,
        chromaKeyThreshold: state.chromaKeyThreshold,
        motionBlur: state.motionBlur,
        pixelate: state.pixelate,
        scanlines: state.scanlines,
        scanlineIntensity: state.scanlineIntensity,
        filmGrain: state.filmGrain,
      },
    };
    navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-[400px] shrink-0 h-[calc(100vh-52px)] sticky top-[52px] border-l border-border/20 bg-background/95 backdrop-blur-xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/20">
        <h3 className="text-sm font-bold tracking-tight text-foreground/90">⚡ Slide Builder</h3>
        <button onClick={onClose} className="p-1 rounded hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Live Canvas */}
      <div className="px-3 pt-2">
        <div className="rounded-lg overflow-hidden border border-border/20 shadow-inner">
          <canvas ref={canvasRef} className="block w-full h-[160px]" style={{ imageRendering: "auto" }} />
        </div>
      </div>

      {/* All Controls */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <Accordion type="multiple" defaultValue={["primary"]} className="space-y-0">

          {/* ─── SLIDE ─── */}
          <AccordionItem value="slide" className="border-border/10">
            <AccordionTrigger className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground py-2">
              Slide Settings
            </AccordionTrigger>
            <AccordionContent className="space-y-2 pt-1 pb-3">
              <div className="space-y-0.5">
                <Label className="text-foreground/70 text-[10px]">Video URL</Label>
                <Input value={state.src} onChange={(e) => set("src", e.target.value)}
                  className="h-7 text-[10px] bg-background/50 border-border/20" placeholder="https://..." />
              </div>
              <Row label="Loop"><Switch checked={state.loop} onCheckedChange={(v) => set("loop", v)} /></Row>
              <Row label="Muted"><Switch checked={state.muted} onCheckedChange={(v) => set("muted", v)} /></Row>
              <SliderRow label="Volume" value={state.volume} min={0} max={1} step={0.05} onChange={(v) => set("volume", v)} />
            </AccordionContent>
          </AccordionItem>

          {/* ─── TRANSITION ─── */}
          <AccordionItem value="transition" className="border-border/10">
            <AccordionTrigger className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground py-2">
              Slide Transition
            </AccordionTrigger>
            <AccordionContent className="space-y-2 pt-1 pb-3">
              <Row label="Type">
                <Select value={state.transitionType} onValueChange={(v) => set("transitionType", v)}>
                  <SelectTrigger className="w-28 h-6 text-[10px] bg-background/50 border-border/20"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SLIDE_TRANSITION_TYPES.map(t => <SelectItem key={t} value={t} className="text-xs">{SLIDE_TRANSITION_NAMES[t]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Row>
              <SliderRow label="Duration" value={state.transitionDuration} min={0.1} max={3} step={0.1} onChange={(v) => set("transitionDuration", v)} unit="s" />
              <Row label="Easing">
                <Select value={state.transitionEasing} onValueChange={(v) => set("transitionEasing", v)}>
                  <SelectTrigger className="w-28 h-6 text-[10px] bg-background/50 border-border/20"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SLIDE_TRANSITION_EASINGS.map(e => <SelectItem key={e} value={e} className="text-xs">{e}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Row>
            </AccordionContent>
          </AccordionItem>

          {/* ─── PRIMARY EFFECT ─── */}
          <AccordionItem value="primary" className="border-border/10">
            <AccordionTrigger className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground py-2">
              Primary Effect
            </AccordionTrigger>
            <AccordionContent className="space-y-2 pt-1 pb-3">
              <div className="space-y-0.5">
                <Label className="text-foreground/70 text-[10px]">Effect</Label>
                <Select value={state.bgType} onValueChange={(v) => set("bgType", v)}>
                  <SelectTrigger className="h-7 text-[10px] bg-background/50 border-border/20"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {effectKeys.map(k => <SelectItem key={k} value={k} className="text-xs">{EFFECT_NAMES[k] || k}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-0.5">
                <Label className="text-foreground/70 text-[10px]">Hue: {state.bgColor}°</Label>
                <input type="range" min="0" max="360" value={parseInt(state.bgColor) || 0}
                  onChange={(e) => set("bgColor", e.target.value)}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style={{ background: "linear-gradient(to right, hsl(0,100%,50%), hsl(60,100%,50%), hsl(120,100%,50%), hsl(180,100%,50%), hsl(240,100%,50%), hsl(300,100%,50%), hsl(360,100%,50%))" }} />
              </div>
              <SliderRow label="Opacity" value={state.bgOpacity} min={0} max={1} step={0.05} onChange={(v) => set("bgOpacity", v)} />
              <SliderRow label="Speed" value={state.bgSpeed} min={0.1} max={3} step={0.1} onChange={(v) => set("bgSpeed", v)} unit="x" />
              <SliderRow label="Intensity" value={state.bgIntensity} min={0} max={100} step={1} onChange={(v) => set("bgIntensity", v)} />
              <SliderRow label="Scale" value={state.bgScale} min={0.1} max={3} step={0.1} onChange={(v) => set("bgScale", v)} unit="x" />
              <SliderRow label="Turbulence" value={state.bgTurbulence} min={0} max={100} step={1} onChange={(v) => set("bgTurbulence", v)} />
              <SliderRow label="Direction" value={state.bgDirection} min={0} max={360} step={1} onChange={(v) => set("bgDirection", v)} unit="°" />
              <SliderRow label="Saturation" value={state.bgSaturation} min={0} max={200} step={1} onChange={(v) => set("bgSaturation", v)} unit="%" />
              <SliderRow label="Brightness" value={state.bgBrightness} min={0} max={200} step={1} onChange={(v) => set("bgBrightness", v)} unit="%" />
              <Row label="Blend Mode">
                <Select value={state.bgBlendMode} onValueChange={(v) => set("bgBlendMode", v as GlobalCompositeOperation)}>
                  <SelectTrigger className="w-28 h-6 text-[10px] bg-background/50 border-border/20"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BLEND_MODES.map(m => <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Row>
            </AccordionContent>
          </AccordionItem>

          {/* ─── BACKGROUND EXTRAS ─── */}
          <AccordionItem value="bgextras" className="border-border/10">
            <AccordionTrigger className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground py-2">
              Background Settings
            </AccordionTrigger>
            <AccordionContent className="space-y-2 pt-1 pb-3">
              <div className="space-y-0.5">
                <Label className="text-foreground/70 text-[10px]">Gradient (CSS)</Label>
                <Input value={state.backgroundGradient} onChange={(e) => set("backgroundGradient", e.target.value)}
                  className="h-7 text-[10px] bg-background/50 border-border/20" placeholder="linear-gradient(135deg, #000, #333)" />
              </div>
              <SliderRow label="Vignette" value={state.vignetteStrength} min={0} max={100} step={1} onChange={(v) => set("vignetteStrength", v)} unit="%" />
              <div className="space-y-0.5">
                <Label className="text-foreground/70 text-[10px]">Vignette Color (r,g,b)</Label>
                <Input value={state.vignetteColor} onChange={(e) => set("vignetteColor", e.target.value)}
                  className="h-7 text-[10px] bg-background/50 border-border/20" placeholder="0,0,0" />
              </div>
              <div className="space-y-0.5">
                <Label className="text-foreground/70 text-[10px]">Color Filter (CSS)</Label>
                <Input value={state.colorFilter} onChange={(e) => set("colorFilter", e.target.value)}
                  className="h-7 text-[10px] bg-background/50 border-border/20" placeholder="hue-rotate(90deg)" />
              </div>
              <Row label="BG Transition">
                <Select value={state.bgTransitionType} onValueChange={(v) => set("bgTransitionType", v)}>
                  <SelectTrigger className="w-24 h-6 text-[10px] bg-background/50 border-border/20"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TRANSITION_TYPES_BG.map(t => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Row>
            </AccordionContent>
          </AccordionItem>

          {/* ─── POST-PROCESSING ─── */}
          <AccordionItem value="postfx" className="border-border/10">
            <AccordionTrigger className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground py-2">
              Post-Processing
            </AccordionTrigger>
            <AccordionContent className="space-y-2 pt-1 pb-3">
              <SliderRow label="Motion Blur" value={state.motionBlur} min={0} max={20} step={1} onChange={(v) => set("motionBlur", v)} unit="px" />
              <SliderRow label="Pixelate" value={state.pixelate} min={0} max={50} step={1} onChange={(v) => set("pixelate", v)} />
              <Row label="Scanlines"><Switch checked={state.scanlines} onCheckedChange={(v) => set("scanlines", v)} /></Row>
              {state.scanlines && (
                <SliderRow label="Scanline Intensity" value={state.scanlineIntensity} min={0} max={100} step={1} onChange={(v) => set("scanlineIntensity", v)} unit="%" />
              )}
              <SliderRow label="Film Grain" value={state.filmGrain} min={0} max={100} step={1} onChange={(v) => set("filmGrain", v)} unit="%" />
              <div className="space-y-0.5">
                <Label className="text-foreground/70 text-[10px]">Chroma Key</Label>
                <Input value={state.chromaKey} onChange={(e) => set("chromaKey", e.target.value)}
                  className="h-7 text-[10px] bg-background/50 border-border/20" placeholder="#00ff00" />
              </div>
              {state.chromaKey && (
                <SliderRow label="CK Threshold" value={state.chromaKeyThreshold} min={0} max={100} step={1} onChange={(v) => set("chromaKeyThreshold", v)} />
              )}
            </AccordionContent>
          </AccordionItem>

          {/* ─── EFFECT LAYERS ─── */}
          <AccordionItem value="layers" className="border-border/10">
            <AccordionTrigger className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground py-2">
              Effect Layers ({state.effectLayers.length})
            </AccordionTrigger>
            <AccordionContent className="space-y-2 pt-1 pb-3">
              {state.effectLayers.map((layer, idx) => (
                <div key={idx} className="border border-border/10 rounded-lg overflow-hidden">
                  <button onClick={() => toggleLayer(idx)}
                    className="w-full flex items-center justify-between px-2 py-1.5 text-[10px] text-foreground/70 hover:bg-accent/20">
                    <span className="flex items-center gap-1.5">
                      {expandedLayers.has(idx) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                      {EFFECT_NAMES[layer.type] || layer.type}
                    </span>
                    <button onClick={(e) => { e.stopPropagation(); removeLayer(idx); }}
                      className="p-0.5 hover:bg-destructive/20 rounded"><Trash2 className="w-3 h-3 text-destructive" /></button>
                  </button>
                  {expandedLayers.has(idx) && (
                    <div className="px-2 pb-2 space-y-2">
                      <div className="space-y-0.5">
                        <Label className="text-foreground/70 text-[10px]">Effect</Label>
                        <Select value={layer.type} onValueChange={(v) => updateLayer(idx, { type: v })}>
                          <SelectTrigger className="h-7 text-[10px] bg-background/50 border-border/20"><SelectValue /></SelectTrigger>
                          <SelectContent className="max-h-[250px]">
                            {effectKeys.map(k => <SelectItem key={k} value={k} className="text-xs">{EFFECT_NAMES[k] || k}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-0.5">
                        <Label className="text-foreground/70 text-[10px]">Hue: {layer.color}°</Label>
                        <input type="range" min="0" max="360" value={parseInt(layer.color) || 0}
                          onChange={(e) => updateLayer(idx, { color: e.target.value })}
                          className="w-full h-2 rounded-full appearance-none cursor-pointer"
                          style={{ background: "linear-gradient(to right, hsl(0,100%,50%), hsl(60,100%,50%), hsl(120,100%,50%), hsl(180,100%,50%), hsl(240,100%,50%), hsl(300,100%,50%), hsl(360,100%,50%))" }} />
                      </div>
                      <SliderRow label="Opacity" value={layer.opacity} min={0} max={1} step={0.05} onChange={(v) => updateLayer(idx, { opacity: v })} />
                      <SliderRow label="Speed" value={layer.speed} min={0.1} max={3} step={0.1} onChange={(v) => updateLayer(idx, { speed: v })} unit="x" />
                      <SliderRow label="Intensity" value={layer.intensity} min={0} max={100} step={1} onChange={(v) => updateLayer(idx, { intensity: v })} />
                      <SliderRow label="Scale" value={layer.scale} min={0.1} max={3} step={0.1} onChange={(v) => updateLayer(idx, { scale: v })} unit="x" />
                      <SliderRow label="Turbulence" value={layer.turbulence} min={0} max={100} step={1} onChange={(v) => updateLayer(idx, { turbulence: v })} />
                      <SliderRow label="Direction" value={layer.direction} min={0} max={360} step={1} onChange={(v) => updateLayer(idx, { direction: v })} unit="°" />
                      <SliderRow label="Saturation" value={layer.saturation} min={0} max={200} step={1} onChange={(v) => updateLayer(idx, { saturation: v })} unit="%" />
                      <SliderRow label="Brightness" value={layer.brightness} min={0} max={200} step={1} onChange={(v) => updateLayer(idx, { brightness: v })} unit="%" />
                      <Row label="Blend Mode">
                        <Select value={layer.blendMode} onValueChange={(v) => updateLayer(idx, { blendMode: v as GlobalCompositeOperation })}>
                          <SelectTrigger className="w-28 h-6 text-[10px] bg-background/50 border-border/20"><SelectValue /></SelectTrigger>
                          <SelectContent>{BLEND_MODES.map(m => <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>)}</SelectContent>
                        </Select>
                      </Row>

                      {/* Advanced */}
                      <div className="border-t border-border/10 pt-2 space-y-2">
                        <Label className="text-muted-foreground text-[9px] font-semibold uppercase tracking-wider">Advanced</Label>
                        <SliderRow label="Particles" value={layer.particleCount} min={10} max={2000} step={10} onChange={(v) => updateLayer(idx, { particleCount: v })} />
                        <div className="space-y-0.5">
                          <Label className="text-foreground/50 text-[10px]">Secondary Hue: {layer.colorSecondary}°</Label>
                          <input type="range" min="0" max="360" value={parseInt(layer.colorSecondary) || 0}
                            onChange={(e) => updateLayer(idx, { colorSecondary: e.target.value })}
                            className="w-full h-2 rounded-full appearance-none cursor-pointer"
                            style={{ background: "linear-gradient(to right, hsl(0,100%,50%), hsl(60,100%,50%), hsl(120,100%,50%), hsl(180,100%,50%), hsl(240,100%,50%), hsl(300,100%,50%), hsl(360,100%,50%))" }} />
                        </div>
                        <SliderRow label="Blur" value={layer.blur} min={0} max={20} step={0.5} onChange={(v) => updateLayer(idx, { blur: v })} unit="px" />
                        <SliderRow label="Glow" value={layer.glow} min={0} max={100} step={1} onChange={(v) => updateLayer(idx, { glow: v })} unit="%" />
                        <SliderRow label="Rotation" value={layer.rotation} min={0} max={360} step={1} onChange={(v) => updateLayer(idx, { rotation: v })} unit="°" />
                        <SliderRow label="Noise" value={layer.noiseAmount} min={0} max={100} step={1} onChange={(v) => updateLayer(idx, { noiseAmount: v })} unit="%" />
                        <Row label="Mirror"><Switch checked={layer.mirror} onCheckedChange={(v) => updateLayer(idx, { mirror: v })} /></Row>
                        <Row label="Invert"><Switch checked={layer.invert} onCheckedChange={(v) => updateLayer(idx, { invert: v })} /></Row>
                      </div>

                      {/* Wave */}
                      <div className="border-t border-border/10 pt-2 space-y-2">
                        <Label className="text-muted-foreground text-[9px] font-semibold uppercase tracking-wider">Wave</Label>
                        <SliderRow label="Frequency" value={layer.frequency} min={0.1} max={10} step={0.1} onChange={(v) => updateLayer(idx, { frequency: v })} />
                        <SliderRow label="Amplitude" value={layer.amplitude} min={0} max={100} step={1} onChange={(v) => updateLayer(idx, { amplitude: v })} />
                        <SliderRow label="Phase" value={layer.phase} min={0} max={360} step={1} onChange={(v) => updateLayer(idx, { phase: v })} unit="°" />
                        <SliderRow label="Decay" value={layer.decay} min={0} max={100} step={1} onChange={(v) => updateLayer(idx, { decay: v })} unit="%" />
                        <Row label="Color Mode">
                          <Select value={layer.colorMode} onValueChange={(v) => updateLayer(idx, { colorMode: v as EffectLayerState["colorMode"] })}>
                            <SelectTrigger className="w-28 h-6 text-[10px] bg-background/50 border-border/20"><SelectValue /></SelectTrigger>
                            <SelectContent>{COLOR_MODES.map(m => <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>)}</SelectContent>
                          </Select>
                        </Row>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addLayer}
                className="w-full h-7 text-[10px] bg-background/50 border-border/20">
                <Plus className="w-3 h-3 mr-1" /> Add Layer
              </Button>
            </AccordionContent>
          </AccordionItem>

          {/* ─── VIDEO SOURCES ─── */}
          <AccordionItem value="sources" className="border-border/10">
            <AccordionTrigger className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground py-2">
              Video Sources ({state.videoSources.length})
            </AccordionTrigger>
            <AccordionContent className="space-y-2 pt-1 pb-3">
              <p className="text-muted-foreground text-[9px]">Add multiple positioned videos per slide.</p>
              {state.videoSources.map((src, idx) => (
                <div key={idx} className="border border-border/10 rounded-lg overflow-hidden">
                  <button onClick={() => toggleSource(idx)}
                    className="w-full flex items-center justify-between px-2 py-1.5 text-[10px] text-foreground/70 hover:bg-accent/20">
                    <span className="flex items-center gap-1.5">
                      {expandedSources.has(idx) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                      Source {idx + 1}
                    </span>
                    <button onClick={(e) => { e.stopPropagation(); removeSource(idx); }}
                      className="p-0.5 hover:bg-destructive/20 rounded"><Trash2 className="w-3 h-3 text-destructive" /></button>
                  </button>
                  {expandedSources.has(idx) && (
                    <div className="px-2 pb-2 space-y-2">
                      <div className="space-y-0.5">
                        <Label className="text-foreground/70 text-[10px]">URL</Label>
                        <Input value={src.src} onChange={(e) => updateSource(idx, { src: e.target.value })}
                          className="h-7 text-[10px] bg-background/50 border-border/20" placeholder="https://..." />
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <SliderRow label="X" value={src.x} min={0} max={100} step={1} onChange={(v) => updateSource(idx, { x: v })} unit="%" />
                        <SliderRow label="Y" value={src.y} min={0} max={100} step={1} onChange={(v) => updateSource(idx, { y: v })} unit="%" />
                        <SliderRow label="W" value={src.width} min={1} max={100} step={1} onChange={(v) => updateSource(idx, { width: v })} unit="%" />
                        <SliderRow label="H" value={src.height} min={1} max={100} step={1} onChange={(v) => updateSource(idx, { height: v })} unit="%" />
                      </div>
                      <SliderRow label="Opacity" value={src.opacity} min={0} max={1} step={0.05} onChange={(v) => updateSource(idx, { opacity: v })} />
                      <SliderRow label="Volume" value={src.volume} min={0} max={1} step={0.05} onChange={(v) => updateSource(idx, { volume: v })} />
                      <Row label="Fit">
                        <Select value={src.fit} onValueChange={(v) => updateSource(idx, { fit: v as "contain" | "cover" })}>
                          <SelectTrigger className="w-24 h-6 text-[10px] bg-background/50 border-border/20"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="contain" className="text-xs">Contain</SelectItem>
                            <SelectItem value="cover" className="text-xs">Cover</SelectItem>
                          </SelectContent>
                        </Select>
                      </Row>
                      <Row label="Blend Mode">
                        <Select value={src.blendMode} onValueChange={(v) => updateSource(idx, { blendMode: v as GlobalCompositeOperation })}>
                          <SelectTrigger className="w-28 h-6 text-[10px] bg-background/50 border-border/20"><SelectValue /></SelectTrigger>
                          <SelectContent>{BLEND_MODES.map(m => <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>)}</SelectContent>
                        </Select>
                      </Row>
                      <Row label="Loop"><Switch checked={src.loop} onCheckedChange={(v) => updateSource(idx, { loop: v })} /></Row>
                      <Row label="Muted"><Switch checked={src.muted} onCheckedChange={(v) => updateSource(idx, { muted: v })} /></Row>

                      {/* Transform */}
                      <div className="border-t border-border/10 pt-2 space-y-2">
                        <Label className="text-muted-foreground text-[9px] font-semibold uppercase tracking-wider">Transform</Label>
                        <SliderRow label="Border Radius" value={src.borderRadius} min={0} max={50} step={1} onChange={(v) => updateSource(idx, { borderRadius: v })} unit="%" />
                        <SliderRow label="Rotation" value={src.rotation} min={0} max={360} step={1} onChange={(v) => updateSource(idx, { rotation: v })} unit="°" />
                        <SliderRow label="Playback Rate" value={src.playbackRate} min={0.1} max={4} step={0.1} onChange={(v) => updateSource(idx, { playbackRate: v })} unit="x" />
                        <div className="grid grid-cols-2 gap-1.5">
                          <SliderRow label="Start" value={src.startTime} min={0} max={300} step={0.5} onChange={(v) => updateSource(idx, { startTime: v })} unit="s" />
                          <SliderRow label="End" value={src.endTime} min={0} max={300} step={0.5} onChange={(v) => updateSource(idx, { endTime: v })} unit="s" />
                        </div>
                        <div className="space-y-0.5">
                          <Label className="text-foreground/70 text-[10px]">CSS Filter</Label>
                          <Input value={src.filter} onChange={(e) => updateSource(idx, { filter: e.target.value })}
                            className="h-7 text-[10px] bg-background/50 border-border/20" placeholder="brightness(1.2)" />
                        </div>
                        <div className="space-y-0.5">
                          <Label className="text-foreground/70 text-[10px]">Shadow</Label>
                          <Input value={src.shadow} onChange={(e) => updateSource(idx, { shadow: e.target.value })}
                            className="h-7 text-[10px] bg-background/50 border-border/20" placeholder="0 4px 20px rgba(0,0,0,0.5)" />
                        </div>
                      </div>

                      {/* Crop */}
                      <div className="border-t border-border/10 pt-2 space-y-2">
                        <Label className="text-muted-foreground text-[9px] font-semibold uppercase tracking-wider">Crop</Label>
                        <div className="grid grid-cols-2 gap-1.5">
                          <SliderRow label="Top" value={src.cropTop} min={0} max={50} step={1} onChange={(v) => updateSource(idx, { cropTop: v })} unit="%" />
                          <SliderRow label="Bottom" value={src.cropBottom} min={0} max={50} step={1} onChange={(v) => updateSource(idx, { cropBottom: v })} unit="%" />
                          <SliderRow label="Left" value={src.cropLeft} min={0} max={50} step={1} onChange={(v) => updateSource(idx, { cropLeft: v })} unit="%" />
                          <SliderRow label="Right" value={src.cropRight} min={0} max={50} step={1} onChange={(v) => updateSource(idx, { cropRight: v })} unit="%" />
                        </div>
                      </div>

                      {/* Chroma Key */}
                      <div className="border-t border-border/10 pt-2 space-y-2">
                        <div className="space-y-0.5">
                          <Label className="text-foreground/70 text-[10px]">Chroma Key</Label>
                          <Input value={src.chromaKey} onChange={(e) => updateSource(idx, { chromaKey: e.target.value })}
                            className="h-7 text-[10px] bg-background/50 border-border/20" placeholder="#00ff00" />
                        </div>
                        {src.chromaKey && (
                          <SliderRow label="CK Threshold" value={src.chromaKeyThreshold} min={0} max={100} step={1} onChange={(v) => updateSource(idx, { chromaKeyThreshold: v })} />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addSource}
                className="w-full h-7 text-[10px] bg-background/50 border-border/20">
                <Plus className="w-3 h-3 mr-1" /> Add Video Source
              </Button>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* Copy Button */}
      <div className="px-3 py-2.5 border-t border-border/20">
        <button
          onClick={copyConfig}
          className="w-full flex items-center justify-center gap-2 h-8 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copied!" : "Copy Full Slide Config"}
        </button>
        <p className="text-[9px] text-muted-foreground text-center mt-1 font-mono">
          Paste into video.playlist[] in config.ts
        </p>
      </div>
    </div>
  );
};
