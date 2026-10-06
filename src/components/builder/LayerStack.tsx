import { memo, useCallback, useMemo, useState } from "react";
import { CONFIG, type EffectLayer, type SlideBackground, type VideoItem } from "@/engine/config";
import { EFFECT_NAMES } from "@/engine/effectNames";
import { BACKGROUND_GROUPS, LAYER_GROUPS } from "@/lib/configSchema";
import { SchemaGroups, EFFECT_OPTIONS } from "./SchemaField";
import type { SoloLayer } from "./MiniStage";

const btn =
  "h-7 px-3 inline-flex items-center justify-center text-[11px] font-mono uppercase tracking-wider rounded border border-white/15 hover:border-white/40 hover:bg-white/5 text-white/80 transition";
const iconBtn =
  "w-6 h-6 inline-flex items-center justify-center text-[11px] rounded text-white/45 hover:text-white hover:bg-white/10 transition";

const newLayer = (type: string): EffectLayer => ({ ...structuredClone(CONFIG.defaults.effectLayer), type });

export interface LayerStackProps {
  bg: SlideBackground;
  slide: VideoItem;
  transitionDuration: number;
  search: string;
  onChange: (bg: SlideBackground) => void;
  onSolo: (solo: SoloLayer) => void;
  /** Hide slide-scoped impact peeks when editing defaults. */
  withImpact?: boolean;
}

export const LayerStack = memo(function LayerStack({
  bg, slide, transitionDuration, search, onChange, onSolo, withImpact = true,
}: LayerStackProps) {
  const [selected, setSelected] = useState<"base" | number>("base");
  const [picker, setPicker] = useState(false);
  const [muted, setMuted] = useState<Record<number, number>>({});

  const layers = bg.effectLayers ?? [];
  const setLayers = useCallback(
    (next: EffectLayer[]) => onChange({ ...bg, effectLayers: next }),
    [bg, onChange],
  );

  const addLayer = (type: string) => {
    setLayers([...layers, newLayer(type)]);
    setSelected(layers.length);
    setPicker(false);
  };
  const updLayer = (i: number, patch: Partial<EffectLayer>) =>
    setLayers(layers.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const delLayer = (i: number) => {
    setLayers(layers.filter((_, j) => j !== i));
    setSelected("base");
  };
  const dupLayer = (i: number) => {
    const next = [...layers];
    next.splice(i + 1, 0, structuredClone(next[i]));
    setLayers(next);
    setSelected(i + 1);
  };
  const moveLayer = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= layers.length) return;
    const next = [...layers];
    [next[i], next[j]] = [next[j], next[i]];
    setLayers(next);
    setSelected(j);
  };
  const toggleMute = (i: number) => {
    const l = layers[i];
    if (l.opacity > 0) {
      setMuted((m) => ({ ...m, [i]: l.opacity }));
      updLayer(i, { opacity: 0 });
    } else {
      updLayer(i, { opacity: muted[i] ?? 1 });
    }
  };
  const convertSecondary = () => {
    if (!bg.secondaryEffect) return;
    onChange({
      ...bg,
      secondaryEffect: null,
      effectLayers: [
        ...layers,
        { ...newLayer(bg.secondaryEffect), opacity: bg.secondaryOpacity, color: bg.secondaryColor || bg.color },
      ],
    });
    setSelected(layers.length);
  };

  const defaults = useMemo(() => CONFIG.defaults.effectLayer as unknown as Record<string, unknown>, []);
  const bgDefaults = useMemo(() => CONFIG.defaults.background as unknown as Record<string, unknown>, []);

  const groups = useMemo(() => {
    if (selected !== "base") return BACKGROUND_GROUPS;
    // Legacy secondary group gets a convert affordance rendered below.
    return BACKGROUND_GROUPS;
  }, [selected]);

  return (
    <div>
      <h3 className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/35 mb-1.5">
        Effect stack ({layers.length + 1})
      </h3>
      <p className="text-[10px] font-mono text-white/35 mb-2 leading-relaxed">
        The base effect renders first; each layer stacks on top with its own colour, blend and motion.
        Hover a card to preview that layer alone.
      </p>

      <div className="space-y-1 mb-4">
        <StackCard
          title={`Base · ${EFFECT_NAMES[bg.type] ?? bg.type}`}
          subtitle={`${bg.blendMode} · ${Math.round(bg.opacity * 100)}%`}
          active={selected === "base"}
          onSelect={() => setSelected("base")}
          onHover={(on) => onSolo(on ? "base" : null)}
        />
        {layers.map((l, i) => (
          <StackCard
            key={i}
            title={`${String(i + 1).padStart(2, "0")} · ${EFFECT_NAMES[l.type] ?? l.type}`}
            subtitle={`${l.blendMode} · ${Math.round(l.opacity * 100)}%`}
            active={selected === i}
            dimmed={l.opacity === 0}
            onSelect={() => setSelected(i)}
            onHover={(on) => onSolo(on ? i : null)}
            actions={
              <>
                <button className={iconBtn} title="Mute layer" onClick={() => toggleMute(i)}>{l.opacity === 0 ? "◌" : "◉"}</button>
                <button className={iconBtn} title="Move up" onClick={() => moveLayer(i, -1)}>↑</button>
                <button className={iconBtn} title="Move down" onClick={() => moveLayer(i, 1)}>↓</button>
                <button className={iconBtn} title="Duplicate" onClick={() => dupLayer(i)}>⧉</button>
                <button className={iconBtn + " hover:!text-red-400"} title="Delete" onClick={() => delLayer(i)}>✕</button>
              </>
            }
          />
        ))}
      </div>

      <div className="flex gap-2 mb-6">
        <button className={btn} onClick={() => setPicker((p) => !p)}>{picker ? "Close picker" : "+ Add effect layer"}</button>
        <button className={btn} onClick={() => addLayer(CONFIG.defaults.effectLayer.type)}>+ From defaults</button>
        {bg.secondaryEffect && (
          <button className={btn} onClick={convertSecondary}>Convert legacy → layer</button>
        )}
      </div>

      {picker && (
        <div className="mb-6 rounded-md border border-white/10 bg-black/40 p-2 max-h-64 overflow-y-auto">
          <div className="grid grid-cols-3 gap-1">
            {EFFECT_OPTIONS.map((o) => (
              <button
                key={o.value}
                onClick={() => addLayer(o.value)}
                className="text-left px-2 py-1.5 rounded text-[11px] font-mono text-white/70 hover:text-white hover:bg-white/10 truncate transition"
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-white/10 pt-4">
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/50 mb-3">
          {selected === "base"
            ? `Editing base effect · ${EFFECT_NAMES[bg.type] ?? bg.type}`
            : `Editing layer ${String((selected as number) + 1).padStart(2, "0")} · ${EFFECT_NAMES[layers[selected as number]?.type] ?? ""}`}
        </div>

        {selected === "base" ? (
          <SchemaGroups
            groups={groups}
            value={bg as unknown as Record<string, unknown>}
            defaults={bgDefaults}
            onPatch={(k, v) => onChange({ ...bg, [k]: v } as SlideBackground)}
            slide={withImpact ? slide : null}
            pathPrefix="background."
            transitionDuration={transitionDuration}
            search={search}
          />
        ) : (
          layers[selected as number] && (
            <SchemaGroups
              groups={LAYER_GROUPS}
              value={layers[selected as number] as unknown as Record<string, unknown>}
              defaults={defaults}
              onPatch={(k, v) => updLayer(selected as number, { [k]: v } as Partial<EffectLayer>)}
              slide={withImpact ? slide : null}
              pathPrefix={`background.effectLayers.${selected}.`}
              transitionDuration={transitionDuration}
              search={search}
            />
          )
        )}
      </div>
    </div>
  );
});

const StackCard = ({
  title, subtitle, active, dimmed, onSelect, onHover, actions,
}: {
  title: string;
  subtitle: string;
  active: boolean;
  dimmed?: boolean;
  onSelect: () => void;
  onHover: (on: boolean) => void;
  actions?: React.ReactNode;
}) => (
  <div
    onMouseEnter={() => onHover(true)}
    onMouseLeave={() => onHover(false)}
    onClick={onSelect}
    className={`flex items-center gap-2 px-2.5 py-1.5 rounded border cursor-pointer transition ${
      active ? "border-white/45 bg-white/10" : "border-white/10 hover:bg-white/5"
    } ${dimmed ? "opacity-45" : ""}`}
  >
    <span className="text-[11px] font-mono text-white/85 truncate flex-1">{title}</span>
    <span className="text-[10px] font-mono text-white/30 shrink-0">{subtitle}</span>
    <span className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>{actions}</span>
  </div>
);
