/**
 * Declarative schema for every field of EngineConfig.
 *
 * This is the single source of truth the Builder renders from: label, help
 * copy, control kind, range/step/unit, default value and (optionally) the A/B
 * "impact peek" variant. Anything present in `src/engine/config.ts` must have
 * an entry here — `src/lib/__tests__/configSchema.test.ts` enforces it.
 */

import { CONFIG, type EngineConfig } from "@/engine/config";
import type { ImpactVariant } from "@/components/builder/ImpactPreview";

export type FieldKind =
  | "text"
  | "number"
  | "slider"
  | "toggle"
  | "select"
  | "effect"        // effect picker (keys of backgroundRegistry)
  | "effectOrNone"  // effect picker with an explicit "none" entry
  | "hue"           // 0–360 hue string
  | "color"         // CSS color string
  | "rgb"           // "r,g,b" triplet
  | "gradient"      // raw CSS gradient
  | "cssFilter"     // raw CSS filter
  | "tags";         // string[]

export interface Option {
  value: string;
  label: string;
}

export interface FieldDef {
  /** Property name on the object being edited. */
  key: string;
  label: string;
  help: string;
  kind: FieldKind;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  options?: readonly Option[];
  placeholder?: string;
  /** Enables the ◐ A/B impact peek for slide-scoped fields. */
  impact?: ImpactVariant;
}

export interface GroupDef {
  title: string;
  fields: FieldDef[];
}

/* ── Shared option lists ─────────────────────────────── */

const opts = (...values: string[]): Option[] =>
  values.map((v) => ({ value: v, label: v === "" ? "(none)" : v.replace(/-/g, " ") }));

export const BLEND_MODES: GlobalCompositeOperation[] = [
  "source-over", "multiply", "screen", "overlay", "darken", "lighten",
  "color-dodge", "color-burn", "hard-light", "soft-light", "difference",
  "exclusion", "hue", "saturation", "color", "luminosity",
];

export const BLEND_OPTIONS: Option[] = BLEND_MODES.map((m) => ({
  value: m,
  label: m === "source-over" ? "normal" : m.replace(/-/g, " "),
}));

export const TRANSITION_OPTIONS: Option[] = [
  "fade", "wipeLeft", "wipeRight", "wipeUp", "wipeDown",
  "slideLeft", "slideRight", "slideUp", "slideDown",
  "zoomIn", "zoomOut", "zoomRotate",
  "flipX", "flipY", "blur", "dissolve", "iris",
  "swirl", "curtain", "glitch",
  "splitHorizontal", "splitVertical", "rotate", "bounce", "morph",
  "pixelate", "blinds", "diamond", "crossZoom", "doorway",
].map((v) => ({ value: v, label: v.replace(/([A-Z])/g, " $1").toLowerCase() }));

export const EASING_OPTIONS: Option[] = opts("linear", "ease", "ease-in", "ease-out", "ease-in-out");
export const COLOR_MODE_OPTIONS: Option[] = opts("solid", "gradient", "rainbow", "temperature");
export const FIT_OPTIONS: Option[] = [
  { value: "contain", label: "contain (letterbox)" },
  { value: "cover", label: "cover (crop)" },
];

/* ── Slide (VideoItem) ───────────────────────────────── */

export const SLIDE_GROUPS: GroupDef[] = [
  {
    title: "Main video",
    fields: [
      { key: "src", label: "Video URL", help: "Main video for this slide. Plays full-screen above the background effect. Leave empty for an effect-only slide.", kind: "text", placeholder: "https://…/clip.webm" },
      { key: "loop", label: "Loop", help: "Restart the main video forever. A looping slide never auto-advances on video end.", kind: "toggle" },
      { key: "muted", label: "Muted", help: "Silence only this slide's main video, whatever the global audio says.", kind: "toggle" },
      { key: "volume", label: "Volume", help: "Per-slide audio level, multiplied with the global volume.", kind: "slider", min: 0, max: 1, step: 0.05 },
    ],
  },
  {
    title: "Labelling",
    fields: [
      { key: "label", label: "Label", help: "Short title shown in the slide list and the jump bar. Cosmetic only.", kind: "text" },
    ],
  },
];

export const SLIDE_BEHAVIOR_FIELDS: FieldDef[] = [
  {
    key: "autoAdvance", label: "Auto-advance", kind: "select",
    help: "Override the global auto-advance for THIS slide. Inherit follows the global setting, On forces it even when global is off, Off pins the presentation here.",
    options: [
      { value: "inherit", label: "inherit global" },
      { value: "on", label: "on (force advance)" },
      { value: "off", label: "off (stay here)" },
    ],
  },
  { key: "autoAdvanceDelay", label: "Delay", help: "Seconds to wait before advancing this slide. 0 means use the global delay.", kind: "slider", min: 0, max: 120, step: 0.5, unit: "s" },
];

/* ── Slide background ────────────────────────────────── */

export const BACKGROUND_GROUPS: GroupDef[] = [
  {
    title: "Base effect",
    fields: [
      { key: "type", label: "Effect", help: "Which procedural effect renders behind the video. Each one has its own look.", kind: "effect" },
      { key: "color", label: "Hue", help: "Primary hue (0–360) used by the effect's particles, waves or gradients.", kind: "hue" },
      { key: "opacity", label: "Opacity", help: "How opaque the whole background layer is. Lower lets the base colour show through.", kind: "slider", min: 0, max: 1, step: 0.05, impact: { kind: "range01" } },
      { key: "blendMode", label: "Blend", help: "How the background blends with what is beneath. Screen brightens, multiply darkens.", kind: "select", options: BLEND_OPTIONS },
      { key: "saturation", label: "Saturation", help: "Colour intensity. 0 is greyscale, 100 is vivid.", kind: "slider", min: 0, max: 100, step: 1, unit: "%", impact: { kind: "range100" } },
      { key: "brightness", label: "Brightness", help: "Overall lightness of the effect.", kind: "slider", min: 0, max: 100, step: 1, unit: "%", impact: { kind: "range100" } },
      { key: "speed", label: "Speed", help: "Animation speed multiplier. 0 freezes it, 2 is twice as fast.", kind: "slider", min: 0, max: 4, step: 0.05, unit: "×", impact: { kind: "scalar" } },
      { key: "intensity", label: "Intensity", help: "Effect-specific strength: more particles, taller waves, stronger glow.", kind: "slider", min: 0, max: 100, step: 1, impact: { kind: "range100" } },
      { key: "scale", label: "Scale", help: "Zoom factor for the pattern. Above 1 enlarges, below 1 shrinks.", kind: "slider", min: 0.1, max: 4, step: 0.05, unit: "×", impact: { kind: "scalar" } },
      { key: "turbulence", label: "Turbulence", help: "How chaotic the motion is. 0 is smooth, 100 is jittery.", kind: "slider", min: 0, max: 100, step: 1, impact: { kind: "range100" } },
      { key: "direction", label: "Direction", help: "Primary motion angle. 0 points right, 90 points down.", kind: "slider", min: 0, max: 360, step: 1, unit: "°", impact: { kind: "range360" } },
    ],
  },
  {
    title: "Post-processing",
    fields: [
      { key: "backgroundGradient", label: "Base gradient", help: "CSS gradient drawn beneath the canvas effect.", kind: "gradient", placeholder: "linear-gradient(180deg, #000, #001)" },
      { key: "vignetteStrength", label: "Vignette", help: "Corner darkening. 0 is off, 1 is strong.", kind: "slider", min: 0, max: 1, step: 0.05, impact: { kind: "range01" } },
      { key: "vignetteColor", label: "Vignette colour", help: "Vignette tint as r,g,b. Default is black.", kind: "rgb" },
      { key: "colorFilter", label: "Colour filter", help: "CSS filter applied to the canvas.", kind: "cssFilter", placeholder: "hue-rotate(45deg) saturate(1.5)" },
      { key: "motionBlur", label: "Motion blur", help: "Frame-to-frame smear. Higher is dreamier.", kind: "slider", min: 0, max: 100, step: 1, impact: { kind: "range100" } },
      { key: "pixelate", label: "Pixelate", help: "Drops resolution for a retro look. 0 is off.", kind: "slider", min: 0, max: 32, step: 1, unit: "px", impact: { kind: "scalar" } },
      { key: "scanlines", label: "Scanlines", help: "Overlays horizontal CRT lines.", kind: "toggle", impact: { kind: "bool" } },
      { key: "scanlineIntensity", label: "Scanline strength", help: "How visible the scanline overlay is.", kind: "slider", min: 0, max: 100, step: 1 },
      { key: "filmGrain", label: "Film grain", help: "Animated grain noise on top of everything.", kind: "slider", min: 0, max: 100, step: 1, impact: { kind: "range100" } },
      { key: "transitionType", label: "Bg transition", help: "How this background swaps in when the slide changes.", kind: "select", options: opts("fade", "wipe", "zoom") },
    ],
  },
  {
    title: "Chroma key",
    fields: [
      { key: "chromaKey", label: "Key colour", help: "Colour to knock out, green-screen style. Empty disables it.", kind: "color" },
      { key: "chromaKeyThreshold", label: "Threshold", help: "How close a pixel must be to the key colour to be removed.", kind: "slider", min: 0, max: 100, step: 1 },
    ],
  },
  {
    title: "Legacy secondary layer",
    fields: [
      { key: "secondaryEffect", label: "2nd effect", help: "Older single-slot second effect. Prefer effect layers — use Convert to layer.", kind: "effectOrNone" },
      { key: "secondaryOpacity", label: "2nd opacity", help: "Transparency of the legacy secondary effect.", kind: "slider", min: 0, max: 1, step: 0.05, impact: { kind: "range01" } },
      { key: "secondaryColor", label: "2nd hue", help: "Hue (0–360) for the legacy secondary effect.", kind: "hue" },
    ],
  },
];

/** effectLayers is handled by the dedicated layer stack UI, not a plain row. */
export const BACKGROUND_MANAGED_KEYS = ["effectLayers"] as const;

/* ── Effect layer ────────────────────────────────────── */

export const LAYER_GROUPS: GroupDef[] = [
  {
    title: "Layer",
    fields: [
      { key: "type", label: "Effect", help: "Which procedural effect this stacked layer renders.", kind: "effect" },
      { key: "opacity", label: "Opacity", help: "Transparency of this individual layer.", kind: "slider", min: 0, max: 1, step: 0.05, impact: { kind: "range01" } },
      { key: "blendMode", label: "Blend", help: "How this layer blends with the layers beneath it.", kind: "select", options: BLEND_OPTIONS },
    ],
  },
  {
    title: "Colour",
    fields: [
      { key: "color", label: "Hue", help: "Primary hue (0–360) for this layer.", kind: "hue" },
      { key: "colorSecondary", label: "Hue 2", help: "Secondary hue used by gradient and two-tone modes.", kind: "hue" },
      { key: "colorMode", label: "Colour mode", help: "How colours are generated: one solid hue, a gradient, a rainbow sweep, or a temperature ramp.", kind: "select", options: COLOR_MODE_OPTIONS },
      { key: "saturation", label: "Saturation", help: "Colour intensity of this layer.", kind: "slider", min: 0, max: 100, step: 1, unit: "%", impact: { kind: "range100" } },
      { key: "brightness", label: "Brightness", help: "Overall lightness of this layer.", kind: "slider", min: 0, max: 100, step: 1, unit: "%", impact: { kind: "range100" } },
      { key: "invert", label: "Invert", help: "Invert this layer's colours.", kind: "toggle", impact: { kind: "bool" } },
    ],
  },
  {
    title: "Motion",
    fields: [
      { key: "speed", label: "Speed", help: "Animation speed multiplier for this layer.", kind: "slider", min: 0, max: 4, step: 0.05, unit: "×", impact: { kind: "scalar" } },
      { key: "intensity", label: "Intensity", help: "Effect-specific strength for this layer.", kind: "slider", min: 0, max: 100, step: 1, impact: { kind: "range100" } },
      { key: "scale", label: "Scale", help: "Zoom of this layer's pattern.", kind: "slider", min: 0.1, max: 4, step: 0.05, unit: "×", impact: { kind: "scalar" } },
      { key: "turbulence", label: "Turbulence", help: "How chaotic this layer's motion is.", kind: "slider", min: 0, max: 100, step: 1, impact: { kind: "range100" } },
      { key: "direction", label: "Direction", help: "Motion angle for this layer.", kind: "slider", min: 0, max: 360, step: 1, unit: "°", impact: { kind: "range360" } },
      { key: "rotation", label: "Rotation", help: "Rotate the whole layer.", kind: "slider", min: 0, max: 360, step: 1, unit: "°", impact: { kind: "range360" } },
      { key: "mirror", label: "Mirror", help: "Mirror this layer horizontally.", kind: "toggle", impact: { kind: "bool" } },
    ],
  },
  {
    title: "Detail",
    fields: [
      { key: "particleCount", label: "Particles", help: "How many particles or elements this layer spawns.", kind: "slider", min: 0, max: 2000, step: 10, impact: { kind: "scalar" } },
      { key: "blur", label: "Blur", help: "Softens the layer.", kind: "slider", min: 0, max: 40, step: 1, unit: "px", impact: { kind: "scalar" } },
      { key: "glow", label: "Glow", help: "Bloom around bright pixels.", kind: "slider", min: 0, max: 100, step: 1, impact: { kind: "range100" } },
      { key: "noiseAmount", label: "Noise", help: "Random noise sprinkled over the layer.", kind: "slider", min: 0, max: 100, step: 1, impact: { kind: "range100" } },
      { key: "decay", label: "Decay", help: "How quickly trails fade out.", kind: "slider", min: 0, max: 100, step: 1, impact: { kind: "range100" } },
    ],
  },
  {
    title: "Waveform",
    fields: [
      { key: "frequency", label: "Frequency", help: "Wave or pattern frequency.", kind: "slider", min: 0, max: 20, step: 0.1, impact: { kind: "scalar" } },
      { key: "amplitude", label: "Amplitude", help: "Wave or pattern height.", kind: "slider", min: 0, max: 100, step: 1, impact: { kind: "range100" } },
      { key: "phase", label: "Phase", help: "Wave phase offset.", kind: "slider", min: 0, max: 360, step: 1, unit: "°", impact: { kind: "range360" } },
    ],
  },
];

/* ── Video source ────────────────────────────────────── */

export const SOURCE_GROUPS: GroupDef[] = [
  {
    title: "Clip",
    fields: [
      { key: "src", label: "Video URL", help: "URL of this extra video clip.", kind: "text", placeholder: "https://…" },
      { key: "loop", label: "Loop", help: "Loop this clip when it reaches the end.", kind: "toggle" },
      { key: "muted", label: "Muted", help: "Mute this individual clip.", kind: "toggle" },
      { key: "volume", label: "Volume", help: "Volume of this individual clip.", kind: "slider", min: 0, max: 1, step: 0.05 },
      { key: "playbackRate", label: "Speed", help: "Playback speed for this clip. 1 is normal.", kind: "slider", min: 0.25, max: 3, step: 0.05, unit: "×", impact: { kind: "scalar" } },
      { key: "startTime", label: "Start", help: "Skip this many seconds into the clip.", kind: "slider", min: 0, max: 600, step: 0.1, unit: "s" },
      { key: "endTime", label: "End", help: "Stop at this timestamp. 0 plays to the end.", kind: "slider", min: 0, max: 600, step: 0.1, unit: "s" },
    ],
  },
  {
    title: "Placement",
    fields: [
      { key: "x", label: "X", help: "Left position as a percentage of slide width.", kind: "slider", min: 0, max: 100, step: 0.5, unit: "%", impact: { kind: "range100" } },
      { key: "y", label: "Y", help: "Top position as a percentage of slide height.", kind: "slider", min: 0, max: 100, step: 0.5, unit: "%", impact: { kind: "range100" } },
      { key: "width", label: "Width", help: "Width as a percentage of slide width.", kind: "slider", min: 0, max: 100, step: 0.5, unit: "%", impact: { kind: "range100" } },
      { key: "height", label: "Height", help: "Height as a percentage of slide height.", kind: "slider", min: 0, max: 100, step: 0.5, unit: "%", impact: { kind: "range100" } },
      { key: "fit", label: "Fit", help: "How the video fills its box.", kind: "select", options: FIT_OPTIONS, impact: { kind: "select", a: "contain", b: "cover" } },
      { key: "zIndex", label: "Stack order", help: "Higher numbers render on top of lower ones.", kind: "number", step: 1 },
      { key: "rotation", label: "Rotation", help: "Rotate this clip.", kind: "slider", min: 0, max: 360, step: 1, unit: "°", impact: { kind: "range360" } },
    ],
  },
  {
    title: "Appearance",
    fields: [
      { key: "opacity", label: "Opacity", help: "Transparency of this clip.", kind: "slider", min: 0, max: 1, step: 0.05, impact: { kind: "range01" } },
      { key: "blendMode", label: "Blend", help: "How this clip blends with layers beneath it.", kind: "select", options: BLEND_OPTIONS },
      { key: "borderRadius", label: "Corner radius", help: "Rounded corners, in pixels.", kind: "slider", min: 0, max: 200, step: 1, unit: "px", impact: { kind: "scalar" } },
      { key: "filter", label: "Filter", help: "CSS filter applied to this clip.", kind: "cssFilter", placeholder: "blur(2px) brightness(1.2)" },
      { key: "shadow", label: "Shadow", help: "CSS box-shadow for this clip.", kind: "text", placeholder: "0 0 20px rgba(0,0,0,0.5)" },
    ],
  },
  {
    title: "Chroma key",
    fields: [
      { key: "chromaKey", label: "Key colour", help: "Colour to remove from this clip. Empty disables it.", kind: "color" },
      { key: "chromaKeyThreshold", label: "Threshold", help: "Tolerance for the chroma-key match.", kind: "slider", min: 0, max: 100, step: 1 },
    ],
  },
  {
    title: "Crop",
    fields: [
      { key: "cropTop", label: "Crop top", help: "Trim pixels from the top edge.", kind: "slider", min: 0, max: 500, step: 1, unit: "px" },
      { key: "cropBottom", label: "Crop bottom", help: "Trim pixels from the bottom edge.", kind: "slider", min: 0, max: 500, step: 1, unit: "px" },
      { key: "cropLeft", label: "Crop left", help: "Trim pixels from the left edge.", kind: "slider", min: 0, max: 500, step: 1, unit: "px" },
      { key: "cropRight", label: "Crop right", help: "Trim pixels from the right edge.", kind: "slider", min: 0, max: 500, step: 1, unit: "px" },
    ],
  },
];

/* ── Transition ──────────────────────────────────────── */

export const TRANSITION_FIELDS: FieldDef[] = [
  { key: "type", label: "Type", help: "Animation used when leaving this slide.", kind: "select", options: TRANSITION_OPTIONS },
  { key: "duration", label: "Duration", help: "How long the transition takes. Lower is snappier.", kind: "slider", min: 0, max: 5, step: 0.05, unit: "s", impact: { kind: "scalar" } },
  { key: "easing", label: "Easing", help: "Speed curve. ease-out feels natural, linear feels mechanical.", kind: "select", options: EASING_OPTIONS },
];

/* ── Global overlay background ───────────────────────── */

export const GLOBAL_BG_FIELDS: FieldDef[] = [
  { key: "type", label: "Effect", help: "Effect rendered across every slide as a global overlay.", kind: "effect" },
  { key: "enabled", label: "Enabled", help: "Turn this global overlay on or off.", kind: "toggle" },
  { key: "zIndex", label: "Stack order", help: "Where it sits relative to the per-slide background and the video.", kind: "number", step: 1 },
  { key: "opacity", label: "Opacity", help: "Transparency of the global overlay.", kind: "slider", min: 0, max: 1, step: 0.05 },
  { key: "blendMode", label: "Blend", help: "How the overlay blends with the slide content.", kind: "select", options: BLEND_OPTIONS },
];

/* ── Global config sections ──────────────────────────── */

export interface SectionDef {
  id: string;
  title: string;
  /** Path on EngineConfig, e.g. "meta" or "video". */
  path: keyof EngineConfig;
  groups: GroupDef[];
}

export const GLOBAL_SECTIONS: SectionDef[] = [
  {
    id: "meta", title: "Project", path: "meta",
    groups: [{
      title: "Details",
      fields: [
        { key: "title", label: "Title", help: "Name of this presentation. Used for the saved file name.", kind: "text" },
        { key: "version", label: "Version", help: "Free-form version string for your own tracking.", kind: "text" },
        { key: "author", label: "Author", help: "Who made this presentation.", kind: "text" },
        { key: "description", label: "Description", help: "One-line summary of the presentation.", kind: "text" },
        { key: "tags", label: "Tags", help: "Comma-separated keywords for your own organisation.", kind: "tags" },
        { key: "category", label: "Category", help: "Free-form category label.", kind: "text" },
        { key: "language", label: "Language", help: "Language code, e.g. en.", kind: "text" },
        { key: "license", label: "License", help: "License note stored with the config.", kind: "text" },
        { key: "projectUrl", label: "Project URL", help: "Link back to the source project or site.", kind: "text" },
        { key: "coverImage", label: "Cover image", help: "URL of a cover image for this deck.", kind: "text" },
        { key: "thumbnail", label: "Thumbnail", help: "URL of a small thumbnail for this deck.", kind: "text" },
        { key: "createdAt", label: "Created", help: "Creation timestamp. Filled in automatically on save.", kind: "text" },
        { key: "updatedAt", label: "Updated", help: "Last-saved timestamp. Filled in automatically on save.", kind: "text" },
      ],
    }],
  },
  {
    id: "video", title: "Playback", path: "video",
    groups: [{
      title: "Video defaults",
      fields: [
        { key: "fit", label: "Video fit", help: "Default sizing for the main video on every slide.", kind: "select", options: FIT_OPTIONS },
        { key: "controls", label: "Native controls", help: "Show the browser's own video controls.", kind: "toggle" },
        { key: "bgColor", label: "Backdrop", help: "Colour shown behind letterboxed video.", kind: "color" },
        { key: "globalVolume", label: "Global volume", help: "Master volume applied on top of per-slide volume.", kind: "slider", min: 0, max: 1, step: 0.05 },
        { key: "preloadStrategy", label: "Preload", help: "How aggressively videos are fetched ahead of time.", kind: "select", options: opts("none", "next", "all") },
        { key: "bufferSize", label: "Buffer", help: "How many upcoming videos to keep buffered.", kind: "slider", min: 0, max: 20, step: 1 },
      ],
    }],
  },
  {
    id: "controls", title: "Controls", path: "controls",
    groups: [
      {
        title: "Navigation",
        fields: [
          { key: "arrowNavigation", label: "Arrow keys", help: "Move between slides with the left and right arrow keys.", kind: "toggle" },
          { key: "swipeNavigation", label: "Swipe", help: "Swipe left or right on touch screens to change slide.", kind: "toggle" },
          { key: "clickNavigation", label: "Click", help: "Click anywhere on the slide to advance.", kind: "toggle" },
          { key: "scrollNavigation", label: "Scroll", help: "Scroll the mouse wheel to change slide.", kind: "toggle" },
          { key: "keyboardShortcutsEnabled", label: "Keyboard shortcuts", help: "Master switch for every keyboard shortcut.", kind: "toggle" },
          { key: "gestureZoom", label: "Pinch zoom", help: "Allow pinch-to-zoom gestures on touch screens.", kind: "toggle" },
          { key: "doubleTapAction", label: "Double tap", help: "What a double tap does.", kind: "select", options: opts("fullscreen", "next", "none") },
          { key: "fullscreenEnabled", label: "Fullscreen key", help: "Allow the F key to toggle fullscreen.", kind: "toggle" },
        ],
      },
      {
        title: "Playback",
        fields: [
          { key: "autoPlayFirst", label: "Auto-play first", help: "Start playing as soon as the presentation opens.", kind: "toggle" },
          { key: "autoAdvance", label: "Auto-advance", help: "Move to the next slide automatically. Individual slides can override this.", kind: "toggle" },
          { key: "autoAdvanceDelay", label: "Advance delay", help: "Seconds to wait before advancing.", kind: "slider", min: 0, max: 120, step: 0.5, unit: "s" },
          { key: "loopPlaylist", label: "Loop deck", help: "Jump back to slide 1 after the last slide.", kind: "toggle" },
          { key: "pauseOnHover", label: "Pause on hover", help: "Pause playback while the pointer rests on the slide.", kind: "toggle" },
          { key: "transitionDuration", label: "Transition length", help: "Default transition length in milliseconds.", kind: "slider", min: 0, max: 5000, step: 50, unit: "ms" },
          { key: "randomTransitions", label: "Random transitions", help: "Pick a random transition for each slide change.", kind: "toggle" },
        ],
      },
      {
        title: "On-screen UI",
        fields: [
          { key: "showSlideNumber", label: "Slide number", help: "Show the current slide number.", kind: "toggle" },
          { key: "showProgressBar", label: "Progress bar", help: "Show a progress bar along the deck.", kind: "toggle" },
          { key: "idleHideUI", label: "Hide when idle", help: "Fade the interface out when the pointer stops moving.", kind: "toggle" },
          { key: "idleTimeout", label: "Idle delay", help: "Milliseconds of stillness before the interface hides.", kind: "slider", min: 0, max: 20000, step: 250, unit: "ms" },
        ],
      },
      {
        title: "Extra pages",
        fields: [
          { key: "builderEnabled", label: "Builder page", help: "Allow the /builder page to open.", kind: "toggle" },
          { key: "previewPageEnabled", label: "Preview page", help: "Allow the /preview gallery page to open.", kind: "toggle" },
          { key: "remoteEnabled", label: "Remote control", help: "Allow the phone/tablet remote and the presenter link.", kind: "toggle" },
        ],
      },
    ],
  },
  {
    id: "audio", title: "Audio", path: "audio",
    groups: [{
      title: "Audio",
      fields: [
        { key: "enabled", label: "Audio enabled", help: "Master switch for all sound.", kind: "toggle" },
        { key: "globalMute", label: "Mute everything", help: "Silence the whole presentation without changing volumes.", kind: "toggle" },
        { key: "volume", label: "Volume", help: "Master audio level.", kind: "slider", min: 0, max: 1, step: 0.05 },
        { key: "fadeIn", label: "Fade in", help: "Ramp the volume up when a slide starts.", kind: "toggle" },
        { key: "fadeInDuration", label: "Fade in length", help: "Milliseconds of fade-in.", kind: "slider", min: 0, max: 5000, step: 50, unit: "ms" },
        { key: "fadeOut", label: "Fade out", help: "Ramp the volume down when a slide ends.", kind: "toggle" },
        { key: "fadeOutDuration", label: "Fade out length", help: "Milliseconds of fade-out.", kind: "slider", min: 0, max: 5000, step: 50, unit: "ms" },
        { key: "crossfade", label: "Crossfade", help: "Overlap the audio of consecutive slides.", kind: "toggle" },
        { key: "crossfadeDuration", label: "Crossfade length", help: "Milliseconds of overlap.", kind: "slider", min: 0, max: 5000, step: 50, unit: "ms" },
      ],
    }],
  },
  {
    id: "theme", title: "Theme", path: "theme",
    groups: [{
      title: "Interface theme",
      fields: [
        { key: "primaryColor", label: "Primary", help: "Primary interface colour.", kind: "color" },
        { key: "secondaryColor", label: "Secondary", help: "Secondary interface colour.", kind: "color" },
        { key: "accentColor", label: "Accent", help: "Accent colour for highlights.", kind: "color" },
        { key: "fontFamily", label: "Font", help: "Font family used by on-screen interface text.", kind: "text" },
        { key: "uiOpacity", label: "UI opacity", help: "Transparency of on-screen controls.", kind: "slider", min: 0, max: 1, step: 0.05 },
        { key: "uiPosition", label: "UI corner", help: "Which corner the on-screen controls sit in.", kind: "select", options: opts("top-right", "top-left", "bottom-right", "bottom-left") },
        { key: "darkMode", label: "Dark mode", help: "Use the dark interface palette.", kind: "toggle" },
      ],
    }],
  },
  {
    id: "performance", title: "Performance", path: "performance",
    groups: [{
      title: "Rendering",
      fields: [
        { key: "maxFPS", label: "Max FPS", help: "Cap the animation frame rate to save power.", kind: "slider", min: 10, max: 120, step: 1 },
        { key: "resolution", label: "Render scale", help: "Canvas resolution multiplier. Below 1 renders softer but faster.", kind: "slider", min: 0.25, max: 2, step: 0.05, unit: "×" },
        { key: "maxParticles", label: "Particle cap", help: "Upper limit on particles across all effects.", kind: "slider", min: 0, max: 5000, step: 50 },
        { key: "enableGPU", label: "GPU acceleration", help: "Let the browser hardware-accelerate the canvas.", kind: "toggle" },
        { key: "enableBloom", label: "Bloom", help: "Extra glow pass. Pretty, but costly.", kind: "toggle" },
        { key: "antialiasing", label: "Antialiasing", help: "Smooth jagged edges.", kind: "toggle" },
      ],
    }],
  },
  {
    id: "watermark", title: "Watermark", path: "watermark",
    groups: [
      {
        title: "Watermark",
        fields: [
          { key: "enabled", label: "Enabled", help: "Show a watermark on every slide.", kind: "toggle" },
          { key: "mode", label: "Mode", help: "Show text or an image.", kind: "select", options: opts("text", "image") },
          { key: "text", label: "Text", help: "Watermark text, used in text mode.", kind: "text" },
          { key: "color", label: "Text colour", help: "Colour of the watermark text.", kind: "color" },
          { key: "fontSize", label: "Font size", help: "Watermark text size in pixels.", kind: "slider", min: 6, max: 120, step: 1, unit: "px" },
          { key: "imageUrl", label: "Image URL", help: "Watermark image, used in image mode.", kind: "text" },
          { key: "imageWidth", label: "Image width", help: "Watermark image width in pixels.", kind: "slider", min: 0, max: 1000, step: 1, unit: "px" },
          { key: "imageHeight", label: "Image height", help: "Watermark image height in pixels.", kind: "slider", min: 0, max: 1000, step: 1, unit: "px" },
        ],
      },
      {
        title: "Position",
        fields: [
          { key: "position", label: "Anchor", help: "Where the watermark sits. Choose custom to use the X and Y values.", kind: "select", options: opts("top-left", "top-right", "bottom-left", "bottom-right", "center", "custom") },
          { key: "x", label: "X", help: "Horizontal position as a percentage, used with the custom anchor.", kind: "slider", min: 0, max: 100, step: 0.5, unit: "%" },
          { key: "y", label: "Y", help: "Vertical position as a percentage, used with the custom anchor.", kind: "slider", min: 0, max: 100, step: 0.5, unit: "%" },
          { key: "opacity", label: "Opacity", help: "Transparency of the watermark.", kind: "slider", min: 0, max: 1, step: 0.05 },
          { key: "rotation", label: "Rotation", help: "Rotate the watermark.", kind: "slider", min: 0, max: 360, step: 1, unit: "°" },
        ],
      },
    ],
  },
  {
    id: "accessibility", title: "Accessibility", path: "accessibility",
    groups: [{
      title: "Accessibility",
      fields: [
        { key: "reducedMotion", label: "Reduced motion", help: "Calm down animation for viewers sensitive to movement.", kind: "toggle" },
        { key: "highContrast", label: "High contrast", help: "Boost interface contrast.", kind: "toggle" },
        { key: "screenReaderAnnouncements", label: "Screen reader", help: "Announce slide changes to screen readers.", kind: "toggle" },
        { key: "focusIndicators", label: "Focus rings", help: "Show visible focus outlines when navigating by keyboard.", kind: "toggle" },
      ],
    }],
  },
  {
    id: "export", title: "Export", path: "export",
    groups: [{
      title: "Saved file",
      fields: [
        { key: "format", label: "Format", help: "Preferred file format when saving this config.", kind: "select", options: opts("json", "ts") },
        { key: "minify", label: "Minify", help: "Write the file without indentation.", kind: "toggle" },
        { key: "includeAssets", label: "Include assets", help: "Bundle referenced assets alongside the config.", kind: "toggle" },
        { key: "embedVideos", label: "Embed videos", help: "Inline video data instead of linking to it. Produces very large files.", kind: "toggle" },
      ],
    }],
  },
];

/* ── Defaults for reset-to-default ───────────────────── */

export const DEFAULT_SLIDE_BACKGROUND = CONFIG.defaults.background;
export const DEFAULT_EFFECT_LAYER = CONFIG.defaults.effectLayer;
export const DEFAULT_VIDEO_SOURCE = CONFIG.defaults.videoSource;
export const DEFAULT_TRANSITION = CONFIG.defaults.defaultTransition;

/** Every field def in the schema, flattened — used by the coverage test. */
export function allFieldKeys(groups: GroupDef[]): string[] {
  return groups.flatMap((g) => g.fields.map((f) => f.key));
}
