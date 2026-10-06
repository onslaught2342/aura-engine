/* ─────────────────────────────────────────────────────────────
 *  ENGINE CONFIG — Fully explicit, JSON-serialisable structure
 *  Every property is named so exported JSON is human-readable
 *  and every field is directly editable.
 *  No runtime expressions — pure static data.
 * ───────────────────────────────────────────────────────────── */

// ── Interfaces ──────────────────────────────────────────────

export interface EffectLayer {
  type: string;
  color: string;
  opacity: number;
  blendMode: GlobalCompositeOperation;
  intensity: number;
  scale: number;
  turbulence: number;
  direction: number;
  speed: number;
  saturation: number;
  brightness: number;
  particleCount: number;
  colorSecondary: string;
  blur: number;
  glow: number;
  rotation: number;
  mirror: boolean;
  invert: boolean;
  noiseAmount: number;
  frequency: number;
  amplitude: number;
  phase: number;
  decay: number;
  colorMode: "solid" | "gradient" | "rainbow" | "temperature";
}

export interface SlideBackground {
  type: string;
  color: string;
  opacity: number;
  blendMode: GlobalCompositeOperation;
  saturation: number;
  brightness: number;
  speed: number;
  intensity: number;
  scale: number;
  turbulence: number;
  direction: number;
  secondaryEffect: string | null;
  secondaryOpacity: number;
  secondaryColor: string;
  effectLayers: EffectLayer[];
  backgroundGradient: string;
  vignetteStrength: number;
  vignetteColor: string;
  colorFilter: string;
  transitionType: "fade" | "wipe" | "zoom";
  chromaKey: string;
  chromaKeyThreshold: number;
  motionBlur: number;
  pixelate: number;
  scanlines: boolean;
  scanlineIntensity: number;
  filmGrain: number;
}

export interface VideoSource {
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fit: "contain" | "cover";
  opacity: number;
  volume?: number;
  zIndex: number;
  loop: boolean;
  muted: boolean;
  borderRadius: number;
  rotation: number;
  filter: string;
  startTime: number;
  endTime: number;
  playbackRate: number;
  chromaKey: string;
  chromaKeyThreshold: number;
  shadow: string;
  blendMode: GlobalCompositeOperation;
  cropTop: number;
  cropBottom: number;
  cropLeft: number;
  cropRight: number;
}

export interface BackgroundConfig {
  type: string;
  enabled: boolean;
  zIndex: number;
  opacity: number;
  blendMode: GlobalCompositeOperation;
}

export type TransitionType = "fade" | "wipeLeft" | "wipeRight" | "wipeUp" | "wipeDown" |
  "slideLeft" | "slideRight" | "slideUp" | "slideDown" |
  "zoomIn" | "zoomOut" | "zoomRotate" |
  "flipX" | "flipY" | "blur" | "dissolve" | "iris" |
  "swirl" | "curtain" | "glitch" |
  "splitHorizontal" | "splitVertical" | "rotate" | "bounce" | "morph" |
  "pixelate" | "blinds" | "diamond" | "crossZoom" | "doorway";

export type TransitionEasing = "linear" | "ease" | "ease-in" | "ease-out" | "ease-in-out";

export interface SlideTransition {
  type: TransitionType;
  duration: number;
  easing: TransitionEasing;
}

export interface VideoItem {
  src: string;
  loop: boolean;
  muted: boolean;
  volume?: number;
  label?: string;
  notes?: string;
  transition?: SlideTransition;
  sources: VideoSource[];
  background: SlideBackground;
  /** Per-slide auto-advance override. "inherit" defers to global controls.autoAdvance. */
  autoAdvance?: "inherit" | "on" | "off";
  /** Optional per-slide delay (seconds) — overrides global controls.autoAdvanceDelay when defined. */
  autoAdvanceDelay?: number;
}


export interface MetaConfig {
  title: string;
  version: string;
  author: string;
  description: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  thumbnail: string;
  license: string;
  language: string;
  category: string;
  projectUrl: string;
  coverImage: string;
}

export interface DefaultsConfig {
  background: SlideBackground;
  effectLayer: EffectLayer;
  videoSource: VideoSource;
  defaultTransition: SlideTransition;
}

export interface AudioConfig {
  enabled: boolean;
  volume: number;
  fadeIn: boolean;
  fadeInDuration: number;
  fadeOut: boolean;
  fadeOutDuration: number;
  crossfade: boolean;
  crossfadeDuration: number;
  globalMute: boolean;
}

export interface ThemeConfig {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  uiOpacity: number;
  uiPosition: "top-right" | "top-left" | "bottom-right" | "bottom-left";
  darkMode: boolean;
}

export interface PerformanceConfig {
  maxFPS: number;
  resolution: number;
  enableGPU: boolean;
  maxParticles: number;
  enableBloom: boolean;
  antialiasing: boolean;
}

export interface ExportConfig {
  format: "json" | "ts";
  includeAssets: boolean;
  minify: boolean;
  embedVideos: boolean;
}

export interface WatermarkConfig {
  enabled: boolean;
  mode: "text" | "image";
  text: string;
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center" | "custom";
  x: number;
  y: number;
  opacity: number;
  fontSize: number;
  color: string;
  rotation: number;
}

export interface AccessibilityConfig {
  reducedMotion: boolean;
  highContrast: boolean;
  screenReaderAnnouncements: boolean;
  focusIndicators: boolean;
}

export interface EngineConfig {
  meta: MetaConfig;
  defaults: DefaultsConfig;
  backgrounds: BackgroundConfig[];
  video: {
    fit: "contain" | "cover";
    controls: boolean;
    bgColor: string;
    playlist: VideoItem[];
    globalVolume: number;
    preloadStrategy: "none" | "next" | "all";
    bufferSize: number;
  };
  controls: {
    arrowNavigation: boolean;
    autoPlayFirst: boolean;
    autoAdvance: boolean;
    autoAdvanceDelay: number;
    transitionDuration: number;
    swipeNavigation: boolean;
    pauseOnHover: boolean;
    showSlideNumber: boolean;
    showProgressBar: boolean;
    loopPlaylist: boolean;
    keyboardShortcutsEnabled: boolean;
    clickNavigation: boolean;
    scrollNavigation: boolean;
    fullscreenEnabled: boolean;
    idleHideUI: boolean;
    idleTimeout: number;
    gestureZoom: boolean;
    doubleTapAction: "fullscreen" | "next" | "none";
    randomTransitions: boolean;
    builderEnabled: boolean;
    previewPageEnabled: boolean;
    remoteEnabled: boolean;
  };
  audio: AudioConfig;
  theme: ThemeConfig;
  performance: PerformanceConfig;
  export: ExportConfig;
  watermark: WatermarkConfig;
  accessibility: AccessibilityConfig;
}

// ── Master config — pure JSON data, no runtime expressions ──

export const CONFIG: EngineConfig = {

  /* ── Meta ── */
  meta: {
    title: "Onslaught Presentation",
    version: "5.0.0",
    author: "",
    description: "",
    tags: [],
    createdAt: "",
    updatedAt: "",
    thumbnail: "",
    license: "",
    language: "en",
    category: "",
    projectUrl: "",
    coverImage: ""
  },

  /* ── Defaults ── */
  defaults: {
    background: {
      type: "starfield",
      color: "210",
      opacity: 1,
      blendMode: "screen",
      saturation: 80,
      brightness: 50,
      speed: 1,
      intensity: 50,
      scale: 1,
      turbulence: 50,
      direction: 180,
      secondaryEffect: null,
      secondaryOpacity: 0.5,
      secondaryColor: "180",
      effectLayers: [],
      backgroundGradient: "",
      vignetteStrength: 0,
      vignetteColor: "0,0,0",
      colorFilter: "",
      transitionType: "fade",
      chromaKey: "",
      chromaKeyThreshold: 50,
      motionBlur: 0,
      pixelate: 0,
      scanlines: false,
      scanlineIntensity: 30,
      filmGrain: 0
    },
    effectLayer: {
      type: "starfield",
      color: "210",
      opacity: 0.5,
      blendMode: "screen",
      intensity: 50,
      scale: 1,
      turbulence: 50,
      direction: 180,
      speed: 1,
      saturation: 80,
      brightness: 50,
      particleCount: 200,
      colorSecondary: "180",
      blur: 0,
      glow: 0,
      rotation: 0,
      mirror: false,
      invert: false,
      noiseAmount: 0,
      frequency: 1,
      amplitude: 50,
      phase: 0,
      decay: 0,
      colorMode: "solid"
    },
    videoSource: {
      src: "",
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      fit: "contain",
      opacity: 1,
      volume: 1,
      zIndex: 1,
      loop: false,
      muted: true,
      borderRadius: 0,
      rotation: 0,
      filter: "",
      startTime: 0,
      endTime: 0,
      playbackRate: 1,
      chromaKey: "",
      chromaKeyThreshold: 50,
      shadow: "",
      blendMode: "source-over",
      cropTop: 0,
      cropBottom: 0,
      cropLeft: 0,
      cropRight: 0
    },
    defaultTransition: {
      type: "fade",
      duration: 0.8,
      easing: "ease"
    }
  },

  /* ── Background layers (global overlays) ── */
  backgrounds: [],

  /* ── Video / Playlist ── */
  video: {
    fit: "contain",
    controls: false,
    bgColor: "#000000",
    globalVolume: 1,
    preloadStrategy: "next",
    bufferSize: 5,
    playlist: [

      /* ── Slide 1 ── */
      {
        src: "https://cdn.onslaught2342.qzz.io/assets/videos/pptx/1.webm",
        loop: false,
        muted: true,
        transition: { type: "fade", duration: 0.5, easing: "linear" },
        sources: [],
        background: {
          type: "goldenDust",
          color: "42",
          opacity: 1,
          blendMode: "screen",
          saturation: 80,
          brightness: 50,
          speed: 1,
          intensity: 50,
          scale: 1,
          turbulence: 50,
          direction: 180,
          secondaryEffect: null,
          secondaryOpacity: 0.5,
          secondaryColor: "180",
          effectLayers: [],
          backgroundGradient: "",
          vignetteStrength: 0,
          vignetteColor: "0,0,0",
          colorFilter: "",
          transitionType: "fade",
          chromaKey: "",
          chromaKeyThreshold: 50,
          motionBlur: 0,
          pixelate: 0,
          scanlines: false,
          scanlineIntensity: 30,
          filmGrain: 0
        }
      },

      /* ── Slide 2 ── */
      {
        src: "https://cdn.onslaught2342.qzz.io/assets/videos/pptx/2.webm",
        loop: false,
        muted: true,
        transition: { type: "wipeLeft", duration: 0.6, easing: "ease" },
        sources: [],
        background: {
          type: "starfield",
          color: "210",
          opacity: 1,
          blendMode: "screen",
          saturation: 80,
          brightness: 50,
          speed: 1,
          intensity: 50,
          scale: 1,
          turbulence: 50,
          direction: 180,
          secondaryEffect: null,
          secondaryOpacity: 0.5,
          secondaryColor: "180",
          effectLayers: [],
          backgroundGradient: "",
          vignetteStrength: 0,
          vignetteColor: "0,0,0",
          colorFilter: "",
          transitionType: "fade",
          chromaKey: "",
          chromaKeyThreshold: 50,
          motionBlur: 0,
          pixelate: 0,
          scanlines: false,
          scanlineIntensity: 30,
          filmGrain: 0
        }
      },

      /* ── Slide 3 ── */
      {
        src: "https://cdn.onslaught2342.qzz.io/assets/videos/pptx/3.webm",
        loop: false,
        muted: true,
        transition: { type: "wipeRight", duration: 0.7, easing: "ease-in" },
        sources: [],
        background: {
          type: "auroraWave",
          color: "140",
          opacity: 1,
          blendMode: "screen",
          saturation: 80,
          brightness: 50,
          speed: 1,
          intensity: 50,
          scale: 1,
          turbulence: 50,
          direction: 180,
          secondaryEffect: null,
          secondaryOpacity: 0.5,
          secondaryColor: "180",
          effectLayers: [],
          backgroundGradient: "",
          vignetteStrength: 0,
          vignetteColor: "0,0,0",
          colorFilter: "",
          transitionType: "fade",
          chromaKey: "",
          chromaKeyThreshold: 50,
          motionBlur: 0,
          pixelate: 0,
          scanlines: false,
          scanlineIntensity: 30,
          filmGrain: 0
        }
      },

      /* ── Slide 4 ── */
      {
        src: "https://cdn.onslaught2342.qzz.io/assets/videos/pptx/4.webm",
        loop: false,
        muted: true,
        transition: { type: "wipeUp", duration: 0.8, easing: "ease-out" },
        sources: [],
        background: {
          type: "neonGrid",
          color: "180",
          opacity: 1,
          blendMode: "screen",
          saturation: 80,
          brightness: 50,
          speed: 1,
          intensity: 50,
          scale: 1,
          turbulence: 50,
          direction: 180,
          secondaryEffect: null,
          secondaryOpacity: 0.5,
          secondaryColor: "180",
          effectLayers: [],
          backgroundGradient: "",
          vignetteStrength: 0,
          vignetteColor: "0,0,0",
          colorFilter: "",
          transitionType: "fade",
          chromaKey: "",
          chromaKeyThreshold: 50,
          motionBlur: 0,
          pixelate: 0,
          scanlines: false,
          scanlineIntensity: 30,
          filmGrain: 0
        }
      },

      /* ── Slide 5 ── */
      {
        src: "https://cdn.onslaught2342.qzz.io/assets/videos/pptx/5.webm",
        loop: false,
        muted: true,
        transition: { type: "wipeDown", duration: 0.9, easing: "ease-in-out" },
        sources: [],
        background: {
          type: "fireEmbers",
          color: "15",
          opacity: 1,
          blendMode: "screen",
          saturation: 80,
          brightness: 50,
          speed: 1,
          intensity: 50,
          scale: 1,
          turbulence: 50,
          direction: 180,
          secondaryEffect: null,
          secondaryOpacity: 0.5,
          secondaryColor: "180",
          effectLayers: [],
          backgroundGradient: "",
          vignetteStrength: 0,
          vignetteColor: "0,0,0",
          colorFilter: "",
          transitionType: "fade",
          chromaKey: "",
          chromaKeyThreshold: 50,
          motionBlur: 0,
          pixelate: 0,
          scanlines: false,
          scanlineIntensity: 30,
          filmGrain: 0
        }
      },

      /* ── Slide 6 ── */
      {
        src: "https://cdn.onslaught2342.qzz.io/assets/videos/pptx/6.webm",
        loop: false,
        muted: true,
        transition: { type: "slideLeft", duration: 1.0, easing: "linear" },
        sources: [],
        background: {
          type: "electricStorm",
          color: "220",
          opacity: 1,
          blendMode: "screen",
          saturation: 80,
          brightness: 50,
          speed: 1,
          intensity: 50,
          scale: 1,
          turbulence: 50,
          direction: 180,
          secondaryEffect: null,
          secondaryOpacity: 0.5,
          secondaryColor: "180",
          effectLayers: [],
          backgroundGradient: "",
          vignetteStrength: 0,
          vignetteColor: "0,0,0",
          colorFilter: "",
          transitionType: "fade",
          chromaKey: "",
          chromaKeyThreshold: 50,
          motionBlur: 0,
          pixelate: 0,
          scanlines: false,
          scanlineIntensity: 30,
          filmGrain: 0
        }
      },

      /* ── Slide 7 ── */
      {
        src: "https://cdn.onslaught2342.qzz.io/assets/videos/pptx/7.webm",
        loop: false,
        muted: true,
        transition: { type: "slideRight", duration: 1.1, easing: "ease" },
        sources: [],
        background: {
          type: "cinemaGrain",
          color: "30",
          opacity: 1,
          blendMode: "screen",
          saturation: 80,
          brightness: 50,
          speed: 1,
          intensity: 50,
          scale: 1,
          turbulence: 50,
          direction: 180,
          secondaryEffect: null,
          secondaryOpacity: 0.5,
          secondaryColor: "180",
          effectLayers: [],
          backgroundGradient: "",
          vignetteStrength: 0,
          vignetteColor: "0,0,0",
          colorFilter: "",
          transitionType: "fade",
          chromaKey: "",
          chromaKeyThreshold: 50,
          motionBlur: 0,
          pixelate: 0,
          scanlines: false,
          scanlineIntensity: 30,
          filmGrain: 0
        }
      },

      /* ── Slide 8 ── */
      {
        src: "https://cdn.onslaught2342.qzz.io/assets/videos/pptx/8.webm",
        loop: false,
        muted: true,
        transition: { type: "slideUp", duration: 1.2, easing: "ease-in" },
        sources: [],
        background: {
          type: "smokeRing",
          color: "270",
          opacity: 1,
          blendMode: "screen",
          saturation: 80,
          brightness: 50,
          speed: 1,
          intensity: 50,
          scale: 1,
          turbulence: 50,
          direction: 180,
          secondaryEffect: null,
          secondaryOpacity: 0.5,
          secondaryColor: "180",
          effectLayers: [],
          backgroundGradient: "",
          vignetteStrength: 0,
          vignetteColor: "0,0,0",
          colorFilter: "",
          transitionType: "fade",
          chromaKey: "",
          chromaKeyThreshold: 50,
          motionBlur: 0,
          pixelate: 0,
          scanlines: false,
          scanlineIntensity: 30,
          filmGrain: 0
        }
      },

      /* ── Slide 9 ── */
      {
        src: "https://cdn.onslaught2342.qzz.io/assets/videos/pptx/9.webm",
        loop: false,
        muted: true,
        transition: { type: "slideDown", duration: 1.3, easing: "ease-out" },
        sources: [],
        background: {
          type: "matrixRain",
          color: "120",
          opacity: 1,
          blendMode: "screen",
          saturation: 80,
          brightness: 50,
          speed: 1,
          intensity: 50,
          scale: 1,
          turbulence: 50,
          direction: 180,
          secondaryEffect: null,
          secondaryOpacity: 0.5,
          secondaryColor: "180",
          effectLayers: [],
          backgroundGradient: "",
          vignetteStrength: 0,
          vignetteColor: "0,0,0",
          colorFilter: "",
          transitionType: "fade",
          chromaKey: "",
          chromaKeyThreshold: 50,
          motionBlur: 0,
          pixelate: 0,
          scanlines: false,
          scanlineIntensity: 30,
          filmGrain: 0
        }
      },

      /* ── Slide 10 ── */
      {
        src: "https://cdn.onslaught2342.qzz.io/assets/videos/pptx/10.webm",
        loop: false,
        muted: true,
        transition: { type: "zoomIn", duration: 1.5, easing: "ease-in-out" },
        sources: [],
        background: {
          type: "plasmaField",
          color: "280",
          opacity: 1,
          blendMode: "screen",
          saturation: 80,
          brightness: 50,
          speed: 1,
          intensity: 50,
          scale: 1,
          turbulence: 50,
          direction: 180,
          secondaryEffect: null,
          secondaryOpacity: 0.5,
          secondaryColor: "180",
          effectLayers: [],
          backgroundGradient: "",
          vignetteStrength: 0,
          vignetteColor: "0,0,0",
          colorFilter: "",
          transitionType: "fade",
          chromaKey: "",
          chromaKeyThreshold: 50,
          motionBlur: 0,
          pixelate: 0,
          scanlines: false,
          scanlineIntensity: 30,
          filmGrain: 0
        }
      },

      /* ── Slide 11 ── */
      {
        src: "https://cdn.onslaught2342.qzz.io/assets/videos/pptx/11.webm",
        loop: false,
        muted: true,
        transition: { type: "zoomOut", duration: 0.8, easing: "linear" },
        sources: [],
        background: {
          type: "rainfall",
          color: "200",
          opacity: 1,
          blendMode: "screen",
          saturation: 80,
          brightness: 50,
          speed: 1,
          intensity: 50,
          scale: 1,
          turbulence: 50,
          direction: 180,
          secondaryEffect: null,
          secondaryOpacity: 0.5,
          secondaryColor: "180",
          effectLayers: [],
          backgroundGradient: "",
          vignetteStrength: 0,
          vignetteColor: "0,0,0",
          colorFilter: "",
          transitionType: "fade",
          chromaKey: "",
          chromaKeyThreshold: 50,
          motionBlur: 0,
          pixelate: 0,
          scanlines: false,
          scanlineIntensity: 30,
          filmGrain: 0
        }
      },

      /* ── Slide 12 ── */
      {
        src: "https://cdn.onslaught2342.qzz.io/assets/videos/pptx/12.webm",
        loop: false,
        muted: true,
        transition: { type: "zoomRotate", duration: 0.6, easing: "ease" },
        sources: [],
        background: {
          type: "dnaHelix",
          color: "190",
          opacity: 1,
          blendMode: "screen",
          saturation: 80,
          brightness: 50,
          speed: 1,
          intensity: 50,
          scale: 1,
          turbulence: 50,
          direction: 180,
          secondaryEffect: null,
          secondaryOpacity: 0.5,
          secondaryColor: "180",
          effectLayers: [],
          backgroundGradient: "",
          vignetteStrength: 0,
          vignetteColor: "0,0,0",
          colorFilter: "",
          transitionType: "fade",
          chromaKey: "",
          chromaKeyThreshold: 50,
          motionBlur: 0,
          pixelate: 0,
          scanlines: false,
          scanlineIntensity: 30,
          filmGrain: 0
        }
      },

      /* ── Slide 13 ── */
      {
        src: "https://cdn.onslaught2342.qzz.io/assets/videos/pptx/13.webm",
        loop: false,
        muted: true,
        transition: { type: "flipX", duration: 0.7, easing: "ease-in" },
        sources: [],
        background: {
          type: "cosmicDust",
          color: "260",
          opacity: 1,
          blendMode: "screen",
          saturation: 80,
          brightness: 50,
          speed: 1,
          intensity: 50,
          scale: 1,
          turbulence: 50,
          direction: 180,
          secondaryEffect: null,
          secondaryOpacity: 0.5,
          secondaryColor: "180",
          effectLayers: [],
          backgroundGradient: "",
          vignetteStrength: 0,
          vignetteColor: "0,0,0",
          colorFilter: "",
          transitionType: "fade",
          chromaKey: "",
          chromaKeyThreshold: 50,
          motionBlur: 0,
          pixelate: 0,
          scanlines: false,
          scanlineIntensity: 30,
          filmGrain: 0
        }
      },

      /* ── Slide 14 ── */
      {
        src: "https://cdn.onslaught2342.qzz.io/assets/videos/pptx/14.webm",
        loop: false,
        muted: true,
        transition: { type: "flipY", duration: 0.9, easing: "ease-out" },
        sources: [],
        background: {
          type: "blackHole",
          color: "200",
          opacity: 1,
          blendMode: "screen",
          saturation: 80,
          brightness: 50,
          speed: 1,
          intensity: 50,
          scale: 1,
          turbulence: 50,
          direction: 180,
          secondaryEffect: null,
          secondaryOpacity: 0.5,
          secondaryColor: "180",
          effectLayers: [],
          backgroundGradient: "",
          vignetteStrength: 0,
          vignetteColor: "0,0,0",
          colorFilter: "",
          transitionType: "fade",
          chromaKey: "",
          chromaKeyThreshold: 50,
          motionBlur: 0,
          pixelate: 0,
          scanlines: false,
          scanlineIntensity: 30,
          filmGrain: 0
        }
      },

      /* ── Slide 15 ── */
      {
        src: "https://cdn.onslaught2342.qzz.io/assets/videos/pptx/15.webm",
        loop: false,
        muted: true,
        transition: { type: "blur", duration: 1.0, easing: "ease-in-out" },
        sources: [],
        background: {
          type: "galaxy",
          color: "260",
          opacity: 1,
          blendMode: "screen",
          saturation: 80,
          brightness: 50,
          speed: 1,
          intensity: 50,
          scale: 1,
          turbulence: 50,
          direction: 180,
          secondaryEffect: null,
          secondaryOpacity: 0.5,
          secondaryColor: "180",
          effectLayers: [],
          backgroundGradient: "",
          vignetteStrength: 0,
          vignetteColor: "0,0,0",
          colorFilter: "",
          transitionType: "fade",
          chromaKey: "",
          chromaKeyThreshold: 50,
          motionBlur: 0,
          pixelate: 0,
          scanlines: false,
          scanlineIntensity: 30,
          filmGrain: 0
        }
      },

      /* ── Slide 16 ── */
      {
        src: "https://cdn.onslaught2342.qzz.io/assets/videos/pptx/16.webm",
        loop: false,
        muted: true,
        transition: { type: "dissolve", duration: 1.2, easing: "linear" },
        sources: [],
        background: {
          type: "meteorShower",
          color: "30",
          opacity: 1,
          blendMode: "screen",
          saturation: 80,
          brightness: 50,
          speed: 1,
          intensity: 70,
          scale: 1,
          turbulence: 60,
          direction: 180,
          secondaryEffect: null,
          secondaryOpacity: 0.5,
          secondaryColor: "180",
          effectLayers: [],
          backgroundGradient: "",
          vignetteStrength: 0,
          vignetteColor: "0,0,0",
          colorFilter: "",
          transitionType: "fade",
          chromaKey: "",
          chromaKeyThreshold: 50,
          motionBlur: 0,
          pixelate: 0,
          scanlines: false,
          scanlineIntensity: 30,
          filmGrain: 0
        }
      },

      /* ── Slide 17 ── */
      {
        src: "https://cdn.onslaught2342.qzz.io/assets/videos/pptx/17.webm",
        loop: false,
        muted: true,
        transition: { type: "iris", duration: 1.0, easing: "ease" },
        sources: [],
        background: {
          type: "nebula",
          color: "260",
          opacity: 1,
          blendMode: "screen",
          saturation: 80,
          brightness: 50,
          speed: 1,
          intensity: 50,
          scale: 1,
          turbulence: 50,
          direction: 180,
          secondaryEffect: null,
          secondaryOpacity: 0.5,
          secondaryColor: "180",
          effectLayers: [],
          backgroundGradient: "",
          vignetteStrength: 0,
          vignetteColor: "0,0,0",
          colorFilter: "",
          transitionType: "fade",
          chromaKey: "",
          chromaKeyThreshold: 50,
          motionBlur: 0,
          pixelate: 0,
          scanlines: false,
          scanlineIntensity: 30,
          filmGrain: 0
        }
      },

      /* ── Slide 18 ── */
      {
        src: "https://cdn.onslaught2342.qzz.io/assets/videos/pptx/18.webm",
        loop: false,
        muted: true,
        transition: { type: "swirl", duration: 1.5, easing: "ease-in" },
        sources: [],
        background: {
          type: "oceanWaves",
          color: "200",
          opacity: 1,
          blendMode: "screen",
          saturation: 80,
          brightness: 50,
          speed: 1,
          intensity: 50,
          scale: 1,
          turbulence: 50,
          direction: 180,
          secondaryEffect: null,
          secondaryOpacity: 0.5,
          secondaryColor: "180",
          effectLayers: [],
          backgroundGradient: "",
          vignetteStrength: 0,
          vignetteColor: "0,0,0",
          colorFilter: "",
          transitionType: "fade",
          chromaKey: "",
          chromaKeyThreshold: 50,
          motionBlur: 0,
          pixelate: 0,
          scanlines: false,
          scanlineIntensity: 30,
          filmGrain: 0
        }
      },

      /* ── Slide 19 ── */
      {
        src: "https://cdn.onslaught2342.qzz.io/assets/videos/pptx/19.webm",
        loop: false,
        muted: true,
        transition: { type: "curtain", duration: 0.9, easing: "ease-out" },
        sources: [],
        background: {
          type: "snowfall",
          color: "210",
          opacity: 1,
          blendMode: "screen",
          saturation: 80,
          brightness: 50,
          speed: 1,
          intensity: 50,
          scale: 1,
          turbulence: 50,
          direction: 180,
          secondaryEffect: null,
          secondaryOpacity: 0.5,
          secondaryColor: "180",
          effectLayers: [],
          backgroundGradient: "",
          vignetteStrength: 0,
          vignetteColor: "0,0,0",
          colorFilter: "",
          transitionType: "fade",
          chromaKey: "",
          chromaKeyThreshold: 50,
          motionBlur: 0,
          pixelate: 0,
          scanlines: false,
          scanlineIntensity: 30,
          filmGrain: 0
        }
      },

      /* ── Slide 20 ── */
      {
        src: "https://cdn.onslaught2342.qzz.io/assets/videos/pptx/20.webm",
        loop: false,
        muted: true,
        transition: { type: "glitch", duration: 0.6, easing: "linear" },
        sources: [],
        background: {
          type: "fireflies",
          color: "60",
          opacity: 1,
          blendMode: "screen",
          saturation: 80,
          brightness: 50,
          speed: 1,
          intensity: 50,
          scale: 1,
          turbulence: 50,
          direction: 180,
          secondaryEffect: null,
          secondaryOpacity: 0.5,
          secondaryColor: "180",
          effectLayers: [],
          backgroundGradient: "",
          vignetteStrength: 0,
          vignetteColor: "0,0,0",
          colorFilter: "",
          transitionType: "fade",
          chromaKey: "",
          chromaKeyThreshold: 50,
          motionBlur: 0,
          pixelate: 0,
          scanlines: false,
          scanlineIntensity: 30,
          filmGrain: 0
        }
      },

      /* ── Slide 21 ── */
      {
        src: "https://cdn.onslaught2342.qzz.io/assets/videos/pptx/21.webm",
        loop: false,
        muted: true,
        transition: { type: "splitHorizontal", duration: 0.8, easing: "ease-in-out" },
        sources: [],
        background: {
          type: "lightningBolts",
          color: "240",
          opacity: 1,
          blendMode: "screen",
          saturation: 80,
          brightness: 50,
          speed: 1,
          intensity: 50,
          scale: 1,
          turbulence: 50,
          direction: 180,
          secondaryEffect: null,
          secondaryOpacity: 0.5,
          secondaryColor: "180",
          effectLayers: [],
          backgroundGradient: "",
          vignetteStrength: 0,
          vignetteColor: "0,0,0",
          colorFilter: "",
          transitionType: "fade",
          chromaKey: "",
          chromaKeyThreshold: 50,
          motionBlur: 0,
          pixelate: 0,
          scanlines: false,
          scanlineIntensity: 30,
          filmGrain: 0
        }
      },

      /* ── Slide 22 ── */
      {
        src: "https://cdn.onslaught2342.qzz.io/assets/videos/pptx/22.webm",
        loop: false,
        muted: true,
        transition: { type: "splitVertical", duration: 0.7, easing: "ease" },
        sources: [],
        background: {
          type: "vortexTunnel",
          color: "280",
          opacity: 1,
          blendMode: "screen",
          saturation: 80,
          brightness: 50,
          speed: 1,
          intensity: 50,
          scale: 1,
          turbulence: 50,
          direction: 180,
          secondaryEffect: null,
          secondaryOpacity: 0.5,
          secondaryColor: "180",
          effectLayers: [],
          backgroundGradient: "",
          vignetteStrength: 0,
          vignetteColor: "0,0,0",
          colorFilter: "",
          transitionType: "fade",
          chromaKey: "",
          chromaKeyThreshold: 50,
          motionBlur: 0,
          pixelate: 0,
          scanlines: false,
          scanlineIntensity: 30,
          filmGrain: 0
        }
      },

      /* ── Slide 23 ── */
      {
        src: "https://cdn.onslaught2342.qzz.io/assets/videos/pptx/23.webm",
        loop: false,
        muted: true,
        transition: { type: "rotate", duration: 1.0, easing: "ease-out" },
        sources: [],
        background: {
          type: "northernLights",
          color: "120",
          opacity: 1,
          blendMode: "screen",
          saturation: 80,
          brightness: 50,
          speed: 1,
          intensity: 50,
          scale: 1,
          turbulence: 50,
          direction: 180,
          secondaryEffect: null,
          secondaryOpacity: 0.5,
          secondaryColor: "180",
          effectLayers: [],
          backgroundGradient: "",
          vignetteStrength: 0,
          vignetteColor: "0,0,0",
          colorFilter: "",
          transitionType: "fade",
          chromaKey: "",
          chromaKeyThreshold: 50,
          motionBlur: 0,
          pixelate: 0,
          scanlines: false,
          scanlineIntensity: 30,
          filmGrain: 0
        }
      },

      /* ── Slide 24 ── */
      {
        src: "https://cdn.onslaught2342.qzz.io/assets/videos/pptx/24.webm",
        loop: false,
        muted: true,
        transition: { type: "bounce", duration: 0.9, easing: "ease-out" },
        sources: [],
        background: {
          type: "raindropRipples",
          color: "200",
          opacity: 1,
          blendMode: "screen",
          saturation: 80,
          brightness: 50,
          speed: 1,
          intensity: 50,
          scale: 1,
          turbulence: 50,
          direction: 180,
          secondaryEffect: null,
          secondaryOpacity: 0.5,
          secondaryColor: "180",
          effectLayers: [],
          backgroundGradient: "",
          vignetteStrength: 0,
          vignetteColor: "0,0,0",
          colorFilter: "",
          transitionType: "fade",
          chromaKey: "",
          chromaKeyThreshold: 50,
          motionBlur: 0,
          pixelate: 0,
          scanlines: false,
          scanlineIntensity: 30,
          filmGrain: 0
        }
      },

      /* ── Slide 25 ── */
      {
        src: "https://cdn.onslaught2342.qzz.io/assets/videos/pptx/25.webm",
        loop: false,
        muted: true,
        transition: { type: "morph", duration: 1.3, easing: "ease-in-out" },
        sources: [],
        background: {
          type: "lavaLamp",
          color: "15",
          opacity: 1,
          blendMode: "screen",
          saturation: 80,
          brightness: 50,
          speed: 1,
          intensity: 50,
          scale: 1,
          turbulence: 50,
          direction: 180,
          secondaryEffect: null,
          secondaryOpacity: 0.5,
          secondaryColor: "180",
          effectLayers: [],
          backgroundGradient: "",
          vignetteStrength: 0,
          vignetteColor: "0,0,0",
          colorFilter: "",
          transitionType: "fade",
          chromaKey: "",
          chromaKeyThreshold: 50,
          motionBlur: 0,
          pixelate: 0,
          scanlines: false,
          scanlineIntensity: 30,
          filmGrain: 0
        }
      },

      /* ── Slide 26 ── */
      {
        src: "https://cdn.onslaught2342.qzz.io/assets/videos/pptx/26.webm",
        loop: false,
        muted: true,
        transition: { type: "pixelate", duration: 0.8, easing: "linear" },
        sources: [],
        background: {
          type: "crystalMatrix",
          color: "200",
          opacity: 1,
          blendMode: "screen",
          saturation: 80,
          brightness: 50,
          speed: 1,
          intensity: 50,
          scale: 1,
          turbulence: 50,
          direction: 180,
          secondaryEffect: null,
          secondaryOpacity: 0.5,
          secondaryColor: "180",
          effectLayers: [],
          backgroundGradient: "",
          vignetteStrength: 0,
          vignetteColor: "0,0,0",
          colorFilter: "",
          transitionType: "fade",
          chromaKey: "",
          chromaKeyThreshold: 50,
          motionBlur: 0,
          pixelate: 0,
          scanlines: false,
          scanlineIntensity: 30,
          filmGrain: 0
        }
      },

      /* ── Slide 27 ── */
      {
        src: "https://cdn.onslaught2342.qzz.io/assets/videos/pptx/27.webm",
        loop: false,
        muted: true,
        transition: { type: "blinds", duration: 1.0, easing: "ease-in" },
        sources: [],
        background: {
          type: "digitalCircuit",
          color: "160",
          opacity: 1,
          blendMode: "screen",
          saturation: 80,
          brightness: 50,
          speed: 1,
          intensity: 50,
          scale: 1,
          turbulence: 50,
          direction: 180,
          secondaryEffect: null,
          secondaryOpacity: 0.5,
          secondaryColor: "180",
          effectLayers: [],
          backgroundGradient: "",
          vignetteStrength: 0,
          vignetteColor: "0,0,0",
          colorFilter: "",
          transitionType: "fade",
          chromaKey: "",
          chromaKeyThreshold: 50,
          motionBlur: 0,
          pixelate: 0,
          scanlines: false,
          scanlineIntensity: 30,
          filmGrain: 0
        }
      },

      /* ── Slide 28 ── */
      {
        src: "https://cdn.onslaught2342.qzz.io/assets/videos/pptx/28.webm",
        loop: false,
        muted: true,
        transition: { type: "diamond", duration: 1.1, easing: "ease" },
        sources: [],
        background: {
          type: "solarFlare",
          color: "30",
          opacity: 1,
          blendMode: "screen",
          saturation: 85,
          brightness: 55,
          speed: 1,
          intensity: 60,
          scale: 1,
          turbulence: 50,
          direction: 180,
          secondaryEffect: null,
          secondaryOpacity: 0.5,
          secondaryColor: "180",
          effectLayers: [],
          backgroundGradient: "",
          vignetteStrength: 0,
          vignetteColor: "0,0,0",
          colorFilter: "",
          transitionType: "fade",
          chromaKey: "",
          chromaKeyThreshold: 50,
          motionBlur: 0,
          pixelate: 0,
          scanlines: false,
          scanlineIntensity: 30,
          filmGrain: 0
        }
      },

      /* ── Slide 29 ── */
      {
        src: "https://cdn.onslaught2342.qzz.io/assets/videos/pptx/29.webm",
        loop: false,
        muted: true,
        transition: { type: "crossZoom", duration: 0.7, easing: "ease-in-out" },
        sources: [],
        background: {
          type: "geometricTessellation",
          color: "270",
          opacity: 1,
          blendMode: "screen",
          saturation: 75,
          brightness: 50,
          speed: 1,
          intensity: 50,
          scale: 1,
          turbulence: 50,
          direction: 180,
          secondaryEffect: null,
          secondaryOpacity: 0.5,
          secondaryColor: "180",
          effectLayers: [],
          backgroundGradient: "",
          vignetteStrength: 0,
          vignetteColor: "0,0,0",
          colorFilter: "",
          transitionType: "fade",
          chromaKey: "",
          chromaKeyThreshold: 50,
          motionBlur: 0,
          pixelate: 0,
          scanlines: false,
          scanlineIntensity: 30,
          filmGrain: 0
        }
      },

      /* ── Slide 30 ── */
      {
        src: "https://cdn.onslaught2342.qzz.io/assets/videos/pptx/30.webm",
        loop: false,
        muted: true,
        transition: { type: "doorway", duration: 1.0, easing: "ease-out" },
        sources: [],
        background: {
          type: "inkBleed",
          color: "220",
          opacity: 1,
          blendMode: "screen",
          saturation: 70,
          brightness: 45,
          speed: 1,
          intensity: 55,
          scale: 1,
          turbulence: 60,
          direction: 180,
          secondaryEffect: null,
          secondaryOpacity: 0.5,
          secondaryColor: "180",
          effectLayers: [],
          backgroundGradient: "",
          vignetteStrength: 0,
          vignetteColor: "0,0,0",
          colorFilter: "",
          transitionType: "fade",
          chromaKey: "",
          chromaKeyThreshold: 50,
          motionBlur: 0,
          pixelate: 0,
          scanlines: false,
          scanlineIntensity: 30,
          filmGrain: 0
        }
      },

      /* ── Slide 31 ── */
      {
        src: "https://cdn.onslaught2342.qzz.io/assets/videos/pptx/31.webm",
        loop: false,
        muted: true,
        transition: { type: "wipeLeft", duration: 0.8, easing: "ease-in" },
        sources: [],
        background: {
          type: "glitchWave",
          color: "0",
          opacity: 1,
          blendMode: "screen",
          saturation: 80,
          brightness: 50,
          speed: 1,
          intensity: 50,
          scale: 1,
          turbulence: 60,
          direction: 180,
          secondaryEffect: null,
          secondaryOpacity: 0.5,
          secondaryColor: "180",
          effectLayers: [],
          backgroundGradient: "",
          vignetteStrength: 0,
          vignetteColor: "0,0,0",
          colorFilter: "",
          transitionType: "fade",
          chromaKey: "",
          chromaKeyThreshold: 50,
          motionBlur: 0,
          pixelate: 0,
          scanlines: false,
          scanlineIntensity: 30,
          filmGrain: 0
        }
      },

      /* ── Slide 32 ── */
      {
        src: "https://cdn.onslaught2342.qzz.io/assets/videos/pptx/32.webm",
        loop: false,
        muted: true,
        transition: { type: "zoomRotate", duration: 1.2, easing: "ease" },
        sources: [],
        background: {
          type: "interactiveParticles",
          color: "180",
          opacity: 1,
          blendMode: "screen",
          saturation: 80,
          brightness: 50,
          speed: 1,
          intensity: 50,
          scale: 1,
          turbulence: 50,
          direction: 180,
          secondaryEffect: null,
          secondaryOpacity: 0.5,
          secondaryColor: "180",
          effectLayers: [],
          backgroundGradient: "",
          vignetteStrength: 0,
          vignetteColor: "0,0,0",
          colorFilter: "",
          transitionType: "fade",
          chromaKey: "",
          chromaKeyThreshold: 50,
          motionBlur: 0,
          pixelate: 0,
          scanlines: false,
          scanlineIntensity: 30,
          filmGrain: 0
        }
      },

      /* ── Slide 33 ── */
      {
        src: "https://cdn.onslaught2342.qzz.io/assets/videos/pptx/33.webm",
        loop: false,
        muted: true,
        transition: { type: "flipX", duration: 0.9, easing: "ease-out" },
        sources: [],
        background: {
          type: "blurredGradients",
          color: "300",
          opacity: 1,
          blendMode: "screen",
          saturation: 80,
          brightness: 50,
          speed: 1,
          intensity: 50,
          scale: 1,
          turbulence: 50,
          direction: 180,
          secondaryEffect: null,
          secondaryOpacity: 0.5,
          secondaryColor: "180",
          effectLayers: [],
          backgroundGradient: "",
          vignetteStrength: 0,
          vignetteColor: "0,0,0",
          colorFilter: "",
          transitionType: "fade",
          chromaKey: "",
          chromaKeyThreshold: 50,
          motionBlur: 0,
          pixelate: 0,
          scanlines: false,
          scanlineIntensity: 30,
          filmGrain: 0
        }
      },

      /* ── Slide 34 ── */
      {
        src: "https://cdn.onslaught2342.qzz.io/assets/videos/pptx/34.webm",
        loop: false,
        muted: true,
        transition: { type: "iris", duration: 1.1, easing: "ease-in-out" },
        sources: [],
        background: {
          type: "parallaxField",
          color: "210",
          opacity: 1,
          blendMode: "screen",
          saturation: 80,
          brightness: 50,
          speed: 1,
          intensity: 50,
          scale: 1,
          turbulence: 50,
          direction: 180,
          secondaryEffect: null,
          secondaryOpacity: 0.5,
          secondaryColor: "180",
          effectLayers: [],
          backgroundGradient: "",
          vignetteStrength: 0,
          vignetteColor: "0,0,0",
          colorFilter: "",
          transitionType: "fade",
          chromaKey: "",
          chromaKeyThreshold: 50,
          motionBlur: 0,
          pixelate: 0,
          scanlines: false,
          scanlineIntensity: 30,
          filmGrain: 0
        }
      },

      /* ── Slide 35 ── */
      {
        src: "https://cdn.onslaught2342.qzz.io/assets/videos/pptx/35.webm",
        loop: false,
        muted: true,
        transition: { type: "slideLeft", duration: 0.7, easing: "linear" },
        sources: [],
        background: {
          type: "animatedShapes",
          color: "330",
          opacity: 1,
          blendMode: "screen",
          saturation: 80,
          brightness: 50,
          speed: 1,
          intensity: 50,
          scale: 1,
          turbulence: 50,
          direction: 180,
          secondaryEffect: null,
          secondaryOpacity: 0.5,
          secondaryColor: "180",
          effectLayers: [],
          backgroundGradient: "",
          vignetteStrength: 0,
          vignetteColor: "0,0,0",
          colorFilter: "",
          transitionType: "fade",
          chromaKey: "",
          chromaKeyThreshold: 50,
          motionBlur: 0,
          pixelate: 0,
          scanlines: false,
          scanlineIntensity: 30,
          filmGrain: 0
        }
      },

      /* ── Slide 36 ── */
      {
        src: "https://cdn.onslaught2342.qzz.io/assets/videos/pptx/36.webm",
        loop: false,
        muted: true,
        transition: { type: "swirl", duration: 1.3, easing: "ease" },
        sources: [],
        background: {
          type: "kaleidoscope",
          color: "0",
          opacity: 1,
          blendMode: "screen",
          saturation: 80,
          brightness: 50,
          speed: 1,
          intensity: 50,
          scale: 1,
          turbulence: 50,
          direction: 180,
          secondaryEffect: null,
          secondaryOpacity: 0.5,
          secondaryColor: "180",
          effectLayers: [],
          backgroundGradient: "",
          vignetteStrength: 0,
          vignetteColor: "0,0,0",
          colorFilter: "",
          transitionType: "fade",
          chromaKey: "",
          chromaKeyThreshold: 50,
          motionBlur: 0,
          pixelate: 0,
          scanlines: false,
          scanlineIntensity: 30,
          filmGrain: 0
        }
      },

      /* ── Slide 37 ── */
      {
        src: "https://cdn.onslaught2342.qzz.io/assets/videos/pptx/37.webm",
        loop: false,
        muted: true,
        transition: { type: "curtain", duration: 0.8, easing: "ease-in" },
        sources: [],
        background: {
          type: "waveInterference",
          color: "200",
          opacity: 1,
          blendMode: "screen",
          saturation: 80,
          brightness: 50,
          speed: 1,
          intensity: 50,
          scale: 1,
          turbulence: 50,
          direction: 180,
          secondaryEffect: null,
          secondaryOpacity: 0.5,
          secondaryColor: "180",
          effectLayers: [],
          backgroundGradient: "",
          vignetteStrength: 0,
          vignetteColor: "0,0,0",
          colorFilter: "",
          transitionType: "fade",
          chromaKey: "",
          chromaKeyThreshold: 50,
          motionBlur: 0,
          pixelate: 0,
          scanlines: false,
          scanlineIntensity: 30,
          filmGrain: 0
        }
      },

      /* ── Slide 38 ── */
      {
        src: "https://cdn.onslaught2342.qzz.io/assets/videos/pptx/38.webm",
        loop: false,
        muted: true,
        transition: { type: "wipeUp", duration: 1.0, easing: "ease-out" },
        sources: [],
        background: {
          type: "cellularAutomata",
          color: "120",
          opacity: 1,
          blendMode: "screen",
          saturation: 80,
          brightness: 50,
          speed: 1,
          intensity: 50,
          scale: 1,
          turbulence: 50,
          direction: 180,
          secondaryEffect: null,
          secondaryOpacity: 0.5,
          secondaryColor: "180",
          effectLayers: [],
          backgroundGradient: "",
          vignetteStrength: 0,
          vignetteColor: "0,0,0",
          colorFilter: "",
          transitionType: "fade",
          chromaKey: "",
          chromaKeyThreshold: 50,
          motionBlur: 0,
          pixelate: 0,
          scanlines: false,
          scanlineIntensity: 30,
          filmGrain: 0
        }
      },

      /* ── Slide 39 ── */
      {
        src: "https://cdn.onslaught2342.qzz.io/assets/videos/pptx/39.webm",
        loop: false,
        muted: true,
        transition: { type: "blur", duration: 0.9, easing: "ease-in-out" },
        sources: [],
        background: {
          type: "fractalTree",
          color: "90",
          opacity: 1,
          blendMode: "screen",
          saturation: 80,
          brightness: 50,
          speed: 1,
          intensity: 50,
          scale: 1,
          turbulence: 50,
          direction: 180,
          secondaryEffect: null,
          secondaryOpacity: 0.5,
          secondaryColor: "180",
          effectLayers: [],
          backgroundGradient: "",
          vignetteStrength: 0,
          vignetteColor: "0,0,0",
          colorFilter: "",
          transitionType: "fade",
          chromaKey: "",
          chromaKeyThreshold: 50,
          motionBlur: 0,
          pixelate: 0,
          scanlines: false,
          scanlineIntensity: 30,
          filmGrain: 0
        }
      },

      /* ── Slide 40 ── */
      {
        src: "https://cdn.onslaught2342.qzz.io/assets/videos/pptx/40.webm",
        loop: false, muted: true, transition: { type: "slideDown", duration: 0.8, easing: "ease" }, sources: [],
        background: {
          type: "holographicShimmer", color: "0", opacity: 1, blendMode: "screen",
          saturation: 80, brightness: 50, speed: 1, intensity: 50, scale: 1,
          turbulence: 50, direction: 180, secondaryEffect: null, secondaryOpacity: 0.5,
          secondaryColor: "180", effectLayers: [], backgroundGradient: "",
          vignetteStrength: 0, vignetteColor: "0,0,0", colorFilter: "",
          transitionType: "fade", chromaKey: "", chromaKeyThreshold: 50,
          motionBlur: 0, pixelate: 0, scanlines: false, scanlineIntensity: 30, filmGrain: 0
        }
      },

      /* ── Slide 41 ── */
      {
        src: "https://cdn.onslaught2342.qzz.io/assets/videos/pptx/41.webm",
        loop: false, muted: true, transition: { type: "zoomIn", duration: 1.0, easing: "ease-in" }, sources: [],
        background: {
          type: "magneticField", color: "200", opacity: 1, blendMode: "screen",
          saturation: 80, brightness: 50, speed: 1, intensity: 50, scale: 1,
          turbulence: 50, direction: 180, secondaryEffect: null, secondaryOpacity: 0.5,
          secondaryColor: "180", effectLayers: [], backgroundGradient: "",
          vignetteStrength: 0, vignetteColor: "0,0,0", colorFilter: "",
          transitionType: "fade", chromaKey: "", chromaKeyThreshold: 50,
          motionBlur: 0, pixelate: 0, scanlines: false, scanlineIntensity: 30, filmGrain: 0
        }
      },

      /* ── Slide 42 ── */
      {
        src: "https://cdn.onslaught2342.qzz.io/assets/videos/pptx/42.webm",
        loop: false, muted: true, transition: { type: "flipY", duration: 0.9, easing: "ease-out" }, sources: [],
        background: {
          type: "retroSunset", color: "340", opacity: 1, blendMode: "source-over",
          saturation: 90, brightness: 50, speed: 1, intensity: 50, scale: 1,
          turbulence: 50, direction: 180, secondaryEffect: null, secondaryOpacity: 0.5,
          secondaryColor: "180", effectLayers: [], backgroundGradient: "",
          vignetteStrength: 20, vignetteColor: "0,0,0", colorFilter: "",
          transitionType: "fade", chromaKey: "", chromaKeyThreshold: 50,
          motionBlur: 0, pixelate: 0, scanlines: true, scanlineIntensity: 20, filmGrain: 0
        }
      },

      /* ── Slide 43 ── */
      {
        src: "https://cdn.onslaught2342.qzz.io/assets/videos/pptx/43.webm",
        loop: false, muted: true, transition: { type: "dissolve", duration: 1.3, easing: "ease-in-out" }, sources: [],
        background: {
          type: "quantumField", color: "260", opacity: 1, blendMode: "screen",
          saturation: 80, brightness: 50, speed: 1, intensity: 50, scale: 1,
          turbulence: 50, direction: 180, secondaryEffect: null, secondaryOpacity: 0.5,
          secondaryColor: "180", effectLayers: [], backgroundGradient: "",
          vignetteStrength: 0, vignetteColor: "0,0,0", colorFilter: "",
          transitionType: "fade", chromaKey: "", chromaKeyThreshold: 50,
          motionBlur: 0, pixelate: 0, scanlines: false, scanlineIntensity: 30, filmGrain: 0
        }
      },

      /* ── Slide 44 ── */
      {
        src: "https://cdn.onslaught2342.qzz.io/assets/videos/pptx/44.webm",
        loop: false, muted: true, transition: { type: "wipeRight", duration: 0.7, easing: "linear" }, sources: [],
        background: {
          type: "coralReef", color: "170", opacity: 1, blendMode: "screen",
          saturation: 70, brightness: 50, speed: 1, intensity: 50, scale: 1,
          turbulence: 40, direction: 180, secondaryEffect: null, secondaryOpacity: 0.5,
          secondaryColor: "180", effectLayers: [], backgroundGradient: "",
          vignetteStrength: 10, vignetteColor: "0,0,30", colorFilter: "",
          transitionType: "fade", chromaKey: "", chromaKeyThreshold: 50,
          motionBlur: 0, pixelate: 0, scanlines: false, scanlineIntensity: 30, filmGrain: 0
        }
      },

      /* ── Slide 45 ── */
      {
        src: "https://cdn.onslaught2342.qzz.io/assets/videos/pptx/45.webm",
        loop: false, muted: true, transition: { type: "glitch", duration: 0.5, easing: "ease" }, sources: [],
        background: {
          type: "acidTrip", color: "0", opacity: 1, blendMode: "screen",
          saturation: 100, brightness: 60, speed: 1, intensity: 60, scale: 1,
          turbulence: 60, direction: 180, secondaryEffect: null, secondaryOpacity: 0.5,
          secondaryColor: "180", effectLayers: [], backgroundGradient: "",
          vignetteStrength: 0, vignetteColor: "0,0,0", colorFilter: "",
          transitionType: "fade", chromaKey: "", chromaKeyThreshold: 50,
          motionBlur: 0, pixelate: 0, scanlines: false, scanlineIntensity: 30, filmGrain: 0
        }
      },

      /* ── Slide 46 ── */
      {
        src: "https://cdn.onslaught2342.qzz.io/assets/videos/pptx/46.webm",
        loop: false, muted: true, transition: { type: "morph", duration: 1.1, easing: "ease-in" }, sources: [],
        background: {
          type: "tidalWave", color: "200", opacity: 1, blendMode: "screen",
          saturation: 80, brightness: 50, speed: 1, intensity: 55, scale: 1,
          turbulence: 50, direction: 180, secondaryEffect: null, secondaryOpacity: 0.5,
          secondaryColor: "180", effectLayers: [], backgroundGradient: "",
          vignetteStrength: 10, vignetteColor: "0,0,20", colorFilter: "",
          transitionType: "fade", chromaKey: "", chromaKeyThreshold: 50,
          motionBlur: 0, pixelate: 0, scanlines: false, scanlineIntensity: 30, filmGrain: 0
        }
      },

      /* ── Slide 47 ── */
      {
        src: "https://cdn.onslaught2342.qzz.io/assets/videos/pptx/47.webm",
        loop: false, muted: true, transition: { type: "diamond", duration: 1.0, easing: "ease-out" }, sources: [],
        background: {
          type: "crystalGrowth", color: "180", opacity: 1, blendMode: "screen",
          saturation: 75, brightness: 50, speed: 1, intensity: 50, scale: 1,
          turbulence: 40, direction: 180, secondaryEffect: null, secondaryOpacity: 0.5,
          secondaryColor: "180", effectLayers: [], backgroundGradient: "",
          vignetteStrength: 5, vignetteColor: "0,0,0", colorFilter: "",
          transitionType: "fade", chromaKey: "", chromaKeyThreshold: 50,
          motionBlur: 0, pixelate: 0, scanlines: false, scanlineIntensity: 30, filmGrain: 0
        }
      },

      /* ── Slide 48 ── */
      {
        src: "https://cdn.onslaught2342.qzz.io/assets/videos/pptx/48.webm",
        loop: false, muted: true, transition: { type: "crossZoom", duration: 0.8, easing: "ease-in-out" }, sources: [],
        background: {
          type: "fireworksBurst", color: "30", opacity: 1, blendMode: "screen",
          saturation: 90, brightness: 55, speed: 1, intensity: 60, scale: 1,
          turbulence: 50, direction: 180, secondaryEffect: null, secondaryOpacity: 0.5,
          secondaryColor: "180", effectLayers: [], backgroundGradient: "",
          vignetteStrength: 0, vignetteColor: "0,0,0", colorFilter: "",
          transitionType: "fade", chromaKey: "", chromaKeyThreshold: 50,
          motionBlur: 0, pixelate: 0, scanlines: false, scanlineIntensity: 30, filmGrain: 0
        }
      },

      /* ── Slide 49 ── */
      {
        src: "https://cdn.onslaught2342.qzz.io/assets/videos/pptx/49.webm",
        loop: false, muted: true, transition: { type: "blinds", duration: 0.9, easing: "linear" }, sources: [],
        background: {
          type: "topography", color: "120", opacity: 1, blendMode: "screen",
          saturation: 60, brightness: 45, speed: 1, intensity: 50, scale: 1,
          turbulence: 50, direction: 180, secondaryEffect: null, secondaryOpacity: 0.5,
          secondaryColor: "180", effectLayers: [], backgroundGradient: "",
          vignetteStrength: 0, vignetteColor: "0,0,0", colorFilter: "",
          transitionType: "fade", chromaKey: "", chromaKeyThreshold: 50,
          motionBlur: 0, pixelate: 0, scanlines: false, scanlineIntensity: 30, filmGrain: 0
        }
      },

      /* ── Slide 50 ── */
      {
        src: "https://cdn.onslaught2342.qzz.io/assets/videos/pptx/50.webm",
        loop: false, muted: true, transition: { type: "rotate", duration: 1.2, easing: "ease" }, sources: [],
        background: {
          type: "prismRefraction", color: "0", opacity: 1, blendMode: "screen",
          saturation: 85, brightness: 50, speed: 1, intensity: 55, scale: 1,
          turbulence: 50, direction: 180, secondaryEffect: null, secondaryOpacity: 0.5,
          secondaryColor: "180", effectLayers: [], backgroundGradient: "",
          vignetteStrength: 0, vignetteColor: "0,0,0", colorFilter: "",
          transitionType: "fade", chromaKey: "", chromaKeyThreshold: 50,
          motionBlur: 0, pixelate: 0, scanlines: false, scanlineIntensity: 30, filmGrain: 0
        }
      },

      /* ── Slide 51 ── */
      {
        src: "https://cdn.onslaught2342.qzz.io/assets/videos/pptx/7.webm",
        loop: false, muted: true, transition: { type: "slideRight", duration: 0.7, easing: "ease-in" }, sources: [],
        background: {
          type: "powerNexus", color: "200", opacity: 1, blendMode: "screen",
          saturation: 100, brightness: 60, speed: 1, intensity: 70, scale: 1,
          turbulence: 60, direction: 180, secondaryEffect: null, secondaryOpacity: 0.5,
          secondaryColor: "300", effectLayers: [], backgroundGradient: "",
          vignetteStrength: 20, vignetteColor: "0,0,30", colorFilter: "",
          transitionType: "fade", chromaKey: "", chromaKeyThreshold: 50,
          motionBlur: 0, pixelate: 0, scanlines: false, scanlineIntensity: 30, filmGrain: 0
        }
      },
      /* ── Slide 52 ── */
      {
        src: "", loop: false, muted: true, transition: { type: "wipeDown", duration: 0.8, easing: "ease-out" }, sources: [],
        background: { type: "sandStorm", color: "35", opacity: 1, blendMode: "screen", saturation: 100, brightness: 50, speed: 1, intensity: 60, scale: 1, turbulence: 70, direction: 180, secondaryEffect: null, secondaryOpacity: 0.5, secondaryColor: "30", effectLayers: [], backgroundGradient: "", vignetteStrength: 15, vignetteColor: "0,0,20", colorFilter: "", transitionType: "fade", chromaKey: "", chromaKeyThreshold: 50, motionBlur: 0, pixelate: 0, scanlines: false, scanlineIntensity: 30, filmGrain: 0 }
      },
      /* ── Slide 53 ── */
      {
        src: "", loop: false, muted: true, transition: { type: "bounce", duration: 0.9, easing: "ease" }, sources: [],
        background: { type: "bubbleRise", color: "200", opacity: 1, blendMode: "screen", saturation: 100, brightness: 50, speed: 1, intensity: 55, scale: 1.2, turbulence: 50, direction: 180, secondaryEffect: null, secondaryOpacity: 0.5, secondaryColor: "220", effectLayers: [], backgroundGradient: "", vignetteStrength: 10, vignetteColor: "0,0,20", colorFilter: "", transitionType: "fade", chromaKey: "", chromaKeyThreshold: 50, motionBlur: 0, pixelate: 0, scanlines: false, scanlineIntensity: 30, filmGrain: 0 }
      },
      /* ── Slide 54 ── */
      {
        src: "", loop: false, muted: true, transition: { type: "pixelate", duration: 0.7, easing: "linear" }, sources: [],
        background: { type: "gravityWell", color: "280", opacity: 1, blendMode: "screen", saturation: 100, brightness: 50, speed: 1, intensity: 65, scale: 1, turbulence: 60, direction: 180, secondaryEffect: null, secondaryOpacity: 0.5, secondaryColor: "300", effectLayers: [], backgroundGradient: "", vignetteStrength: 20, vignetteColor: "0,0,30", colorFilter: "", transitionType: "fade", chromaKey: "", chromaKeyThreshold: 50, motionBlur: 0, pixelate: 0, scanlines: false, scanlineIntensity: 30, filmGrain: 0 }
      },
      /* ── Slide 55 ── */
      {
        src: "", loop: false, muted: true, transition: { type: "splitHorizontal", duration: 1.0, easing: "ease-in" }, sources: [],
        background: { type: "neuralNetwork", color: "180", opacity: 1, blendMode: "screen", saturation: 100, brightness: 50, speed: 1, intensity: 60, scale: 1, turbulence: 55, direction: 180, secondaryEffect: null, secondaryOpacity: 0.5, secondaryColor: "200", effectLayers: [], backgroundGradient: "", vignetteStrength: 10, vignetteColor: "0,0,20", colorFilter: "", transitionType: "fade", chromaKey: "", chromaKeyThreshold: 50, motionBlur: 0, pixelate: 0, scanlines: false, scanlineIntensity: 30, filmGrain: 0 }
      },
      /* ── Slide 56 ── */
      {
        src: "", loop: false, muted: true, transition: { type: "doorway", duration: 1.1, easing: "ease-in-out" }, sources: [],
        background: { type: "pendulum", color: "45", opacity: 1, blendMode: "screen", saturation: 100, brightness: 50, speed: 1, intensity: 50, scale: 1, turbulence: 60, direction: 180, secondaryEffect: null, secondaryOpacity: 0.5, secondaryColor: "60", effectLayers: [], backgroundGradient: "", vignetteStrength: 10, vignetteColor: "0,0,20", colorFilter: "", transitionType: "fade", chromaKey: "", chromaKeyThreshold: 50, motionBlur: 0, pixelate: 0, scanlines: false, scanlineIntensity: 30, filmGrain: 0 }
      },
      /* ── Slide 57 ── */
      {
        src: "", loop: false, muted: true, transition: { type: "fade", duration: 1.5, easing: "ease-out" }, sources: [],
        background: { type: "flockingBoids", color: "160", opacity: 1, blendMode: "screen", saturation: 100, brightness: 50, speed: 1, intensity: 55, scale: 1, turbulence: 65, direction: 180, secondaryEffect: null, secondaryOpacity: 0.5, secondaryColor: "140", effectLayers: [], backgroundGradient: "", vignetteStrength: 10, vignetteColor: "0,0,20", colorFilter: "", transitionType: "fade", chromaKey: "", chromaKeyThreshold: 50, motionBlur: 0, pixelate: 0, scanlines: false, scanlineIntensity: 30, filmGrain: 0 }
      },
      /* ── Slide 58 ── */
      {
        src: "", loop: false, muted: true, transition: { type: "zoomOut", duration: 0.8, easing: "ease" }, sources: [],
        background: { type: "pixelSort", color: "0", opacity: 1, blendMode: "screen", saturation: 100, brightness: 50, speed: 1, intensity: 50, scale: 1, turbulence: 50, direction: 180, secondaryEffect: null, secondaryOpacity: 0.5, secondaryColor: "180", effectLayers: [], backgroundGradient: "", vignetteStrength: 0, vignetteColor: "0,0,20", colorFilter: "", transitionType: "fade", chromaKey: "", chromaKeyThreshold: 50, motionBlur: 0, pixelate: 0, scanlines: false, scanlineIntensity: 30, filmGrain: 0 }
      },
      /* ── Slide 59 ── */
      {
        src: "", loop: false, muted: true, transition: { type: "slideUp", duration: 0.6, easing: "ease-in" }, sources: [],
        background: { type: "spiralGalaxy", color: "220", opacity: 1, blendMode: "screen", saturation: 100, brightness: 50, speed: 1, intensity: 60, scale: 1, turbulence: 50, direction: 180, secondaryEffect: null, secondaryOpacity: 0.5, secondaryColor: "240", effectLayers: [], backgroundGradient: "", vignetteStrength: 15, vignetteColor: "0,0,30", colorFilter: "", transitionType: "fade", chromaKey: "", chromaKeyThreshold: 50, motionBlur: 0, pixelate: 0, scanlines: false, scanlineIntensity: 30, filmGrain: 0 }
      },
      /* ── Slide 60 ── */
      {
        src: "", loop: false, muted: true, transition: { type: "splitVertical", duration: 1.0, easing: "ease-in-out" }, sources: [],
        background: { type: "waterColor", color: "30", opacity: 1, blendMode: "source-over", saturation: 100, brightness: 50, speed: 1, intensity: 55, scale: 1.1, turbulence: 60, direction: 180, secondaryEffect: null, secondaryOpacity: 0.5, secondaryColor: "50", effectLayers: [], backgroundGradient: "", vignetteStrength: 10, vignetteColor: "0,0,20", colorFilter: "", transitionType: "fade", chromaKey: "", chromaKeyThreshold: 50, motionBlur: 0, pixelate: 0, scanlines: false, scanlineIntensity: 30, filmGrain: 0 }
      },
      /* ── Slide 61 ── */
      {
        src: "", loop: false, muted: true, transition: { type: "crossZoom", duration: 0.9, easing: "linear" }, sources: [],
        background: { type: "chandelier", color: "40", opacity: 1, blendMode: "screen", saturation: 100, brightness: 50, speed: 1, intensity: 60, scale: 1, turbulence: 50, direction: 180, secondaryEffect: null, secondaryOpacity: 0.5, secondaryColor: "60", effectLayers: [], backgroundGradient: "", vignetteStrength: 15, vignetteColor: "0,0,20", colorFilter: "", transitionType: "fade", chromaKey: "", chromaKeyThreshold: 50, motionBlur: 0, pixelate: 0, scanlines: false, scanlineIntensity: 30, filmGrain: 0 }
       },
      /* ── Slide 62 ── */
      {
        src: "", loop: false, muted: true, transition: { type: "fade", duration: 0.8, easing: "ease" }, sources: [],
        background: { type: "morningDew", color: "150", opacity: 1, blendMode: "screen", saturation: 100, brightness: 50, speed: 1, intensity: 55, scale: 1, turbulence: 40, direction: 180, secondaryEffect: null, secondaryOpacity: 0.5, secondaryColor: "160", effectLayers: [], backgroundGradient: "", vignetteStrength: 10, vignetteColor: "0,0,15", colorFilter: "", transitionType: "fade", chromaKey: "", chromaKeyThreshold: 50, motionBlur: 0, pixelate: 0, scanlines: false, scanlineIntensity: 30, filmGrain: 0 }
      },
      /* ── Slide 63 ── */
      {
        src: "", loop: false, muted: true, transition: { type: "slideLeft", duration: 0.9, easing: "ease" }, sources: [],
        background: { type: "cherryBlossom", color: "340", opacity: 1, blendMode: "screen", saturation: 100, brightness: 50, speed: 1, intensity: 60, scale: 1, turbulence: 50, direction: 180, secondaryEffect: null, secondaryOpacity: 0.5, secondaryColor: "350", effectLayers: [], backgroundGradient: "", vignetteStrength: 12, vignetteColor: "0,0,18", colorFilter: "", transitionType: "fade", chromaKey: "", chromaKeyThreshold: 50, motionBlur: 0, pixelate: 0, scanlines: false, scanlineIntensity: 30, filmGrain: 0 }
      },
      /* ── Slide 64 ── */
      {
        src: "", loop: false, muted: true, transition: { type: "zoomIn", duration: 0.8, easing: "ease" }, sources: [],
        background: { type: "mintBreeze", color: "160", opacity: 1, blendMode: "screen", saturation: 100, brightness: 50, speed: 1, intensity: 50, scale: 1, turbulence: 45, direction: 90, secondaryEffect: null, secondaryOpacity: 0.5, secondaryColor: "170", effectLayers: [], backgroundGradient: "", vignetteStrength: 8, vignetteColor: "0,0,12", colorFilter: "", transitionType: "fade", chromaKey: "", chromaKeyThreshold: 50, motionBlur: 0, pixelate: 0, scanlines: false, scanlineIntensity: 30, filmGrain: 0 }
      },
      /* ── Slide 65 ── */
      {
        src: "", loop: false, muted: true, transition: { type: "dissolve", duration: 1.0, easing: "ease" }, sources: [],
        background: { type: "freshSplash", color: "190", opacity: 1, blendMode: "screen", saturation: 100, brightness: 50, speed: 1, intensity: 55, scale: 1, turbulence: 50, direction: 180, secondaryEffect: null, secondaryOpacity: 0.5, secondaryColor: "200", effectLayers: [], backgroundGradient: "", vignetteStrength: 10, vignetteColor: "0,0,15", colorFilter: "", transitionType: "fade", chromaKey: "", chromaKeyThreshold: 50, motionBlur: 0, pixelate: 0, scanlines: false, scanlineIntensity: 30, filmGrain: 0 }
      },
      /* ── Slide 66 ── */
      {
        src: "", loop: false, muted: true, transition: { type: "fade", duration: 1.0, easing: "ease" }, sources: [],
        background: { type: "springBloom", color: "340", opacity: 1, blendMode: "screen", saturation: 100, brightness: 50, speed: 1, intensity: 50, scale: 1, turbulence: 40, direction: 180, secondaryEffect: null, secondaryOpacity: 0.5, secondaryColor: "280", effectLayers: [], backgroundGradient: "", vignetteStrength: 10, vignetteColor: "0,0,15", colorFilter: "", transitionType: "fade", chromaKey: "", chromaKeyThreshold: 50, motionBlur: 0, pixelate: 0, scanlines: false, scanlineIntensity: 30, filmGrain: 0 }
      }
    ]
  },

  /* ── Controls ── */
  controls: {
    arrowNavigation: true,
    autoPlayFirst: true,
    autoAdvance: true,
    autoAdvanceDelay: 0,
    transitionDuration: 800,
    swipeNavigation: true,
    pauseOnHover: false,
    showSlideNumber: true,
    showProgressBar: false,
    loopPlaylist: true,
    keyboardShortcutsEnabled: true,
    clickNavigation: false,
    scrollNavigation: false,
    fullscreenEnabled: true,
    idleHideUI: false,
    idleTimeout: 5,
    gestureZoom: false,
    doubleTapAction: "none",
    randomTransitions: false,
    builderEnabled: true,
    previewPageEnabled: true,
    remoteEnabled: true
  },

  /* ── Audio ── */
  audio: {
    enabled: false,
    volume: 1,
    fadeIn: true,
    fadeInDuration: 500,
    fadeOut: true,
    fadeOutDuration: 500,
    crossfade: false,
    crossfadeDuration: 1000,
    globalMute: false
  },

  /* ── Theme ── */
  theme: {
    primaryColor: "#ffffff",
    secondaryColor: "#888888",
    accentColor: "#00aaff",
    fontFamily: "system-ui, sans-serif",
    uiOpacity: 0.95,
    uiPosition: "top-right",
    darkMode: true
  },

  /* ── Performance ── */
  performance: {
    maxFPS: 60,
    resolution: 1,
    enableGPU: true,
    maxParticles: 5000,
    enableBloom: false,
    antialiasing: true
  },

  /* ── Export ── */
  export: {
    format: "json",
    includeAssets: false,
    minify: false,
    embedVideos: false
  },

  /* ── Watermark ── */
  watermark: {
    enabled: false,
    mode: "text",
    text: "",
    imageUrl: "",
    imageWidth: 100,
    imageHeight: 0,
    position: "bottom-right",
    x: 50,
    y: 50,
    opacity: 0.3,
    fontSize: 14,
    color: "#ffffff",
    rotation: 0
  },

  /* ── Accessibility ── */
  accessibility: {
    reducedMotion: false,
    highContrast: false,
    screenReaderAnnouncements: false,
    focusIndicators: true
  }
};

// ── All slides now have explicit transitions — no fallback loop needed ──
// ── Cycle video URLs: only 11 videos exist, reuse after slide 11 ──
const VIDEO_BASE = "https://cdn.onslaught2342.qzz.io/assets/videos/pptx/";
CONFIG.video.playlist.forEach((item, i) => {
  const videoNum = (i % 11) + 1;
  item.src = `${VIDEO_BASE}${videoNum}.webm`;
});
