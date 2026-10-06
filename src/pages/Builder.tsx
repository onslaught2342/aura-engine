import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { CONFIG, type EngineConfig, type VideoItem, type SlideTransition, type VideoSource, type BackgroundConfig } from "@/engine/config";
import { EFFECT_NAMES } from "@/engine/effectNames";
import { builderStore } from "@/lib/builderStore";
import { MiniStage, type SoloLayer } from "@/components/builder/MiniStage";
import { ImpactPreview } from "@/components/builder/ImpactPreview";
import { BuilderAmbient } from "@/components/builder/BuilderAmbient";
import { LayerStack } from "@/components/builder/LayerStack";
import { SchemaGroups, EFFECT_KEYS } from "@/components/builder/SchemaField";
import { impactBus, type ImpactState } from "@/lib/impactBus";
import {
  GLOBAL_SECTIONS, SLIDE_GROUPS, SLIDE_BEHAVIOR_FIELDS, SOURCE_GROUPS, TRANSITION_FIELDS, GLOBAL_BG_FIELDS, LAYER_GROUPS,
} from "@/lib/configSchema";
import { normalizeConfig, normalizeSlide, serializeConfig } from "@/lib/configNormalize";

const DRAFT_KEY = "aura.builder.draft.v2";

const emptySlide = (): VideoItem => normalizeSlide({
  transition: structuredClone(CONFIG.defaults.defaultTransition),
  background: structuredClone(CONFIG.defaults.background),
});
const emptySource = (): VideoSource => structuredClone(CONFIG.defaults.videoSource);

// ── Shared style helpers ───────────────────────────────────
const btn = "h-7 px-3 whitespace-nowrap shrink-0 inline-flex items-center justify-center text-[11px] font-mono uppercase tracking-wider rounded border border-white/15 hover:border-white/40 hover:bg-white/5 text-white/80 transition disabled:opacity-30 disabled:pointer-events-none";
const btnPrimary = "h-7 px-3 whitespace-nowrap shrink-0 inline-flex items-center justify-center text-[11px] font-mono uppercase tracking-wider rounded border border-white/60 bg-white/15 hover:bg-white/20 text-white transition";
const btnGhost = "h-6 px-2 text-[10px] font-mono uppercase tracking-wider rounded text-white/50 hover:text-white hover:bg-white/5 transition";

const SLIDE_DEFAULTS = emptySlide() as unknown as Record<string, unknown>;
const SOURCE_DEFAULTS = CONFIG.defaults.videoSource as unknown as Record<string, unknown>;
const TRANSITION_DEFAULTS = CONFIG.defaults.defaultTransition as unknown as Record<string, unknown>;
const asRec = (v: unknown) => v as Record<string, unknown>;

// ── Card wrapper for list items ────────────────────────
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
    <div className="px-3 pt-2">{children}</div>
  </div>
);

function moveIn<T>(arr: T[], i: number, d: -1 | 1): T[] {
  const j = i + d;
  if (j < 0 || j >= arr.length) return arr;
  const next = [...arr];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

// ── Slide editor ───────────────────────────────────────
type SlideTab = "effects" | "video" | "sources" | "transition" | "behavior";
const SlideEditor = memo(function SlideEditor({ slide, transitionDuration, search, onChange, onSolo }: {
  slide: VideoItem; transitionDuration: number; search: string; onChange: (s: VideoItem) => void; onSolo: (s: SoloLayer) => void;
}) {
  const [tab, setTab] = useState<SlideTab>("effects");
  const patch = (k: string, v: unknown) => onChange({ ...slide, [k]: v } as VideoItem);
  const setSources = (s: VideoSource[]) => onChange({ ...slide, sources: s });
  const sources = slide.sources ?? [];
  const layerCount = slide.background.effectLayers?.length ?? 0;

  const tabs: { id: SlideTab; label: string }[] = [
    { id: "effects", label: `Effects (${layerCount + 1})` },
    { id: "video", label: "Main video" },
    { id: "sources", label: `Extra videos (${sources.length})` },
    { id: "transition", label: "Transition" },
    { id: "behavior", label: "Auto-advance" },
  ];

  return (
    <div>
      <div className="flex flex-wrap gap-1 mb-5 border-b border-white/10">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-3 py-2 text-[11px] font-mono uppercase tracking-wider -mb-px transition ${tab === t.id ? "text-white border-b-2 border-white" : "text-white/40 hover:text-white/70 border-b-2 border-transparent"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "effects" && (
        <LayerStack bg={slide.background} slide={slide} transitionDuration={transitionDuration} search={search}
          onChange={(b) => onChange({ ...slide, background: b })} onSolo={onSolo} />
      )}

      {tab === "video" && (
        <SchemaGroups groups={SLIDE_GROUPS} value={asRec(slide)} defaults={SLIDE_DEFAULTS} onPatch={patch}
          slide={slide} transitionDuration={transitionDuration} search={search} />
      )}

      {tab === "sources" && (
        <div>
          <p className="text-[10px] font-mono text-white/40 mb-3 leading-relaxed">
            Stack more videos on top of the main video. Each one has its own position, size, blend, crop and filters.
          </p>
          {sources.map((s, i) => (
            <Card key={i} idx={i} title={s.src ? s.src.split("/").pop() ?? "video" : "(no URL yet)"}
              onUp={() => setSources(moveIn(sources, i, -1))} onDown={() => setSources(moveIn(sources, i, 1))}
              onDup={() => { const n = [...sources]; n.splice(i + 1, 0, structuredClone(s)); setSources(n); }}
              onDel={() => setSources(sources.filter((_, j) => j !== i))}>
              <SchemaGroups groups={SOURCE_GROUPS} value={asRec(s)} defaults={SOURCE_DEFAULTS}
                onPatch={(k, v) => setSources(sources.map((x, j) => (j === i ? { ...x, [k]: v } : x)))}
                slide={slide} pathPrefix={`sources.${i}.`} transitionDuration={transitionDuration} search={search} />
            </Card>
          ))}
          <button className={btn} onClick={() => setSources([...sources, emptySource()])}>+ Add video</button>
        </div>
      )}

      {tab === "transition" && (
        slide.transition ? (
          <div>
            <SchemaGroups groups={[{ title: "Transition", fields: TRANSITION_FIELDS }]} value={asRec(slide.transition)} defaults={TRANSITION_DEFAULTS}
              onPatch={(k, v) => patch("transition", { ...slide.transition, [k]: v } as SlideTransition)}
              slide={slide} pathPrefix="transition." transitionDuration={transitionDuration} search={search} />
            <button className={btn} onClick={() => patch("transition", null)}>Use global transition</button>
          </div>
        ) : (
          <div className="text-[11px] font-mono text-white/50 space-y-3">
            <p>This slide uses the global transition.</p>
            <button className={btn} onClick={() => patch("transition", structuredClone(CONFIG.defaults.defaultTransition))}>Customise for this slide</button>
          </div>
        )
      )}

      {tab === "behavior" && (
        <SchemaGroups groups={[{ title: "Auto-advance (this slide only)", fields: SLIDE_BEHAVIOR_FIELDS }]}
          value={{ ...asRec(slide), autoAdvance: slide.autoAdvance ?? "inherit", autoAdvanceDelay: slide.autoAdvanceDelay ?? 0 }}
          onPatch={patch} search={search} />
      )}
    </div>
  );
});

// ── Global editor ──────────────────────────────────────
const GlobalEditor = memo(function GlobalEditor({ cfg, search, onChange, onSolo }: {
  cfg: EngineConfig; search: string; onChange: (c: EngineConfig) => void; onSolo: (s: SoloLayer) => void;
}) {
  const [tab, setTab] = useState<string>("meta");
  const patchSection = (path: keyof EngineConfig, k: string, v: unknown) =>
    onChange({ ...cfg, [path]: { ...(cfg[path] as object), [k]: v } } as EngineConfig);
  const setBgs = (b: BackgroundConfig[]) => onChange({ ...cfg, backgrounds: b });
  const bgs = cfg.backgrounds ?? [];
  const setDefaults = (k: keyof EngineConfig["defaults"], v: unknown) =>
    onChange({ ...cfg, defaults: { ...cfg.defaults, [k]: v } });

  const tabs = [...GLOBAL_SECTIONS.map((s) => ({ id: s.id, title: s.title })), { id: "overlays", title: "Overlays" }, { id: "defaults", title: "New-slide defaults" }];
  const defaultSlide = useMemo(() => ({ ...emptySlide(), background: cfg.defaults.background }), [cfg.defaults.background]);
  const section = GLOBAL_SECTIONS.find((s) => s.id === tab);

  return (
    <div>
      <div className="flex flex-wrap gap-1 mb-5 border-b border-white/10">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-2.5 py-2 text-[10px] font-mono uppercase tracking-wider -mb-px transition ${tab === t.id ? "text-white border-b-2 border-white" : "text-white/40 hover:text-white/70 border-b-2 border-transparent"}`}>{t.title}</button>
        ))}
      </div>

      {section && (
        <SchemaGroups groups={section.groups} value={asRec(cfg[section.path])} defaults={asRec(CONFIG[section.path])}
          onPatch={(k, v) => patchSection(section.path, k, v)} search={search} />
      )}

      {tab === "overlays" && (
        <div>
          <p className="text-[10px] font-mono text-white/40 mb-3 leading-relaxed">
            Effects drawn on every slide, above or below the slide's own effects.
          </p>
          {bgs.map((b, i) => (
            <Card key={i} idx={i} title={`${EFFECT_NAMES[b.type] ?? b.type} · z${b.zIndex}${b.enabled ? "" : " · off"}`}
              onUp={() => setBgs(moveIn(bgs, i, -1))} onDown={() => setBgs(moveIn(bgs, i, 1))}
              onDup={() => { const n = [...bgs]; n.splice(i + 1, 0, structuredClone(b)); setBgs(n); }}
              onDel={() => setBgs(bgs.filter((_, j) => j !== i))}>
              <SchemaGroups groups={[{ title: "Overlay", fields: GLOBAL_BG_FIELDS }]} value={asRec(b)}
                onPatch={(k, v) => setBgs(bgs.map((x, j) => (j === i ? { ...x, [k]: v } : x)))} search={search} />
            </Card>
          ))}
          <button className={btn} onClick={() => setBgs([...bgs, { type: EFFECT_KEYS[0], enabled: true, zIndex: 0, opacity: 1, blendMode: "source-over" }])}>+ Add overlay</button>
        </div>
      )}

      {tab === "defaults" && (
        <div className="space-y-8">
          <div>
            <p className="text-[10px] font-mono text-white/50 uppercase tracking-wider mb-3">Default effects for new slides</p>
            <LayerStack bg={cfg.defaults.background} slide={defaultSlide} transitionDuration={0.5} search={search} withImpact={false}
              onChange={(b) => setDefaults("background", b)} onSolo={onSolo} />
          </div>
          <SchemaGroups groups={LAYER_GROUPS.map((g) => ({ ...g, title: `New layer · ${g.title}` }))} value={asRec(cfg.defaults.effectLayer)}
            defaults={asRec(CONFIG.defaults.effectLayer)} onPatch={(k, v) => setDefaults("effectLayer", { ...cfg.defaults.effectLayer, [k]: v })} search={search} />
          <SchemaGroups groups={SOURCE_GROUPS.map((g) => ({ ...g, title: `New video · ${g.title}` }))} value={asRec(cfg.defaults.videoSource)}
            defaults={SOURCE_DEFAULTS} onPatch={(k, v) => setDefaults("videoSource", { ...cfg.defaults.videoSource, [k]: v })} search={search} />
          <SchemaGroups groups={[{ title: "Global transition", fields: TRANSITION_FIELDS }]} value={asRec(cfg.defaults.defaultTransition)}
            defaults={TRANSITION_DEFAULTS} onPatch={(k, v) => setDefaults("defaultTransition", { ...cfg.defaults.defaultTransition, [k]: v })} search={search} />
        </div>
      )}
    </div>
  );
});

// ── Live preview tile (hover-intent zoom + impact bus A/B) ──
const LivePreview = ({ slide, transitionDuration, solo = null }: { slide: VideoItem | null; transitionDuration: number; solo?: SoloLayer }) => {
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
      <MiniStage slide={slide} transitionDuration={transitionDuration} soloLayer={solo} active className="w-full h-full" />
    );

  const badge = impact
    ? `Impact · ${impact.label}`
    : solo !== null
    ? `Solo · ${solo === "base" ? "base effect" : `layer ${solo + 1}`}`
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
  // Start ready to edit: restore the autosaved draft, else the live config.
  const [cfg, setCfgRaw] = useState<EngineConfig>(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) return normalizeConfig(JSON.parse(raw));
    } catch { /* ignore corrupt draft */ }
    return normalizeConfig(CONFIG);
  });
  const [selected, setSelected] = useState<number>(0);
  const [search, setSearch] = useState("");
  const [solo, setSolo] = useState<SoloLayer>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // Undo / redo history (bounded, coalesced per 400ms burst of edits).
  const past = useRef<EngineConfig[]>([]);
  const future = useRef<EngineConfig[]>([]);
  const lastPush = useRef(0);
  const [, force] = useState(0);
  const setCfg = useCallback((next: EngineConfig | ((c: EngineConfig) => EngineConfig)) => {
    setCfgRaw((prev) => {
      const value = typeof next === "function" ? (next as (c: EngineConfig) => EngineConfig)(prev) : next;
      if (value === prev) return prev;
      const now = Date.now();
      if (now - lastPush.current > 400) {
        past.current = [...past.current.slice(-79), prev];
        future.current = [];
      }
      lastPush.current = now;
      return value;
    });
    force((n) => n + 1);
  }, []);
  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (!prev) return;
    setCfgRaw((c) => { future.current.push(c); return prev; });
    lastPush.current = 0;
    force((n) => n + 1);
  }, []);
  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next) return;
    setCfgRaw((c) => { past.current.push(c); return next; });
    lastPush.current = 0;
    force((n) => n + 1);
  }, []);

  // Autosave draft (debounced).
  useEffect(() => {
    const t = window.setTimeout(() => {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(cfg)); setSavedAt(Date.now()); } catch { /* quota */ }
    }, 600);
    return () => window.clearTimeout(t);
  }, [cfg]);

  // Keyboard: ⌘/Ctrl+Z undo, ⌘/Ctrl+Shift+Z or ⌘/Ctrl+Y redo, ⌘/Ctrl+F search.
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const k = e.key.toLowerCase();
      const typing = (e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.tagName === "TEXTAREA";
      if (k === "z" && !typing) { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
      else if (k === "y" && !typing) { e.preventDefault(); redo(); }
      else if (k === "f") { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);
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
    setCfg(normalizeConfig(CONFIG));
    setSelected(0);
  }, [setCfg]);

  const loadJSON = () => importRef.current?.click();
  const onImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        if (data?.meta && data?.video) {
          setCfg(normalizeConfig(data));
          setSelected(0);
        }
      } catch { /* ignore */ }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const saveJSON = (asTS = false) => {
    const data = serializeConfig(cfg, asTS);
    const blob = new Blob([data], { type: asTS ? "text/typescript" : "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(cfg.meta.title || "config").replace(/\s+/g, "-").toLowerCase()}.${asTS ? "ts" : "json"}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const applyToLive = () => {
    builderStore.set(normalizeConfig(cfg));
    navigate("/");
  };

  const summary = useMemo(() => `${slides.length} slide${slides.length === 1 ? "" : "s"}`, [slides.length]);
  const Divider = () => <span className="w-px h-5 bg-white/10 mx-1" />;
  const transitionDuration = (cfg.controls.transitionDuration ?? 0) / 1000;

  return (
    <div className="fixed inset-0 flex flex-col text-white">
      <BuilderAmbient />
      {/* Top bar */}
      <div className="relative z-10 flex items-center gap-2 px-4 py-2.5 border-b border-white/10 bg-zinc-950/85 backdrop-blur">

        <Link to="/" className="text-[11px] font-mono uppercase tracking-widest text-white/50 hover:text-white">← Live</Link>
        <span className="text-[11px] font-mono uppercase tracking-widest text-white/30 ml-2">Config Builder</span>
        <span className="text-[10px] font-mono text-white/40 ml-3">{summary}</span>
        <div className="flex-1" />
        <button className={btn} onClick={undo} disabled={past.current.length === 0} title="Undo (⌘Z)">↶</button>
        <button className={btn} onClick={redo} disabled={future.current.length === 0} title="Redo (⇧⌘Z)">↷</button>
        <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search options… (⌘F)"
          className="h-7 w-48 bg-white/[0.04] border border-white/10 rounded px-2.5 text-[11px] font-mono text-white/90 placeholder:text-white/30 outline-none focus:border-white/40" />
        <span className="text-[10px] font-mono text-white/30 w-20">{savedAt ? "draft saved" : ""}</span>
        <Divider />
        <button className={btn} onClick={() => { const c = normalizeConfig(CONFIG); c.video.playlist = []; setCfg(c); setSelected(-1); }}>New</button>
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
                <SlideEditor slide={current} transitionDuration={transitionDuration} search={search} onSolo={setSolo} onChange={(s) => updateSlide(selected, s)} />
              )}
              {view === "slide" && !current && (
                <div className="text-[12px] font-mono text-white/40 mt-20 text-center leading-relaxed">
                  Select a slide on the left, or<br />
                  <span className="text-white/30">add one with the buttons above.</span>
                </div>
              )}
              {view === "global" && <GlobalEditor cfg={cfg} search={search} onSolo={setSolo} onChange={setCfg} />}
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
        <LivePreview slide={current} transitionDuration={transitionDuration} solo={solo} />
      )}
    </div>
  );
};

export default Builder;
