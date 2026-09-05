import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { CONFIG, type EngineConfig, type VideoItem, type SlideBackground, type SlideTransition, type TransitionType, type TransitionEasing, type VideoSource, type EffectLayer, type BackgroundConfig } from "@/engine/config";
import { backgroundRegistry } from "@/engine/backgrounds/registry";
import { EFFECT_NAMES } from "@/engine/effectNames";
import { builderStore } from "@/lib/builderStore";
import { FIELD_HELP } from "@/lib/fieldHelp";
import { MiniStage } from "@/components/builder/MiniStage";
import { ImpactPeek, ImpactPreview, type ImpactVariant } from "@/components/builder/ImpactPreview";
import { HelpDot } from "@/components/builder/HelpDot";
import { BuilderAmbient } from "@/components/builder/BuilderAmbient";
import { impactBus, type ImpactState } from "@/lib/impactBus";

const EFFECT_KEYS = Object.keys(backgroundRegistry);
const TRANSITION_TYPES: TransitionType[] = [
  "fade","wipeLeft","wipeRight","wipeUp","wipeDown",
  "slideLeft","slideRight","slideUp","slideDown",
  "zoomIn","zoomOut","zoomRotate",
  "flipX","flipY","blur","dissolve","iris",
  "swirl","curtain","glitch",
  "splitHorizontal","splitVertical","rotate","bounce","morph",
  "pixelate","blinds","diamond","crossZoom","doorway",
];
const EASINGS: TransitionEasing[] = ["linear","ease","ease-in","ease-out","ease-in-out"];
const BLEND_MODES: GlobalCompositeOperation[] = [
  "source-over","multiply","screen","overlay","darken","lighten","color-dodge","color-burn",
  "hard-light","soft-light","difference","exclusion","hue","saturation","color","luminosity",
];
const COLOR_MODES = ["solid","gradient","rainbow","temperature"] as const;
const ADVANCE_MODES = ["inherit","on","off"] as const;

const emptyConfig = (): EngineConfig => structuredClone(CONFIG);
const emptySlide = (): VideoItem => ({
  src: "",
  loop: false,
  muted: true,
  transition: structuredClone(CONFIG.defaults.defaultTransition),
  sources: [],
  background: structuredClone(CONFIG.defaults.background),
  autoAdvance: "inherit",
});
const emptySource = (): VideoSource => structuredClone(CONFIG.defaults.videoSource);
const emptyLayer = (): EffectLayer => structuredClone(CONFIG.defaults.effectLayer);

// ── Shared style helpers ───────────────────────────────────
const btn = "h-7 px-3 inline-flex items-center justify-center text-[11px] font-mono uppercase tracking-wider rounded border border-white/15 hover:border-white/40 hover:bg-white/5 text-white/80 transition";
const btnPrimary = "h-7 px-3 inline-flex items-center justify-center text-[11px] font-mono uppercase tracking-wider rounded border border-white/60 bg-white/15 hover:bg-white/20 text-white transition";
const btnGhost = "h-6 px-2 text-[10px] font-mono uppercase tracking-wider rounded text-white/50 hover:text-white hover:bg-white/5 transition";
const inputCls = "w-full bg-white/5 border border-white/10 rounded px-2.5 py-1 text-xs font-mono text-white/90 placeholder:text-white/25 outline-none focus:border-white/40 focus:bg-white/[0.07] transition-colors";

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/40 mb-2 mt-5 first:mt-0">{children}</div>
);

// HelpDot is imported from ./components/builder/HelpDot

// ── Row with help + on-demand impact peek ──────────────
interface ImpactSpec {
  slide: VideoItem;
  path: string;
  variant: ImpactVariant;
  current: unknown;
  transitionDuration: number;
}
interface RowProps {
  label: string;
  help?: string;
  impact?: ImpactSpec;
  children: React.ReactNode;
}
const Row = memo(function Row({ label, help, impact, children }: RowProps) {
  return (
    <div className="py-1.5 border-b border-white/[0.04] last:border-b-0">
      <div className="grid grid-cols-[8.5rem_1fr] gap-3 items-center">
        <label className="text-[10px] font-mono uppercase tracking-wider text-white/45 truncate flex items-center">
          <span className="truncate">{label}</span>
          <HelpDot text={help} />
          {impact && (
            <ImpactPeek
              slide={impact.slide}
              path={impact.path}
              variant={impact.variant}
              current={impact.current}
              transitionDuration={impact.transitionDuration}
              label={label}
            />
          )}
        </label>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
});

// ── Reusable input components ───────────────────────────
const TextField = ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) => (
  <input type="text" value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={inputCls} />
);
const NumField = ({ value, onChange, step = 1, min, max }: { value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number }) => (
  <input type="number" value={Number.isFinite(value) ? value : 0} step={step} min={min} max={max}
    onChange={(e) => { const n = parseFloat(e.target.value); onChange(Number.isFinite(n) ? n : 0); }}
    className={inputCls} />
);
const BoolField = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
  <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} className="accent-white/80 h-4 w-4" />
);
const SelectField = <T extends string,>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: readonly T[] }) => (
  <select value={value} onChange={(e) => onChange(e.target.value as T)} className={inputCls}>
    {options.map((o) => <option key={o} value={o} className="bg-zinc-900">{o || "(none)"}</option>)}
  </select>
);

// ── Card wrapper for list items (sources, layers) ──────
const Card = ({ title, onUp, onDown, onDup, onDel, children, idx }: {
  title: string; idx: number; onUp: () => void; onDown: () => void; onDup: () => void; onDel: () => void; children: React.ReactNode;
}) => (
  <div className="border border-white/10 rounded-md mb-3 bg-white/[0.02]">
    <div className="flex items-center gap-1 px-3 py-1.5 border-b border-white/10">
      <span className="text-[10px] font-mono text-white/40 w-5">{String(idx + 1).padStart(2, "0")}</span>
      <span className="text-[11px] font-mono text-white/80 flex-1 truncate">{title}</span>
      <button className={btnGhost} onClick={onUp}>↑</button>
      <button className={btnGhost} onClick={onDown}>↓</button>
      <button className={btnGhost} onClick={onDup}>dup</button>
      <button className={btnGhost + " hover:!text-red-400"} onClick={onDel}>del</button>
    </div>
    <div className="px-3 py-2">{children}</div>
  </div>
);

// ── Background editor ──────────────────────────────────
const BackgroundEditor = memo(function BackgroundEditor({ bg, slide, transitionDuration, onChange }: {
  bg: SlideBackground; slide: VideoItem; transitionDuration: number; onChange: (b: SlideBackground) => void;
}) {
  const set = <K extends keyof SlideBackground,>(k: K, v: SlideBackground[K]) => onChange({ ...bg, [k]: v });
  const ip = (path: string, variant: ImpactVariant, current: unknown): ImpactSpec =>
    ({ slide, path, variant, current, transitionDuration });

  const setLayers = (layers: EffectLayer[]) => set("effectLayers", layers);
  const addLayer = () => setLayers([...(bg.effectLayers ?? []), emptyLayer()]);
  const updLayer = (i: number, l: EffectLayer) => setLayers(bg.effectLayers.map((x, j) => j === i ? l : x));
  const delLayer = (i: number) => setLayers(bg.effectLayers.filter((_, j) => j !== i));
  const dupLayer = (i: number) => { const next = [...bg.effectLayers]; next.splice(i + 1, 0, structuredClone(next[i])); setLayers(next); };
  const moveLayer = (i: number, d: -1 | 1) => {
    const next = [...bg.effectLayers]; const j = i + d; if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]]; setLayers(next);
  };

  return (
    <div>
      <SectionLabel>Effect</SectionLabel>
      <Row label="Effect" help={FIELD_HELP["bg.type"]}>
        <SelectField value={bg.type} onChange={(v) => set("type", v)} options={EFFECT_KEYS as readonly string[]} />
      </Row>
      <Row label="Color (hue)" help={FIELD_HELP["bg.color"]}><TextField value={bg.color} onChange={(v) => set("color", v)} /></Row>
      <Row label="Opacity" help={FIELD_HELP["bg.opacity"]} impact={ip("background.opacity", { kind: "range01" }, bg.opacity)}>
        <NumField value={bg.opacity} step={0.05} min={0} max={1} onChange={(v) => set("opacity", v)} />
      </Row>
      <Row label="Blend" help={FIELD_HELP["bg.blendMode"]}><SelectField value={bg.blendMode} onChange={(v) => set("blendMode", v)} options={BLEND_MODES} /></Row>
      <Row label="Saturation" help={FIELD_HELP["bg.saturation"]} impact={ip("background.saturation", { kind: "range100" }, bg.saturation)}>
        <NumField value={bg.saturation} onChange={(v) => set("saturation", v)} />
      </Row>
      <Row label="Brightness" help={FIELD_HELP["bg.brightness"]} impact={ip("background.brightness", { kind: "range100" }, bg.brightness)}>
        <NumField value={bg.brightness} onChange={(v) => set("brightness", v)} />
      </Row>
      <Row label="Speed" help={FIELD_HELP["bg.speed"]} impact={ip("background.speed", { kind: "scalar" }, bg.speed)}>
        <NumField value={bg.speed} step={0.1} onChange={(v) => set("speed", v)} />
      </Row>
      <Row label="Intensity" help={FIELD_HELP["bg.intensity"]} impact={ip("background.intensity", { kind: "range100" }, bg.intensity)}>
        <NumField value={bg.intensity} onChange={(v) => set("intensity", v)} />
      </Row>
      <Row label="Scale" help={FIELD_HELP["bg.scale"]} impact={ip("background.scale", { kind: "scalar" }, bg.scale)}>
        <NumField value={bg.scale} step={0.1} onChange={(v) => set("scale", v)} />
      </Row>
      <Row label="Turbulence" help={FIELD_HELP["bg.turbulence"]} impact={ip("background.turbulence", { kind: "range100" }, bg.turbulence)}>
        <NumField value={bg.turbulence} onChange={(v) => set("turbulence", v)} />
      </Row>
      <Row label="Direction" help={FIELD_HELP["bg.direction"]} impact={ip("background.direction", { kind: "range360" }, bg.direction)}>
        <NumField value={bg.direction} onChange={(v) => set("direction", v)} />
      </Row>

      <SectionLabel>Filters &amp; overlays</SectionLabel>
      <Row label="Bg gradient" help={FIELD_HELP["bg.backgroundGradient"]}>
        <TextField value={bg.backgroundGradient} onChange={(v) => set("backgroundGradient", v)} placeholder="linear-gradient(...)" />
      </Row>
      <Row label="Vignette" help={FIELD_HELP["bg.vignetteStrength"]} impact={ip("background.vignetteStrength", { kind: "range01" }, bg.vignetteStrength)}>
        <NumField value={bg.vignetteStrength} step={0.05} min={0} max={1} onChange={(v) => set("vignetteStrength", v)} />
      </Row>
      <Row label="Vignette color" help={FIELD_HELP["bg.vignetteColor"]}><TextField value={bg.vignetteColor} onChange={(v) => set("vignetteColor", v)} /></Row>
      <Row label="Color filter" help={FIELD_HELP["bg.colorFilter"]}><TextField value={bg.colorFilter} onChange={(v) => set("colorFilter", v)} placeholder="hue-rotate(45deg)" /></Row>
      <Row label="Motion blur" help={FIELD_HELP["bg.motionBlur"]} impact={ip("background.motionBlur", { kind: "scalar" }, bg.motionBlur || 1)}>
        <NumField value={bg.motionBlur} onChange={(v) => set("motionBlur", v)} />
      </Row>
      <Row label="Pixelate" help={FIELD_HELP["bg.pixelate"]} impact={ip("background.pixelate", { kind: "scalar" }, bg.pixelate || 4)}>
        <NumField value={bg.pixelate} onChange={(v) => set("pixelate", v)} />
      </Row>
      <Row label="Scanlines" help={FIELD_HELP["bg.scanlines"]} impact={ip("background.scanlines", { kind: "bool" }, bg.scanlines)}>
        <BoolField value={bg.scanlines} onChange={(v) => set("scanlines", v)} />
      </Row>
      <Row label="Scanline ↕" help={FIELD_HELP["bg.scanlineIntensity"]}><NumField value={bg.scanlineIntensity} onChange={(v) => set("scanlineIntensity", v)} /></Row>
      <Row label="Film grain" help={FIELD_HELP["bg.filmGrain"]} impact={ip("background.filmGrain", { kind: "range100" }, bg.filmGrain)}>
        <NumField value={bg.filmGrain} onChange={(v) => set("filmGrain", v)} />
      </Row>
      <Row label="Chroma key" help={FIELD_HELP["bg.chromaKey"]}><TextField value={bg.chromaKey} onChange={(v) => set("chromaKey", v)} /></Row>
      <Row label="Chroma thr." help={FIELD_HELP["bg.chromaKeyThreshold"]}><NumField value={bg.chromaKeyThreshold} onChange={(v) => set("chromaKeyThreshold", v)} /></Row>

      <SectionLabel>Secondary layer (legacy)</SectionLabel>
      <Row label="2nd effect" help={FIELD_HELP["bg.secondaryEffect"]}>
        <SelectField value={bg.secondaryEffect ?? ""} onChange={(v) => set("secondaryEffect", v || null)} options={["", ...EFFECT_KEYS] as readonly string[]} />
      </Row>
      <Row label="2nd opacity" help={FIELD_HELP["bg.secondaryOpacity"]} impact={ip("background.secondaryOpacity", { kind: "range01" }, bg.secondaryOpacity)}>
        <NumField value={bg.secondaryOpacity} step={0.05} min={0} max={1} onChange={(v) => set("secondaryOpacity", v)} />
      </Row>
      <Row label="2nd color" help={FIELD_HELP["bg.secondaryColor"]}><TextField value={bg.secondaryColor} onChange={(v) => set("secondaryColor", v)} /></Row>

      <SectionLabel>Effect layers ({bg.effectLayers?.length ?? 0})</SectionLabel>
      <p className="text-[10px] font-mono text-white/40 mb-2 leading-relaxed">
        Stack multiple procedural effects on top of the base effect. Each layer has its own color, blend, and motion.
      </p>
      {(bg.effectLayers ?? []).map((layer, i) => (
        <Card key={i} idx={i}
          title={`${EFFECT_NAMES[layer.type] ?? layer.type} · ${layer.blendMode}`}
          onUp={() => moveLayer(i, -1)} onDown={() => moveLayer(i, 1)} onDup={() => dupLayer(i)} onDel={() => delLayer(i)}>
          <EffectLayerEditor layer={layer} slide={slide} layerIndex={i} transitionDuration={transitionDuration} onChange={(l) => updLayer(i, l)} />
        </Card>
      ))}
      <button className={btn} onClick={addLayer}>+ Add effect layer</button>
    </div>
  );
});

// ── Effect layer editor ────────────────────────────────
const EffectLayerEditor = memo(function EffectLayerEditor({ layer, slide, layerIndex, transitionDuration, onChange }: {
  layer: EffectLayer; slide: VideoItem; layerIndex: number; transitionDuration: number; onChange: (l: EffectLayer) => void;
}) {
  const set = <K extends keyof EffectLayer,>(k: K, v: EffectLayer[K]) => onChange({ ...layer, [k]: v });
  const ip = (field: keyof EffectLayer, variant: ImpactVariant, current: unknown): ImpactSpec =>
    ({ slide, path: `background.effectLayers.${layerIndex}.${String(field)}`, variant, current, transitionDuration });
  return (
    <div>
      <Row label="Effect" help={FIELD_HELP["layer.type"]}><SelectField value={layer.type} onChange={(v) => set("type", v)} options={EFFECT_KEYS as readonly string[]} /></Row>
      <Row label="Opacity" help={FIELD_HELP["layer.opacity"]} impact={ip("opacity", { kind: "range01" }, layer.opacity)}><NumField value={layer.opacity} step={0.05} min={0} max={1} onChange={(v) => set("opacity", v)} /></Row>
      <Row label="Blend" help={FIELD_HELP["layer.blendMode"]}><SelectField value={layer.blendMode} onChange={(v) => set("blendMode", v)} options={BLEND_MODES} /></Row>
      <Row label="Color (hue)" help={FIELD_HELP["layer.color"]}><TextField value={layer.color} onChange={(v) => set("color", v)} /></Row>
      <Row label="Color 2" help={FIELD_HELP["layer.colorSecondary"]}><TextField value={layer.colorSecondary} onChange={(v) => set("colorSecondary", v)} /></Row>
      <Row label="Color mode" help={FIELD_HELP["layer.colorMode"]}><SelectField value={layer.colorMode} onChange={(v) => set("colorMode", v)} options={COLOR_MODES} /></Row>
      <Row label="Intensity" help={FIELD_HELP["layer.intensity"]} impact={ip("intensity", { kind: "range100" }, layer.intensity)}><NumField value={layer.intensity} onChange={(v) => set("intensity", v)} /></Row>
      <Row label="Scale" help={FIELD_HELP["layer.scale"]} impact={ip("scale", { kind: "scalar" }, layer.scale)}><NumField value={layer.scale} step={0.1} onChange={(v) => set("scale", v)} /></Row>
      <Row label="Speed" help={FIELD_HELP["layer.speed"]} impact={ip("speed", { kind: "scalar" }, layer.speed)}><NumField value={layer.speed} step={0.1} onChange={(v) => set("speed", v)} /></Row>
      <Row label="Turbulence" help={FIELD_HELP["layer.turbulence"]} impact={ip("turbulence", { kind: "range100" }, layer.turbulence)}><NumField value={layer.turbulence} onChange={(v) => set("turbulence", v)} /></Row>
      <Row label="Direction" help={FIELD_HELP["layer.direction"]} impact={ip("direction", { kind: "range360" }, layer.direction)}><NumField value={layer.direction} onChange={(v) => set("direction", v)} /></Row>
      <Row label="Saturation" help={FIELD_HELP["layer.saturation"]} impact={ip("saturation", { kind: "range100" }, layer.saturation)}><NumField value={layer.saturation} onChange={(v) => set("saturation", v)} /></Row>
      <Row label="Brightness" help={FIELD_HELP["layer.brightness"]} impact={ip("brightness", { kind: "range100" }, layer.brightness)}><NumField value={layer.brightness} onChange={(v) => set("brightness", v)} /></Row>
      <Row label="Particles" help={FIELD_HELP["layer.particleCount"]} impact={ip("particleCount", { kind: "scalar" }, layer.particleCount)}><NumField value={layer.particleCount} onChange={(v) => set("particleCount", v)} /></Row>
      <Row label="Blur" help={FIELD_HELP["layer.blur"]} impact={ip("blur", { kind: "scalar" }, layer.blur || 1)}><NumField value={layer.blur} onChange={(v) => set("blur", v)} /></Row>
      <Row label="Glow" help={FIELD_HELP["layer.glow"]} impact={ip("glow", { kind: "range100" }, layer.glow)}><NumField value={layer.glow} onChange={(v) => set("glow", v)} /></Row>
      <Row label="Rotation" help={FIELD_HELP["layer.rotation"]} impact={ip("rotation", { kind: "range360" }, layer.rotation)}><NumField value={layer.rotation} onChange={(v) => set("rotation", v)} /></Row>
      <Row label="Mirror" help={FIELD_HELP["layer.mirror"]} impact={ip("mirror", { kind: "bool" }, layer.mirror)}><BoolField value={layer.mirror} onChange={(v) => set("mirror", v)} /></Row>
      <Row label="Invert" help={FIELD_HELP["layer.invert"]} impact={ip("invert", { kind: "bool" }, layer.invert)}><BoolField value={layer.invert} onChange={(v) => set("invert", v)} /></Row>
      <Row label="Noise" help={FIELD_HELP["layer.noiseAmount"]} impact={ip("noiseAmount", { kind: "range100" }, layer.noiseAmount)}><NumField value={layer.noiseAmount} onChange={(v) => set("noiseAmount", v)} /></Row>
      <Row label="Frequency" help={FIELD_HELP["layer.frequency"]} impact={ip("frequency", { kind: "scalar" }, layer.frequency)}><NumField value={layer.frequency} step={0.1} onChange={(v) => set("frequency", v)} /></Row>
      <Row label="Amplitude" help={FIELD_HELP["layer.amplitude"]} impact={ip("amplitude", { kind: "range100" }, layer.amplitude)}><NumField value={layer.amplitude} onChange={(v) => set("amplitude", v)} /></Row>
      <Row label="Phase" help={FIELD_HELP["layer.phase"]} impact={ip("phase", { kind: "range360" }, layer.phase)}><NumField value={layer.phase} onChange={(v) => set("phase", v)} /></Row>
      <Row label="Decay" help={FIELD_HELP["layer.decay"]} impact={ip("decay", { kind: "range100" }, layer.decay)}><NumField value={layer.decay} onChange={(v) => set("decay", v)} /></Row>
    </div>
  );
});

// ── Video source editor (one per source) ───────────────
const VideoSourceEditor = memo(function VideoSourceEditor({ src, slide, idx, transitionDuration, onChange }: {
  src: VideoSource; slide: VideoItem; idx: number; transitionDuration: number; onChange: (s: VideoSource) => void;
}) {
  const set = <K extends keyof VideoSource,>(k: K, v: VideoSource[K]) => onChange({ ...src, [k]: v });
  const ip = (field: keyof VideoSource, variant: ImpactVariant, current: unknown): ImpactSpec =>
    ({ slide, path: `sources.${idx}.${String(field)}`, variant, current, transitionDuration });
  return (
    <div>
      <Row label="Video URL" help={FIELD_HELP["src.src"]}><TextField value={src.src} onChange={(v) => set("src", v)} placeholder="https://…" /></Row>
      <Row label="X (%)" help={FIELD_HELP["src.x"]} impact={ip("x", { kind: "range100" }, src.x)}><NumField value={src.x} onChange={(v) => set("x", v)} /></Row>
      <Row label="Y (%)" help={FIELD_HELP["src.y"]} impact={ip("y", { kind: "range100" }, src.y)}><NumField value={src.y} onChange={(v) => set("y", v)} /></Row>
      <Row label="Width (%)" help={FIELD_HELP["src.width"]} impact={ip("width", { kind: "range100" }, src.width)}><NumField value={src.width} onChange={(v) => set("width", v)} /></Row>
      <Row label="Height (%)" help={FIELD_HELP["src.height"]} impact={ip("height", { kind: "range100" }, src.height)}><NumField value={src.height} onChange={(v) => set("height", v)} /></Row>
      <Row label="Fit" help={FIELD_HELP["src.fit"]} impact={ip("fit", { kind: "select", a: "contain", b: "cover" }, src.fit)}><SelectField value={src.fit} onChange={(v) => set("fit", v)} options={["contain","cover"] as const} /></Row>
      <Row label="Opacity" help={FIELD_HELP["src.opacity"]} impact={ip("opacity", { kind: "range01" }, src.opacity)}>
        <NumField value={src.opacity} step={0.05} min={0} max={1} onChange={(v) => set("opacity", v)} />
      </Row>
      <Row label="Z-index" help={FIELD_HELP["src.zIndex"]}><NumField value={src.zIndex} onChange={(v) => set("zIndex", v)} /></Row>
      <Row label="Loop" help={FIELD_HELP["src.loop"]}><BoolField value={src.loop} onChange={(v) => set("loop", v)} /></Row>
      <Row label="Muted" help={FIELD_HELP["src.muted"]}><BoolField value={src.muted} onChange={(v) => set("muted", v)} /></Row>
      <Row label="Volume" help={FIELD_HELP["src.volume"]}><NumField value={src.volume ?? 1} step={0.05} min={0} max={1} onChange={(v) => set("volume", v)} /></Row>
      <Row label="Border radius" help={FIELD_HELP["src.borderRadius"]} impact={ip("borderRadius", { kind: "scalar" }, src.borderRadius || 8)}><NumField value={src.borderRadius} onChange={(v) => set("borderRadius", v)} /></Row>
      <Row label="Rotation" help={FIELD_HELP["src.rotation"]} impact={ip("rotation", { kind: "range360" }, src.rotation)}>
        <NumField value={src.rotation} onChange={(v) => set("rotation", v)} />
      </Row>
      <Row label="Filter" help={FIELD_HELP["src.filter"]} impact={ip("filter", { kind: "select", a: "", b: src.filter || "blur(4px)", labelA: "Off", labelB: "On" }, src.filter)}><TextField value={src.filter} onChange={(v) => set("filter", v)} placeholder="blur(2px) brightness(1.2)" /></Row>
      <Row label="Blend" help={FIELD_HELP["src.blendMode"]} impact={ip("blendMode", { kind: "select", a: "source-over", b: src.blendMode === "source-over" ? "screen" : src.blendMode, labelA: "normal", labelB: "blend" }, src.blendMode)}><SelectField value={src.blendMode} onChange={(v) => set("blendMode", v)} options={BLEND_MODES} /></Row>
      <Row label="Start time (s)" help={FIELD_HELP["src.startTime"]}><NumField value={src.startTime} step={0.1} onChange={(v) => set("startTime", v)} /></Row>
      <Row label="End time (s)" help={FIELD_HELP["src.endTime"]}><NumField value={src.endTime} step={0.1} onChange={(v) => set("endTime", v)} /></Row>
      <Row label="Playback rate" help={FIELD_HELP["src.playbackRate"]} impact={ip("playbackRate", { kind: "scalar" }, src.playbackRate)}><NumField value={src.playbackRate} step={0.1} onChange={(v) => set("playbackRate", v)} /></Row>
      <Row label="Chroma key" help={FIELD_HELP["src.chromaKey"]}><TextField value={src.chromaKey} onChange={(v) => set("chromaKey", v)} /></Row>
      <Row label="Chroma thr." help={FIELD_HELP["src.chromaKeyThreshold"]}><NumField value={src.chromaKeyThreshold} onChange={(v) => set("chromaKeyThreshold", v)} /></Row>
      <Row label="Shadow" help={FIELD_HELP["src.shadow"]}><TextField value={src.shadow} onChange={(v) => set("shadow", v)} placeholder="0 0 20px rgba(0,0,0,0.5)" /></Row>
      <Row label="Crop top" help={FIELD_HELP["src.cropTop"]}><NumField value={src.cropTop} onChange={(v) => set("cropTop", v)} /></Row>
      <Row label="Crop bottom" help={FIELD_HELP["src.cropBottom"]}><NumField value={src.cropBottom} onChange={(v) => set("cropBottom", v)} /></Row>
      <Row label="Crop left" help={FIELD_HELP["src.cropLeft"]}><NumField value={src.cropLeft} onChange={(v) => set("cropLeft", v)} /></Row>
      <Row label="Crop right" help={FIELD_HELP["src.cropRight"]}><NumField value={src.cropRight} onChange={(v) => set("cropRight", v)} /></Row>
    </div>
  );
});

// ── Transition editor ──────────────────────────────────
const TransitionEditor = memo(function TransitionEditor({ t, slide, transitionDuration, onChange }: { t: SlideTransition; slide: VideoItem; transitionDuration: number; onChange: (t: SlideTransition) => void }) {
  return (
    <div>
      <Row label="Type" help={FIELD_HELP["transition.type"]}><SelectField value={t.type} onChange={(v) => onChange({ ...t, type: v })} options={TRANSITION_TYPES} /></Row>
      <Row label="Duration (s)" help={FIELD_HELP["transition.duration"]}
        impact={{ slide, path: "transition.duration", variant: { kind: "scalar" }, current: t.duration, transitionDuration }}>
        <NumField value={t.duration} step={0.1} onChange={(v) => onChange({ ...t, duration: v })} />
      </Row>
      <Row label="Easing" help={FIELD_HELP["transition.easing"]}><SelectField value={t.easing} onChange={(v) => onChange({ ...t, easing: v })} options={EASINGS} /></Row>
    </div>
  );
});

// ── Slide editor ───────────────────────────────────────
const SlideEditor = memo(function SlideEditor({ slide, transitionDuration, onChange }: { slide: VideoItem; transitionDuration: number; onChange: (s: VideoItem) => void }) {
  const [tab, setTab] = useState<"background" | "video" | "sources" | "transition" | "behavior">("background");
  const set = <K extends keyof VideoItem,>(k: K, v: VideoItem[K]) => onChange({ ...slide, [k]: v });

  const setSources = (s: VideoSource[]) => set("sources", s);
  const addSource = () => setSources([...slide.sources, emptySource()]);
  const updSource = (i: number, s: VideoSource) => setSources(slide.sources.map((x, j) => j === i ? s : x));
  const delSource = (i: number) => setSources(slide.sources.filter((_, j) => j !== i));
  const dupSource = (i: number) => { const next = [...slide.sources]; next.splice(i + 1, 0, structuredClone(next[i])); setSources(next); };
  const moveSource = (i: number, d: -1 | 1) => {
    const next = [...slide.sources]; const j = i + d; if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]]; setSources(next);
  };

  return (
    <div>
      <div className="flex gap-2 mb-4 border-b border-white/10">
        {(["background","video","sources","transition","behavior"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-2 text-[11px] font-mono uppercase tracking-wider -mb-px transition ${tab===t ? "text-white border-b-2 border-white" : "text-white/40 hover:text-white/70 border-b-2 border-transparent"}`}>
            {t}{t === "sources" && slide.sources.length > 0 ? ` (${slide.sources.length})` : ""}
          </button>
        ))}
      </div>
      {tab === "video" && (
        <div>
          <Row label="Video URL" help={FIELD_HELP["slide.src"]}><TextField value={slide.src} onChange={(v) => set("src", v)} placeholder="https://…/video.webm" /></Row>
          <Row label="Label" help={FIELD_HELP["slide.label"]}><TextField value={slide.label ?? ""} onChange={(v) => set("label", v)} /></Row>
          <Row label="Notes" help={FIELD_HELP["slide.notes"]}><TextField value={slide.notes ?? ""} onChange={(v) => set("notes", v)} /></Row>
          <Row label="Loop" help={FIELD_HELP["slide.loop"]}><BoolField value={slide.loop} onChange={(v) => set("loop", v)} /></Row>
          <Row label="Muted" help={FIELD_HELP["slide.muted"]}><BoolField value={slide.muted} onChange={(v) => set("muted", v)} /></Row>
          <Row label="Volume" help={FIELD_HELP["slide.volume"]}><NumField value={slide.volume ?? 1} step={0.05} min={0} max={1} onChange={(v) => set("volume", v)} /></Row>
        </div>
      )}
      {tab === "sources" && (
        <div>
          <p className="text-[10px] font-mono text-white/40 mb-3 leading-relaxed">
            Layer additional videos on top of the main video. Each source has its own position, size, blend mode, and filters — full picture-in-picture.
          </p>
          {slide.sources.map((s, i) => (
            <Card key={i} idx={i} title={s.src ? s.src.split("/").pop() ?? "source" : "(empty source)"}
              onUp={() => moveSource(i, -1)} onDown={() => moveSource(i, 1)} onDup={() => dupSource(i)} onDel={() => delSource(i)}>
              <VideoSourceEditor src={s} slide={slide} idx={i} transitionDuration={transitionDuration} onChange={(ns) => updSource(i, ns)} />
            </Card>
          ))}
          <button className={btn} onClick={addSource}>+ Add video source</button>
        </div>
      )}
      {tab === "transition" && slide.transition && (
        <TransitionEditor t={slide.transition} slide={slide} transitionDuration={transitionDuration} onChange={(t) => set("transition", t)} />
      )}
      {tab === "background" && (
        <BackgroundEditor bg={slide.background} slide={slide} transitionDuration={transitionDuration} onChange={(b) => set("background", b)} />
      )}
      {tab === "behavior" && (
        <div>
          <SectionLabel>Auto-advance</SectionLabel>
          <p className="text-[10px] font-mono text-white/40 mb-3 leading-relaxed">
            Per-slide override. Forces this slide to auto-advance even when the global setting is off — or pins on this slide when the global is on.
          </p>
          <Row label="Mode" help={FIELD_HELP["slide.autoAdvance"]}>
            <SelectField value={slide.autoAdvance ?? "inherit"} onChange={(v) => set("autoAdvance", v)} options={ADVANCE_MODES} />
          </Row>
          <Row label="Delay (s)" help={FIELD_HELP["slide.autoAdvanceDelay"]}>
            <NumField value={slide.autoAdvanceDelay ?? 0} step={0.5} min={0} onChange={(v) => set("autoAdvanceDelay", v)} />
          </Row>
        </div>
      )}
    </div>
  );
});

// ── Global editor ──────────────────────────────────────
const GlobalEditor = memo(function GlobalEditor({ cfg, onChange }: { cfg: EngineConfig; onChange: (c: EngineConfig) => void }) {
  const [tab, setTab] = useState<"meta"|"video"|"controls"|"audio"|"theme"|"performance"|"watermark"|"accessibility"|"export"|"defaults"|"backgrounds">("meta");
  const patch = <K extends keyof EngineConfig,>(k: K, v: Partial<EngineConfig[K]>) =>
    onChange({ ...cfg, [k]: { ...(cfg[k] as object), ...v } as EngineConfig[K] });

  const setBgs = (b: BackgroundConfig[]) => onChange({ ...cfg, backgrounds: b });
  const addBg = () => setBgs([...(cfg.backgrounds ?? []), { type: EFFECT_KEYS[0], enabled: true, zIndex: 0, opacity: 1, blendMode: "source-over" }]);
  const updBg = (i: number, b: BackgroundConfig) => setBgs(cfg.backgrounds.map((x, j) => j === i ? b : x));
  const delBg = (i: number) => setBgs(cfg.backgrounds.filter((_, j) => j !== i));

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4 border-b border-white/10">
        {(["meta","video","controls","audio","theme","performance","watermark","backgrounds","accessibility","export","defaults"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-2.5 py-2 text-[10px] font-mono uppercase tracking-wider -mb-px transition ${tab===t ? "text-white border-b-2 border-white" : "text-white/40 hover:text-white/70 border-b-2 border-transparent"}`}>{t}</button>
        ))}
      </div>
      {tab === "meta" && (
        <div>
          <Row label="Title"><TextField value={cfg.meta.title} onChange={(v) => patch("meta", { title: v })} /></Row>
          <Row label="Version"><TextField value={cfg.meta.version} onChange={(v) => patch("meta", { version: v })} /></Row>
          <Row label="Author"><TextField value={cfg.meta.author} onChange={(v) => patch("meta", { author: v })} /></Row>
          <Row label="Description"><TextField value={cfg.meta.description} onChange={(v) => patch("meta", { description: v })} /></Row>
          <Row label="License"><TextField value={cfg.meta.license} onChange={(v) => patch("meta", { license: v })} /></Row>
          <Row label="Language"><TextField value={cfg.meta.language} onChange={(v) => patch("meta", { language: v })} /></Row>
          <Row label="Category"><TextField value={cfg.meta.category} onChange={(v) => patch("meta", { category: v })} /></Row>
          <Row label="Project URL"><TextField value={cfg.meta.projectUrl} onChange={(v) => patch("meta", { projectUrl: v })} /></Row>
          <Row label="Cover image"><TextField value={cfg.meta.coverImage} onChange={(v) => patch("meta", { coverImage: v })} /></Row>
          <Row label="Thumbnail"><TextField value={cfg.meta.thumbnail} onChange={(v) => patch("meta", { thumbnail: v })} /></Row>
        </div>
      )}
      {tab === "video" && (
        <div>
          <Row label="Fit"><SelectField value={cfg.video.fit} onChange={(v) => patch("video", { fit: v })} options={["contain","cover"] as const} /></Row>
          <Row label="Controls"><BoolField value={cfg.video.controls} onChange={(v) => patch("video", { controls: v })} /></Row>
          <Row label="BG color"><TextField value={cfg.video.bgColor} onChange={(v) => patch("video", { bgColor: v })} /></Row>
          <Row label="Global volume"><NumField value={cfg.video.globalVolume} step={0.05} min={0} max={1} onChange={(v) => patch("video", { globalVolume: v })} /></Row>
          <Row label="Preload"><SelectField value={cfg.video.preloadStrategy} onChange={(v) => patch("video", { preloadStrategy: v })} options={["none","next","all"] as const} /></Row>
          <Row label="Buffer size"><NumField value={cfg.video.bufferSize} onChange={(v) => patch("video", { bufferSize: v })} /></Row>
        </div>
      )}
      {tab === "controls" && (
        <div>
          {Object.entries(cfg.controls).map(([k, v]) => (
            <Row key={k} label={k}>
              {typeof v === "boolean"
                ? <BoolField value={v} onChange={(nv) => patch("controls", { [k]: nv } as Partial<EngineConfig["controls"]>)} />
                : typeof v === "number"
                ? <NumField value={v} step={k.toLowerCase().includes("duration") || k.toLowerCase().includes("timeout") ? 0.1 : 1}
                    onChange={(nv) => patch("controls", { [k]: nv } as Partial<EngineConfig["controls"]>)} />
                : <TextField value={String(v)} onChange={(nv) => patch("controls", { [k]: nv } as Partial<EngineConfig["controls"]>)} />}
            </Row>
          ))}
        </div>
      )}
      {tab === "audio" && (
        <div>
          <Row label="Enabled"><BoolField value={cfg.audio.enabled} onChange={(v) => patch("audio", { enabled: v })} /></Row>
          <Row label="Volume"><NumField value={cfg.audio.volume} step={0.05} min={0} max={1} onChange={(v) => patch("audio", { volume: v })} /></Row>
          <Row label="Fade in"><BoolField value={cfg.audio.fadeIn} onChange={(v) => patch("audio", { fadeIn: v })} /></Row>
          <Row label="Fade in ms"><NumField value={cfg.audio.fadeInDuration} onChange={(v) => patch("audio", { fadeInDuration: v })} /></Row>
          <Row label="Fade out"><BoolField value={cfg.audio.fadeOut} onChange={(v) => patch("audio", { fadeOut: v })} /></Row>
          <Row label="Fade out ms"><NumField value={cfg.audio.fadeOutDuration} onChange={(v) => patch("audio", { fadeOutDuration: v })} /></Row>
          <Row label="Crossfade"><BoolField value={cfg.audio.crossfade} onChange={(v) => patch("audio", { crossfade: v })} /></Row>
          <Row label="Crossfade ms"><NumField value={cfg.audio.crossfadeDuration} onChange={(v) => patch("audio", { crossfadeDuration: v })} /></Row>
          <Row label="Global mute"><BoolField value={cfg.audio.globalMute} onChange={(v) => patch("audio", { globalMute: v })} /></Row>
        </div>
      )}
      {tab === "theme" && (
        <div>
          <Row label="Primary"><TextField value={cfg.theme.primaryColor} onChange={(v) => patch("theme", { primaryColor: v })} /></Row>
          <Row label="Secondary"><TextField value={cfg.theme.secondaryColor} onChange={(v) => patch("theme", { secondaryColor: v })} /></Row>
          <Row label="Accent"><TextField value={cfg.theme.accentColor} onChange={(v) => patch("theme", { accentColor: v })} /></Row>
          <Row label="Font family"><TextField value={cfg.theme.fontFamily} onChange={(v) => patch("theme", { fontFamily: v })} /></Row>
          <Row label="UI opacity"><NumField value={cfg.theme.uiOpacity} step={0.05} min={0} max={1} onChange={(v) => patch("theme", { uiOpacity: v })} /></Row>
          <Row label="UI position"><SelectField value={cfg.theme.uiPosition} onChange={(v) => patch("theme", { uiPosition: v })} options={["top-right","top-left","bottom-right","bottom-left"] as const} /></Row>
          <Row label="Dark mode"><BoolField value={cfg.theme.darkMode} onChange={(v) => patch("theme", { darkMode: v })} /></Row>
        </div>
      )}
      {tab === "performance" && (
        <div>
          <Row label="Max FPS"><NumField value={cfg.performance.maxFPS} onChange={(v) => patch("performance", { maxFPS: v })} /></Row>
          <Row label="Resolution"><NumField value={cfg.performance.resolution} step={0.1} onChange={(v) => patch("performance", { resolution: v })} /></Row>
          <Row label="Enable GPU"><BoolField value={cfg.performance.enableGPU} onChange={(v) => patch("performance", { enableGPU: v })} /></Row>
          <Row label="Max particles"><NumField value={cfg.performance.maxParticles} onChange={(v) => patch("performance", { maxParticles: v })} /></Row>
          <Row label="Bloom"><BoolField value={cfg.performance.enableBloom} onChange={(v) => patch("performance", { enableBloom: v })} /></Row>
          <Row label="Antialias"><BoolField value={cfg.performance.antialiasing} onChange={(v) => patch("performance", { antialiasing: v })} /></Row>
        </div>
      )}
      {tab === "watermark" && (
        <div>
          <Row label="Enabled"><BoolField value={cfg.watermark.enabled} onChange={(v) => patch("watermark", { enabled: v })} /></Row>
          <Row label="Mode"><SelectField value={cfg.watermark.mode} onChange={(v) => patch("watermark", { mode: v })} options={["text","image"] as const} /></Row>
          <Row label="Text"><TextField value={cfg.watermark.text} onChange={(v) => patch("watermark", { text: v })} /></Row>
          <Row label="Image URL"><TextField value={cfg.watermark.imageUrl} onChange={(v) => patch("watermark", { imageUrl: v })} /></Row>
          <Row label="Image width"><NumField value={cfg.watermark.imageWidth} onChange={(v) => patch("watermark", { imageWidth: v })} /></Row>
          <Row label="Image height"><NumField value={cfg.watermark.imageHeight} onChange={(v) => patch("watermark", { imageHeight: v })} /></Row>
          <Row label="Position"><SelectField value={cfg.watermark.position} onChange={(v) => patch("watermark", { position: v })} options={["top-left","top-right","bottom-left","bottom-right","center","custom"] as const} /></Row>
          <Row label="X"><NumField value={cfg.watermark.x} onChange={(v) => patch("watermark", { x: v })} /></Row>
          <Row label="Y"><NumField value={cfg.watermark.y} onChange={(v) => patch("watermark", { y: v })} /></Row>
          <Row label="Opacity"><NumField value={cfg.watermark.opacity} step={0.05} min={0} max={1} onChange={(v) => patch("watermark", { opacity: v })} /></Row>
          <Row label="Font size"><NumField value={cfg.watermark.fontSize} onChange={(v) => patch("watermark", { fontSize: v })} /></Row>
          <Row label="Color"><TextField value={cfg.watermark.color} onChange={(v) => patch("watermark", { color: v })} /></Row>
          <Row label="Rotation"><NumField value={cfg.watermark.rotation} onChange={(v) => patch("watermark", { rotation: v })} /></Row>
        </div>
      )}
      {tab === "backgrounds" && (
        <div>
          <p className="text-[10px] font-mono text-white/40 mb-3 leading-relaxed">
            Global overlay effects rendered above or below every slide. Use for persistent visual treatments like grain, vignette, or ambient particles.
          </p>
          {(cfg.backgrounds ?? []).map((b, i) => (
            <Card key={i} idx={i} title={`${EFFECT_NAMES[b.type] ?? b.type} · z${b.zIndex}`}
              onUp={() => { const next = [...cfg.backgrounds]; if (i > 0) { [next[i], next[i-1]] = [next[i-1], next[i]]; setBgs(next); } }}
              onDown={() => { const next = [...cfg.backgrounds]; if (i < next.length - 1) { [next[i], next[i+1]] = [next[i+1], next[i]]; setBgs(next); } }}
              onDup={() => { const next = [...cfg.backgrounds]; next.splice(i+1, 0, structuredClone(b)); setBgs(next); }}
              onDel={() => delBg(i)}>
              <Row label="Effect" help={FIELD_HELP["bgGlobal.type"]}><SelectField value={b.type} onChange={(v) => updBg(i, { ...b, type: v })} options={EFFECT_KEYS as readonly string[]} /></Row>
              <Row label="Enabled" help={FIELD_HELP["bgGlobal.enabled"]}><BoolField value={b.enabled} onChange={(v) => updBg(i, { ...b, enabled: v })} /></Row>
              <Row label="Z-index" help={FIELD_HELP["bgGlobal.zIndex"]}><NumField value={b.zIndex} onChange={(v) => updBg(i, { ...b, zIndex: v })} /></Row>
              <Row label="Opacity" help={FIELD_HELP["bgGlobal.opacity"]}><NumField value={b.opacity} step={0.05} min={0} max={1} onChange={(v) => updBg(i, { ...b, opacity: v })} /></Row>
              <Row label="Blend" help={FIELD_HELP["bgGlobal.blendMode"]}><SelectField value={b.blendMode} onChange={(v) => updBg(i, { ...b, blendMode: v })} options={BLEND_MODES} /></Row>
            </Card>
          ))}
          <button className={btn} onClick={addBg}>+ Add global background</button>
        </div>
      )}
      {tab === "accessibility" && (
        <div>
          {Object.entries(cfg.accessibility).map(([k, v]) => (
            <Row key={k} label={k}>
              <BoolField value={v as boolean} onChange={(nv) => patch("accessibility", { [k]: nv } as Partial<EngineConfig["accessibility"]>)} />
            </Row>
          ))}
        </div>
      )}
      {tab === "export" && (
        <div>
          <Row label="Format"><SelectField value={cfg.export.format} onChange={(v) => patch("export", { format: v })} options={["json","ts"] as const} /></Row>
          <Row label="Include assets"><BoolField value={cfg.export.includeAssets} onChange={(v) => patch("export", { includeAssets: v })} /></Row>
          <Row label="Minify"><BoolField value={cfg.export.minify} onChange={(v) => patch("export", { minify: v })} /></Row>
          <Row label="Embed videos"><BoolField value={cfg.export.embedVideos} onChange={(v) => patch("export", { embedVideos: v })} /></Row>
        </div>
      )}
      {tab === "defaults" && (
        <div className="space-y-6">
          <div>
            <p className="text-[10px] font-mono text-white/40 uppercase tracking-wider mb-2">Default background applied to new slides</p>
            <BackgroundEditor bg={cfg.defaults.background} slide={{ ...emptySlide(), background: cfg.defaults.background }} transitionDuration={0.5}
              onChange={(b) => onChange({ ...cfg, defaults: { ...cfg.defaults, background: b } })} />
          </div>
          <div>
            <p className="text-[10px] font-mono text-white/40 uppercase tracking-wider mb-2">Default effect layer</p>
            <EffectLayerEditor
              layer={cfg.defaults.effectLayer}
              slide={{ ...emptySlide(), background: { ...cfg.defaults.background, effectLayers: [cfg.defaults.effectLayer] } }}
              layerIndex={0}
              transitionDuration={0.5}
              onChange={(l) => onChange({ ...cfg, defaults: { ...cfg.defaults, effectLayer: l } })}
            />
          </div>
          <div>
            <p className="text-[10px] font-mono text-white/40 uppercase tracking-wider mb-2">Default video source</p>
            <VideoSourceEditor
              src={cfg.defaults.videoSource}
              slide={{ ...emptySlide(), sources: [cfg.defaults.videoSource] }}
              idx={0}
              transitionDuration={0.5}
              onChange={(s) => onChange({ ...cfg, defaults: { ...cfg.defaults, videoSource: s } })}
            />
          </div>
          <div>
            <p className="text-[10px] font-mono text-white/40 uppercase tracking-wider mb-2">Default transition</p>
            <TransitionEditor
              t={cfg.defaults.defaultTransition}
              slide={{ ...emptySlide(), transition: cfg.defaults.defaultTransition }}
              transitionDuration={0.5}
              onChange={(t) => onChange({ ...cfg, defaults: { ...cfg.defaults, defaultTransition: t } })}
            />
          </div>
        </div>
      )}
    </div>
  );
});

// ── Live preview tile (hover-intent zoom + impact bus A/B) ──
const LivePreview = ({ slide, transitionDuration }: { slide: VideoItem | null; transitionDuration: number }) => {
  const [hover, setHover] = useState(false);
  const [impact, setImpact] = useState<ImpactState | null>(impactBus.get());
  const closeTimer = useRef<number>(0);

  const openNow = () => { window.clearTimeout(closeTimer.current); setHover(true); };
  const scheduleClose = () => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setHover(false), 180);
  };

  useEffect(() => impactBus.subscribe(setImpact), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setHover(false); };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); window.clearTimeout(closeTimer.current); };
  }, []);

  if (!slide) return null;

  // Prefer the impact target's slide when peeking (fields might belong to
  // that slide anyway) so A/B always reflects the field being previewed.
  const impactSlide = impact?.slide ?? slide;

  const StageContent = ({ zoomed }: { zoomed: boolean }) =>
    impact ? (
      <ImpactPreview
        slide={impactSlide}
        path={impact.path}
        variant={impact.variant}
        current={impact.current}
        transitionDuration={transitionDuration}
        aspect={zoomed ? "16/9" : "16/9"}
      />
    ) : (
      <MiniStage slide={slide} transitionDuration={transitionDuration} active className="w-full h-full" />
    );

  const badge = impact
    ? `Impact · ${impact.label}`
    : `Preview · ${EFFECT_NAMES[slide.background.type] ?? slide.background.type}`;

  const tile = (
    <div
      className="fixed bottom-0 right-0 z-40 p-6 cursor-zoom-in"
      onMouseEnter={openNow}
      onMouseLeave={scheduleClose}
    >
      <div
        className={`rounded-lg overflow-hidden border shadow-2xl bg-black transition-all relative ${
          impact ? "border-amber-300/60 shadow-[0_0_40px_rgba(251,191,36,0.25)]" : "border-white/20 hover:shadow-[0_0_40px_rgba(255,255,255,0.15)]"
        }`}
        style={{ width: 360, height: 202 }}
      >
        <div className="absolute inset-0 p-1"><StageContent zoomed={false} /></div>
        <div className="absolute top-1.5 left-2 text-[9px] font-mono uppercase tracking-[0.2em] text-white bg-black/60 px-1.5 py-0.5 rounded pointer-events-none max-w-[95%] truncate">
          {badge}{!impact && " · hover to zoom"}
        </div>
      </div>
    </div>
  );

  const zoom = hover ? createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-sm"
      onMouseEnter={openNow}
      onMouseLeave={scheduleClose}
      onClick={(e) => { if (e.target === e.currentTarget) setHover(false); }}
    >
      <div className={`relative rounded-xl overflow-hidden border shadow-2xl bg-black p-2 ${impact ? "border-amber-300/60" : "border-white/20"}`} style={{ width: "75vw", height: "75vh" }}>
        <StageContent zoomed />
        <div className="absolute top-3 left-4 text-[10px] font-mono uppercase tracking-[0.2em] text-white bg-black/60 px-2 py-0.5 rounded">
          {impact
            ? `Impact · ${impact.label} · A vs B`
            : (
              <>
                Live preview · {EFFECT_NAMES[slide.background.type] ?? slide.background.type}
                {slide.sources.length > 0 && ` · ${slide.sources.length} source${slide.sources.length === 1 ? "" : "s"}`}
                {slide.background.effectLayers?.length > 0 && ` · ${slide.background.effectLayers.length} layer${slide.background.effectLayers.length === 1 ? "" : "s"}`}
              </>
            )}
          {" · Esc to close"}
        </div>
      </div>
    </div>,
    document.body,
  ) : null;

  return <>{tile}{zoom}</>;
};

// ── Main Builder page ──────────────────────────────────
const Builder = () => {
  const navigate = useNavigate();
  const [cfg, setCfg] = useState<EngineConfig>(() => {
    const blank = emptyConfig();
    blank.video.playlist = [];
    return blank;
  });
  const [selected, setSelected] = useState<number>(-1);
  const [view, setView] = useState<"slide" | "global">("slide");
  const [previewOn, setPreviewOn] = useState(true);
  const importRef = useRef<HTMLInputElement>(null);

  const slides = cfg.video.playlist;
  const current = selected >= 0 && selected < slides.length ? slides[selected] : null;

  const updateSlide = useCallback((idx: number, s: VideoItem) => {
    setCfg((c) => {
      const next = [...c.video.playlist];
      next[idx] = s;
      return { ...c, video: { ...c.video, playlist: next } };
    });
  }, []);

  const addSlide = useCallback(() => {
    setCfg((c) => {
      const s = emptySlide();
      s.background = structuredClone(c.defaults.background);
      const next = [...c.video.playlist, s];
      return { ...c, video: { ...c.video, playlist: next } };
    });
    setSelected(slides.length);
    setView("slide");
  }, [slides.length]);

  const duplicateSlide = useCallback((i: number) => {
    setCfg((c) => {
      const next = [...c.video.playlist];
      next.splice(i + 1, 0, structuredClone(next[i]));
      return { ...c, video: { ...c.video, playlist: next } };
    });
  }, []);

  const deleteSlide = useCallback((i: number) => {
    setCfg((c) => {
      const next = c.video.playlist.filter((_, idx) => idx !== i);
      return { ...c, video: { ...c.video, playlist: next } };
    });
    setSelected((s) => (s >= i ? Math.max(-1, s - 1) : s));
  }, []);

  const moveSlide = useCallback((i: number, dir: -1 | 1) => {
    setCfg((c) => {
      const next = [...c.video.playlist];
      const j = i + dir;
      if (j < 0 || j >= next.length) return c;
      [next[i], next[j]] = [next[j], next[i]];
      return { ...c, video: { ...c.video, playlist: next } };
    });
    setSelected((s) => s === i ? i + dir : (s === i + dir ? i : s));
  }, []);

  const bulkGenerateOnePerEffect = useCallback(() => {
    setCfg((c) => {
      const newSlides: VideoItem[] = EFFECT_KEYS.map((effectKey) => {
        const s = emptySlide();
        s.background = { ...structuredClone(c.defaults.background), type: effectKey };
        s.label = EFFECT_NAMES[effectKey] ?? effectKey;
        return s;
      });
      return { ...c, video: { ...c.video, playlist: [...c.video.playlist, ...newSlides] } };
    });
  }, []);

  const bulkGenerateN = useCallback(() => {
    const raw = window.prompt("How many slides to generate?", "10");
    if (!raw) return;
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n) || n < 1 || n > 500) return;
    setCfg((c) => {
      const newSlides: VideoItem[] = Array.from({ length: n }, (_, i) => {
        const s = emptySlide();
        s.background = { ...structuredClone(c.defaults.background), type: EFFECT_KEYS[i % EFFECT_KEYS.length] };
        return s;
      });
      return { ...c, video: { ...c.video, playlist: [...c.video.playlist, ...newSlides] } };
    });
  }, []);

  const importFromCurrent = useCallback(() => {
    setCfg(structuredClone(CONFIG));
    setSelected(0);
  }, []);

  const loadJSON = () => importRef.current?.click();
  const onImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        if (data?.meta && data?.video) {
          setCfg({ ...emptyConfig(), ...data, video: { ...emptyConfig().video, ...data.video, playlist: data.video.playlist ?? [] } });
          setSelected(0);
        }
      } catch { /* ignore */ }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const saveJSON = (asTS = false) => {
    const data = asTS
      ? `/* Generated ${new Date().toISOString()} */\nexport const CONFIG = ${JSON.stringify(cfg, null, 2)};\n`
      : JSON.stringify(cfg, null, 2);
    const blob = new Blob([data], { type: asTS ? "text/typescript" : "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(cfg.meta.title || "config").replace(/\s+/g, "-").toLowerCase()}.${asTS ? "ts" : "json"}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const applyToLive = () => {
    builderStore.set(structuredClone(cfg));
    navigate("/");
  };

  const summary = useMemo(() => `${slides.length} slide${slides.length === 1 ? "" : "s"}`, [slides.length]);
  const Divider = () => <span className="w-px h-5 bg-white/10 mx-1" />;
  const transitionDuration = (cfg.controls.transitionDuration ?? 0) / 1000;

  return (
    <div className="fixed inset-0 flex flex-col bg-zinc-950 text-white">
      <BuilderAmbient />
      {/* Top bar */}
      <div className="relative z-10 flex items-center gap-2 px-4 py-2.5 border-b border-white/10 bg-zinc-950/85 backdrop-blur">

        <Link to="/" className="text-[11px] font-mono uppercase tracking-widest text-white/50 hover:text-white">← Live</Link>
        <span className="text-[11px] font-mono uppercase tracking-widest text-white/30 ml-2">Config Builder</span>
        <span className="text-[10px] font-mono text-white/40 ml-3">{summary}</span>
        <div className="flex-1" />
        <button className={btn} onClick={() => { setCfg({ ...emptyConfig(), video: { ...emptyConfig().video, playlist: [] } }); setSelected(-1); }}>New</button>
        <button className={btn} onClick={importFromCurrent}>Load current</button>
        <Divider />
        <button className={btn} onClick={loadJSON}>Import JSON</button>
        <button className={btn} onClick={() => saveJSON(false)}>Save JSON</button>
        <button className={btn} onClick={() => saveJSON(true)}>Save TS</button>
        <Divider />
        <button className={btn} onClick={() => setPreviewOn((p) => !p)}>Preview: {previewOn ? "on" : "off"}</button>
        <button className={btnPrimary} onClick={applyToLive}>Apply to live →</button>
        <input ref={importRef} type="file" accept=".json" className="hidden" onChange={onImport} />
      </div>

      <div className="relative z-10 flex-1 flex min-h-0">
        {/* Left: slide list */}
        <div className="w-64 shrink-0 border-r border-white/10 flex flex-col bg-zinc-950/80 backdrop-blur">
          <div className="p-3 border-b border-white/10 flex flex-col gap-2">
            <button className={btn} onClick={addSlide}>+ Add slide</button>
            <button className={btn} onClick={bulkGenerateOnePerEffect}>One per effect ({EFFECT_KEYS.length})</button>
            <button className={btn} onClick={bulkGenerateN}>Bulk N…</button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {slides.length === 0 && (
              <div className="text-[11px] font-mono text-white/30 text-center py-10 px-2 leading-relaxed">
                No slides yet.<br />
                <span className="text-white/20">Add or bulk-generate above.</span>
              </div>
            )}
            {slides.map((s, i) => (
              <div key={i}
                className={`group rounded border px-2 py-1.5 cursor-pointer transition ${selected === i ? "border-white/40 bg-white/10" : "border-white/10 hover:bg-white/5"}`}
                onClick={() => { setSelected(i); setView("slide"); }}>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-white/40 w-6 shrink-0">{String(i + 1).padStart(2, "0")}</span>
                  <span className="text-[11px] font-mono truncate flex-1">{s.label || EFFECT_NAMES[s.background.type] || s.background.type}</span>
                </div>
                <div className="flex gap-2 mt-1 opacity-40 group-hover:opacity-100 transition">
                  <button onClick={(e) => { e.stopPropagation(); moveSlide(i, -1); }} className="text-[10px] font-mono text-white/50 hover:text-white">↑</button>
                  <button onClick={(e) => { e.stopPropagation(); moveSlide(i, 1); }} className="text-[10px] font-mono text-white/50 hover:text-white">↓</button>
                  <button onClick={(e) => { e.stopPropagation(); duplicateSlide(i); }} className="text-[10px] font-mono text-white/50 hover:text-white">dup</button>
                  <button onClick={(e) => { e.stopPropagation(); deleteSlide(i); }} className="text-[10px] font-mono text-white/40 hover:text-red-400 ml-auto">del</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: editor */}
        <div className="flex-1 flex flex-col min-w-0 relative bg-zinc-950/80 backdrop-blur">
          <div className="flex gap-2 px-6 pt-3 border-b border-white/10">
            <button onClick={() => setView("slide")}
              className={`px-3 py-2 text-[11px] font-mono uppercase tracking-wider -mb-px transition ${view === "slide" ? "text-white border-b-2 border-white" : "text-white/40 hover:text-white/70 border-b-2 border-transparent"}`}>
              Slide editor {current ? `· #${selected + 1}` : ""}
            </button>
            <button onClick={() => setView("global")}
              className={`px-3 py-2 text-[11px] font-mono uppercase tracking-wider -mb-px transition ${view === "global" ? "text-white border-b-2 border-white" : "text-white/40 hover:text-white/70 border-b-2 border-transparent"}`}>
              Global config
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-6 py-6 pb-32">
              {view === "slide" && current && (
                <SlideEditor slide={current} transitionDuration={transitionDuration} onChange={(s) => updateSlide(selected, s)} />
              )}
              {view === "slide" && !current && (
                <div className="text-[12px] font-mono text-white/40 mt-20 text-center leading-relaxed">
                  Select a slide on the left, or<br />
                  <span className="text-white/30">add one with the buttons above.</span>
                </div>
              )}
              {view === "global" && <GlobalEditor cfg={cfg} onChange={setCfg} />}
            </div>
          </div>
          {/* Sticky footer summary */}
          {current && (
            <div className="absolute bottom-0 left-0 right-0 pointer-events-none px-6 py-2 border-t border-white/10 bg-zinc-950/90 backdrop-blur text-[10px] font-mono uppercase tracking-wider text-white/40">
              slide {selected + 1} of {slides.length} · effect: {EFFECT_NAMES[current.background.type] ?? current.background.type} · transition: {current.transition?.type} {current.transition?.duration}s · auto: {current.autoAdvance ?? "inherit"}
            </div>
          )}
        </div>
      </div>

      {previewOn && current && (
        <LivePreview slide={current} transitionDuration={transitionDuration} />
      )}
    </div>
  );
};

export default Builder;
