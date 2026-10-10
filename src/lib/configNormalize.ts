/**
 * Normalises a working config into a *complete* EngineConfig.
 *
 * Every key that exists in the canonical template is present in the output.
 * Optional values that are not in use are written explicitly (null / "" /
 * false / []) instead of being dropped, so a saved file always describes the
 * full surface of the engine.
 */

import { CONFIG, type EngineConfig, type VideoItem, type SlideBackground, type EffectLayer, type VideoSource, type SlideTransition, type BackgroundConfig } from "@/engine/config";

type Dict = Record<string, unknown>;

const isPlainObject = (v: unknown): v is Dict =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** Deep-merge `value` over `template`, keeping every template key. */
function mergeShape<T>(template: T, value: unknown): T {
  if (!isPlainObject(template)) return (value === undefined ? template : (value as T));
  const src = isPlainObject(value) ? value : {};
  const out: Dict = {};
  for (const [k, tv] of Object.entries(template as Dict)) {
    const sv = src[k];
    if (Array.isArray(tv)) {
      out[k] = Array.isArray(sv) ? sv : tv;
    } else if (isPlainObject(tv)) {
      out[k] = mergeShape(tv, sv);
    } else {
      out[k] = sv === undefined ? tv : sv;
    }
  }
  // Preserve any extra keys the caller added (forward compatibility).
  for (const [k, sv] of Object.entries(src)) if (!(k in out)) out[k] = sv;
  return out as T;
}

export function normalizeLayer(layer: Partial<EffectLayer> | undefined): EffectLayer {
  return mergeShape(structuredClone(CONFIG.defaults.effectLayer), layer);
}

export function normalizeSource(source: Partial<VideoSource> | undefined): VideoSource {
  const out = mergeShape(structuredClone(CONFIG.defaults.videoSource), source);
  if (out.volume === undefined) (out as unknown as Dict).volume = null;
  return out;
}

export function normalizeBackground(bg: Partial<SlideBackground> | undefined): SlideBackground {
  const out = mergeShape(structuredClone(CONFIG.defaults.background), bg);
  out.effectLayers = (bg?.effectLayers ?? []).map(normalizeLayer);
  out.secondaryEffect = bg?.secondaryEffect ?? null;
  return out;
}

export function normalizeTransition(t: Partial<SlideTransition> | undefined | null): SlideTransition | null {
  if (!t) return null;
  return mergeShape(structuredClone(CONFIG.defaults.defaultTransition), t);
}

export function normalizeGlobalBackground(b: Partial<BackgroundConfig> | undefined): BackgroundConfig {
  return mergeShape<BackgroundConfig>(
    { type: "starfield", enabled: true, zIndex: 0, opacity: 1, blendMode: "source-over" },
    b,
  );
}

export function normalizeSlide(slide: Partial<VideoItem> | undefined): VideoItem {
  const s = (slide ?? {}) as Dict;
  const out: Dict = {
    src: typeof s.src === "string" ? s.src : "",
    loop: s.loop === true,
    muted: s.muted !== false,
    volume: s.volume === undefined ? null : s.volume,
    label: typeof s.label === "string" ? s.label : "",
    notes: typeof s.notes === "string" ? s.notes : "",
    script: typeof s.script === "string" ? s.script : "",
    targetSeconds: typeof s.targetSeconds === "number" && s.targetSeconds > 0 ? s.targetSeconds : null,
    transition: normalizeTransition(s.transition as SlideTransition | null | undefined),
    sources: Array.isArray(s.sources) ? s.sources.map((x) => normalizeSource(x as VideoSource)) : [],
    background: normalizeBackground(s.background as SlideBackground | undefined),
    autoAdvance: s.autoAdvance === "on" || s.autoAdvance === "off" ? s.autoAdvance : "inherit",
    autoAdvanceDelay: s.autoAdvanceDelay === undefined ? null : s.autoAdvanceDelay,
  };
  return out as unknown as VideoItem;
}

/**
 * Produce a complete EngineConfig: every section, every key, explicit nulls
 * for unused optional values.
 */
export function normalizeConfig(input: Partial<EngineConfig> | undefined): EngineConfig {
  const template = structuredClone(CONFIG);
  const merged = mergeShape(template, input) as EngineConfig;

  merged.meta = { ...merged.meta, tags: Array.isArray(merged.meta.tags) ? merged.meta.tags : [] };
  merged.defaults = {
    background: normalizeBackground(merged.defaults?.background),
    effectLayer: normalizeLayer(merged.defaults?.effectLayer),
    videoSource: normalizeSource(merged.defaults?.videoSource),
    defaultTransition: normalizeTransition(merged.defaults?.defaultTransition) ?? structuredClone(CONFIG.defaults.defaultTransition),
  };
  merged.backgrounds = (input?.backgrounds ?? merged.backgrounds ?? []).map(normalizeGlobalBackground);
  merged.video = {
    ...merged.video,
    playlist: (input?.video?.playlist ?? merged.video?.playlist ?? []).map(normalizeSlide),
  };

  return merged;
}

/** Serialise a complete config, stamping the updated timestamp. */
export function serializeConfig(cfg: EngineConfig, asTS: boolean): string {
  const full = normalizeConfig(cfg);
  full.meta = {
    ...full.meta,
    createdAt: full.meta.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const json = JSON.stringify(full, null, full.export?.minify ? 0 : 2);
  return asTS
    ? `/* Generated ${new Date().toISOString()} by the Aura config builder */\nexport const CONFIG = ${json} as const;\n`
    : json;
}
