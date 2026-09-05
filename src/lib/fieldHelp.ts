/**
 * Centralized help copy for every Builder field. Keys are dot-paths so each
 * editor row can pull a single source of truth. Keep entries short — one or
 * two sentences max, plain language, no jargon. The Row component renders a
 * "?" glyph that opens this string in a tooltip.
 */
export const FIELD_HELP: Record<string, string> = {
  // ── Slide / video ─────────────────────────────────────
  "slide.src": "Main video URL for this slide. Plays full-screen as the foreground layer above the background effect.",
  "slide.label": "Short title shown in the slide list and the slide-jump bar. Purely cosmetic.",
  "slide.notes": "Internal notes for this slide. Never shown to viewers.",
  "slide.loop": "When on, the main video restarts forever and the slide never auto-advances on video end.",
  "slide.muted": "Silences only this slide's main video, regardless of global audio.",
  "slide.volume": "Per-slide audio level. Multiplied with the global volume.",
  "slide.autoAdvance": "Override the global auto-advance for THIS slide. 'Inherit' follows the global setting, 'On' forces advance, 'Off' freezes here.",
  "slide.autoAdvanceDelay": "Per-slide delay (seconds) before advancing. Leave empty to use the global delay.",

  // ── Transition ───────────────────────────────────────
  "transition.type": "Animation used when leaving this slide. Different transitions feel faster or more dramatic.",
  "transition.duration": "How long the transition takes, in seconds. Lower = snappier, higher = cinematic.",
  "transition.easing": "Speed curve of the transition. 'ease-out' feels natural, 'linear' is mechanical.",

  // ── Background effect ────────────────────────────────
  "bg.type": "Which procedural effect renders behind the video. Each effect has a unique look.",
  "bg.color": "Primary hue (0–360) used by the effect's particles, waves, or gradients.",
  "bg.opacity": "How opaque the entire background layer is. Lower lets the video bgColor show through.",
  "bg.blendMode": "How the background blends with whatever is beneath it. 'screen' brightens, 'multiply' darkens.",
  "bg.saturation": "Color intensity of the effect, 0–100. 0 = grayscale, 100 = vivid.",
  "bg.brightness": "Overall lightness of the effect, 0–100.",
  "bg.speed": "Animation speed multiplier. 0 = frozen, 1 = normal, 2 = twice as fast.",
  "bg.intensity": "Effect-specific strength: more particles, taller waves, stronger glow — depending on effect.",
  "bg.scale": "Zoom factor for the effect's pattern. >1 enlarges, <1 shrinks.",
  "bg.turbulence": "How chaotic the motion is. 0 = smooth/regular, 100 = jittery/noisy.",
  "bg.direction": "Primary motion angle (0–360°). 0 = right, 90 = down.",

  // ── Secondary layer (legacy) ─────────────────────────
  "bg.secondaryEffect": "Optional second effect layered on top of the primary. Use 'none' to disable.",
  "bg.secondaryOpacity": "Transparency of the secondary effect.",
  "bg.secondaryColor": "Hue (0–360) for the secondary layer.",

  // ── Filters & overlays ───────────────────────────────
  "bg.backgroundGradient": "Raw CSS gradient drawn beneath the canvas effect. Example: linear-gradient(180deg, #000, #001).",
  "bg.vignetteStrength": "Darkening at the corners. 0 = off, 1 = strong.",
  "bg.vignetteColor": "Vignette tint as 'r,g,b'. Default black.",
  "bg.colorFilter": "CSS filter string applied to the canvas. Example: hue-rotate(45deg) saturate(1.5).",
  "bg.motionBlur": "Frame-to-frame blur amount. Higher = more streaky/dreamy.",
  "bg.pixelate": "Reduces resolution for a retro pixel look. 0 = off.",
  "bg.scanlines": "Overlays horizontal CRT-style lines.",
  "bg.scanlineIntensity": "Strength of the scanline overlay.",
  "bg.filmGrain": "Animated film-grain noise overlay.",
  "bg.chromaKey": "Hex color to knock out (green-screen style). Empty = disabled.",
  "bg.chromaKeyThreshold": "How close a pixel must be to the chroma color to be removed.",

  // ── Effect layer (multi-effect stack) ────────────────
  "layer.type": "Which procedural effect this stacked layer renders.",
  "layer.opacity": "Transparency of this individual layer.",
  "layer.blendMode": "Blend mode for this layer against the layers beneath.",
  "layer.color": "Primary hue (0–360) for this layer.",
  "layer.colorSecondary": "Secondary hue for gradient/two-tone modes.",
  "layer.colorMode": "How colors are generated: solid, gradient, rainbow, or temperature.",
  "layer.intensity": "Effect-specific strength.",
  "layer.scale": "Zoom of the pattern.",
  "layer.turbulence": "Motion chaos.",
  "layer.direction": "Motion angle (deg).",
  "layer.speed": "Animation speed.",
  "layer.saturation": "Color saturation.",
  "layer.brightness": "Overall brightness.",
  "layer.particleCount": "How many particles/elements to spawn.",
  "layer.blur": "Gaussian blur applied to the layer.",
  "layer.glow": "Glow/bloom around bright pixels.",
  "layer.rotation": "Layer rotation in degrees.",
  "layer.mirror": "Mirror the layer horizontally.",
  "layer.invert": "Invert the colors.",
  "layer.noiseAmount": "Add random noise on top of the layer.",
  "layer.frequency": "Wave or pattern frequency.",
  "layer.amplitude": "Wave or pattern amplitude.",
  "layer.phase": "Wave phase offset.",
  "layer.decay": "Trail/fade-out rate for particles.",

  // ── Video source (per-slide multi-video) ─────────────
  "src.src": "URL of this video clip.",
  "src.x": "Left position as % of slide width (0–100).",
  "src.y": "Top position as % of slide height (0–100).",
  "src.width": "Width as % of slide width.",
  "src.height": "Height as % of slide height.",
  "src.fit": "How the video fills its box: contain (letterbox) or cover (crop).",
  "src.opacity": "Transparency of this video.",
  "src.volume": "Volume of this individual clip.",
  "src.zIndex": "Stack order. Higher renders on top.",
  "src.loop": "Loop this clip when it ends.",
  "src.muted": "Mute this individual clip.",
  "src.borderRadius": "Rounded corners in pixels.",
  "src.rotation": "Rotation in degrees.",
  "src.filter": "CSS filter, e.g. blur(2px) brightness(1.2).",
  "src.startTime": "Skip into the clip by this many seconds.",
  "src.endTime": "Stop at this timestamp (0 = play to end).",
  "src.playbackRate": "Speed multiplier. 1 = normal.",
  "src.chromaKey": "Hex color to remove from the video (green-screen).",
  "src.chromaKeyThreshold": "Tolerance for the chroma-key match.",
  "src.shadow": "CSS box-shadow string.",
  "src.blendMode": "How this video blends with layers beneath it.",
  "src.cropTop": "Crop pixels from the top edge.",
  "src.cropBottom": "Crop pixels from the bottom edge.",
  "src.cropLeft": "Crop pixels from the left edge.",
  "src.cropRight": "Crop pixels from the right edge.",

  // ── Global config / overlays ─────────────────────────
  "bgGlobal.type": "Effect rendered as a global overlay across every slide.",
  "bgGlobal.enabled": "Toggle this global background on or off.",
  "bgGlobal.zIndex": "Stack order versus the per-slide background.",
  "bgGlobal.opacity": "Transparency of the global overlay.",
  "bgGlobal.blendMode": "Blend mode against the slide content.",
};

export type FieldKey = keyof typeof FIELD_HELP;
