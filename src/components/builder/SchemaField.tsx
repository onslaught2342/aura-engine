import { memo, useMemo } from "react";
import type { VideoItem } from "@/engine/config";
import type { FieldDef, GroupDef } from "@/lib/configSchema";
import { backgroundRegistry } from "@/engine/backgrounds/registry";
import { EFFECT_NAMES } from "@/engine/effectNames";
import { HelpDot } from "./HelpDot";
import { ImpactPeek } from "./ImpactPreview";

export const EFFECT_KEYS = Object.keys(backgroundRegistry);
export const EFFECT_OPTIONS = EFFECT_KEYS
  .map((k) => ({ value: k, label: EFFECT_NAMES[k] ?? k }))
  .sort((a, b) => a.label.localeCompare(b.label));

const inputCls =
  "w-full bg-white/[0.04] border border-white/10 rounded px-2.5 py-1.5 text-xs font-mono text-white/90 placeholder:text-white/25 outline-none focus:border-white/40 focus:bg-white/[0.07] transition-colors";

/* ── Primitive controls ──────────────────────────────── */

const SliderInput = ({ value, def, onChange }: { value: number; def: FieldDef; onChange: (v: number) => void }) => {
  const min = def.min ?? 0;
  const max = def.max ?? 100;
  const step = def.step ?? 1;
  const n = Number.isFinite(value) ? value : min;
  return (
    <div className="flex items-center gap-2">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={Math.min(max, Math.max(min, n))}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 h-1 accent-white/80 cursor-pointer"
      />
      <input
        type="number"
        value={n}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          onChange(Number.isFinite(v) ? v : min);
        }}
        className="w-[4.5rem] shrink-0 bg-white/[0.04] border border-white/10 rounded px-1.5 py-1 text-[11px] font-mono text-white/90 outline-none focus:border-white/40"
      />
      {def.unit && <span className="text-[10px] font-mono text-white/30 w-4 shrink-0">{def.unit}</span>}
    </div>
  );
};

const HueInput = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const numeric = /^-?\d+(\.\d+)?$/.test(String(value ?? "").trim());
  const n = numeric ? parseFloat(value) : 0;
  return (
    <div className="flex items-center gap-2">
      {numeric ? (
        <>
          <input
            type="range"
            min={0}
            max={360}
            step={1}
            value={((n % 360) + 360) % 360}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 h-2 cursor-pointer appearance-none rounded"
            style={{
              background:
                "linear-gradient(90deg, hsl(0 80% 55%), hsl(60 80% 55%), hsl(120 80% 55%), hsl(180 80% 55%), hsl(240 80% 55%), hsl(300 80% 55%), hsl(360 80% 55%))",
            }}
          />
          <span
            className="w-5 h-5 rounded-full border border-white/20 shrink-0"
            style={{ background: `hsl(${n} 80% 55%)` }}
          />
        </>
      ) : (
        <input type="text" value={value ?? ""} onChange={(e) => onChange(e.target.value)} className={inputCls} />
      )}
      <input
        type="text"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-[5.5rem] shrink-0 bg-white/[0.04] border border-white/10 rounded px-1.5 py-1 text-[11px] font-mono text-white/90 outline-none focus:border-white/40"
      />
    </div>
  );
};

const ColorInput = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(value ?? "").trim()) ? value : "#000000";
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={hex}
        onChange={(e) => onChange(e.target.value)}
        className="w-8 h-7 shrink-0 rounded border border-white/15 bg-transparent cursor-pointer"
        aria-label="Colour picker"
      />
      <input type="text" value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder="#000000 or empty" className={inputCls} />
    </div>
  );
};

const ToggleInput = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
  <button
    type="button"
    role="switch"
    aria-checked={!!value}
    onClick={() => onChange(!value)}
    className={`relative w-9 h-5 rounded-full border transition ${value ? "bg-white/80 border-white/80" : "bg-white/5 border-white/20"}`}
  >
    <span
      className={`absolute top-[2px] h-[14px] w-[14px] rounded-full transition-all ${value ? "left-[20px] bg-zinc-900" : "left-[2px] bg-white/60"}`}
    />
  </button>
);

/* ── Field control dispatcher ────────────────────────── */

export interface FieldControlProps {
  def: FieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
}

export const FieldControl = memo(function FieldControl({ def, value, onChange }: FieldControlProps) {
  switch (def.kind) {
    case "toggle":
      return <ToggleInput value={value === true} onChange={onChange} />;
    case "slider":
      return <SliderInput def={def} value={typeof value === "number" ? value : Number(value) || 0} onChange={onChange} />;
    case "number":
      return (
        <input
          type="number"
          step={def.step ?? 1}
          value={typeof value === "number" ? value : 0}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className={inputCls}
        />
      );
    case "hue":
      return <HueInput value={String(value ?? "")} onChange={onChange} />;
    case "color":
      return <ColorInput value={String(value ?? "")} onChange={onChange} />;
    case "rgb":
      return (
        <input type="text" value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} placeholder="0,0,0" className={inputCls} />
      );
    case "tags":
      return (
        <input
          type="text"
          value={Array.isArray(value) ? value.join(", ") : ""}
          onChange={(e) => onChange(e.target.value.split(",").map((t) => t.trim()).filter(Boolean))}
          placeholder="tag, tag"
          className={inputCls}
        />
      );
    case "effect":
    case "effectOrNone": {
      const options = def.kind === "effectOrNone" ? [{ value: "", label: "(none)" }, ...EFFECT_OPTIONS] : EFFECT_OPTIONS;
      return (
        <select
          value={String(value ?? "")}
          onChange={(e) => onChange(def.kind === "effectOrNone" ? (e.target.value || null) : e.target.value)}
          className={inputCls}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value} className="bg-zinc-900">{o.label}</option>
          ))}
        </select>
      );
    }
    case "select":
      return (
        <select value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} className={inputCls}>
          {(def.options ?? []).map((o) => (
            <option key={o.value} value={o.value} className="bg-zinc-900">{o.label}</option>
          ))}
        </select>
      );
    default:
      return (
        <input
          type="text"
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          placeholder={def.placeholder}
          className={inputCls}
        />
      );
  }
});

/* ── Row ─────────────────────────────────────────────── */

export interface FieldRowProps {
  def: FieldDef;
  value: unknown;
  defaultValue?: unknown;
  onChange: (v: unknown) => void;
  /** Slide used to render the ◐ A/B impact preview. */
  slide?: VideoItem | null;
  /** Dot-path prefix within the slide, e.g. "background." */
  pathPrefix?: string;
  transitionDuration?: number;
}

export const FieldRow = memo(function FieldRow({
  def, value, defaultValue, onChange, slide, pathPrefix = "", transitionDuration = 0.5,
}: FieldRowProps) {
  const changed = defaultValue !== undefined && JSON.stringify(value) !== JSON.stringify(defaultValue);
  return (
    <div className="py-1.5 border-b border-white/[0.05] last:border-b-0">
      <div className="grid grid-cols-[9.5rem_1fr] gap-3 items-center">
        <label className="text-[10px] font-mono uppercase tracking-wider text-white/50 flex items-center min-w-0">
          <span className="truncate">{def.label}</span>
          <HelpDot text={def.help} />
          {def.impact && slide && (
            <ImpactPeek
              slide={slide}
              path={`${pathPrefix}${def.key}`}
              variant={def.impact}
              current={value}
              transitionDuration={transitionDuration}
              label={def.label}
            />
          )}
          {changed && (
            <button
              type="button"
              title="Reset to default"
              onClick={() => onChange(defaultValue)}
              className="ml-1 text-[10px] text-amber-300/70 hover:text-amber-200"
            >
              ↺
            </button>
          )}
        </label>
        <div className="min-w-0">
          <FieldControl def={def} value={value} onChange={onChange} />
        </div>
      </div>
    </div>
  );
});

/* ── Group renderer ──────────────────────────────────── */

export interface SchemaGroupsProps {
  groups: GroupDef[];
  value: Record<string, unknown>;
  defaults?: Record<string, unknown>;
  onPatch: (key: string, v: unknown) => void;
  slide?: VideoItem | null;
  pathPrefix?: string;
  transitionDuration?: number;
  /** Lowercase search string; hides non-matching rows. */
  search?: string;
}

export const SchemaGroups = memo(function SchemaGroups({
  groups, value, defaults, onPatch, slide, pathPrefix, transitionDuration, search = "",
}: SchemaGroupsProps) {
  const q = search.trim().toLowerCase();
  const visible = useMemo(
    () =>
      groups
        .map((g) => ({
          ...g,
          fields: q
            ? g.fields.filter(
                (f) =>
                  f.label.toLowerCase().includes(q) ||
                  f.key.toLowerCase().includes(q) ||
                  f.help.toLowerCase().includes(q),
              )
            : g.fields,
        }))
        .filter((g) => g.fields.length > 0),
    [groups, q],
  );

  if (visible.length === 0) {
    return <p className="text-[11px] font-mono text-white/30 py-6 text-center">No options match “{search}”.</p>;
  }

  return (
    <>
      {visible.map((g) => (
        <section key={g.title} className="mb-5">
          <h3 className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/35 mb-1.5">{g.title}</h3>
          <div className="rounded-md border border-white/[0.07] bg-white/[0.015] px-3">
            {g.fields.map((f) => (
              <FieldRow
                key={f.key}
                def={f}
                value={value?.[f.key]}
                defaultValue={defaults?.[f.key]}
                onChange={(v) => onPatch(f.key, v)}
                slide={slide}
                pathPrefix={pathPrefix}
                transitionDuration={transitionDuration}
              />
            ))}
          </div>
        </section>
      ))}
    </>
  );
});

export const builderInputCls = inputCls;
