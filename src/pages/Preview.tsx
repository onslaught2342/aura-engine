import { Link } from "react-router-dom";
import { ArrowLeft, Zap } from "lucide-react";
import { backgroundRegistry } from "@/engine/backgrounds/registry";
import { EffectCard } from "@/components/preview/EffectCard";
import { TransitionCard } from "@/components/preview/TransitionCard";
import { FeatureCard } from "@/components/preview/FeatureCard";
import { EffectBuilder } from "@/components/preview/EffectBuilder";
import { SLIDE_TRANSITION_TYPES, SLIDE_TRANSITION_EASINGS } from "@/components/SlideTransition";
import { useEffect, useRef, useState } from "react";

import { EFFECT_NAMES } from "@/engine/effectNames";

const BLEND_MODES: GlobalCompositeOperation[] = [
  "source-over", "screen", "multiply", "overlay", "lighten",
  "color-dodge", "hard-light", "soft-light", "difference", "exclusion",
  "hue", "saturation", "color", "luminosity",
];

const BLEND_MODE_NAMES: Record<string, string> = {
  "source-over": "Normal", screen: "Screen", multiply: "Multiply",
  overlay: "Overlay", lighten: "Lighten", "color-dodge": "Color Dodge",
  "hard-light": "Hard Light", "soft-light": "Soft Light",
  difference: "Difference", exclusion: "Exclusion", hue: "Hue",
  saturation: "Saturation", color: "Color", luminosity: "Luminosity",
};

const WATERMARK_POSITIONS = [
  "top-left", "top-center", "top-right",
  "bottom-left", "bottom-center", "bottom-right",
];

const COLOR_MODES = ["solid", "gradient", "rainbow", "temperature"];

/* ---------- Blend Mode Card ---------- */
const BlendModeCard = ({ mode }: { mode: GlobalCompositeOperation }) => (
  <FeatureCard title={BLEND_MODE_NAMES[mode] || mode} configPath={`background.blendMode: "${mode}"`}>
    <div className="absolute inset-0">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-purple-700" />
      <canvas
        ref={(canvas) => {
          if (!canvas) return;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          canvas.width = 200; canvas.height = 140;
          ctx.fillStyle = "hsl(220, 60%, 30%)";
          ctx.fillRect(0, 0, 200, 140);
          ctx.globalCompositeOperation = mode;
          ctx.fillStyle = "hsl(40, 90%, 55%)";
          ctx.beginPath(); ctx.arc(100, 70, 50, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "hsl(340, 80%, 55%)";
          ctx.beginPath(); ctx.arc(70, 90, 40, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "hsl(160, 70%, 50%)";
          ctx.beginPath(); ctx.arc(130, 90, 40, 0, Math.PI * 2); ctx.fill();
        }}
        className="absolute inset-0 w-full h-full"
      />
    </div>
  </FeatureCard>
);

/* ---------- Post Processing Card ---------- */
const PostProcessCard = ({ type }: { type: string }) => {
  const configMap: Record<string, string> = {
    scanlines: "background.scanlines: true",
    "film-grain": "background.filmGrain: 50",
    pixelation: "background.pixelate: 4",
    vignette: "background.vignetteStrength: 0.6",
    "color-filter": "background.colorFilter: 'sepia'",
    "motion-blur": "background.motionBlur: 3",
  };
  const filterMap: Record<string, React.CSSProperties> = {
    scanlines: {},
    "film-grain": {},
    pixelation: { imageRendering: "pixelated" as const },
    vignette: {},
    "color-filter": { filter: "sepia(0.6) hue-rotate(20deg)" },
    "motion-blur": { filter: "blur(3px)" },
  };
  const style = filterMap[type] || {};

  return (
    <FeatureCard title={type.replace("-", " ").replace(/\b\w/g, (c) => c.toUpperCase())} configPath={configMap[type]}>
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-cyan-500" style={style} />
      {type === "scanlines" && (
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)",
        }} />
      )}
      {type === "film-grain" && (
        <div className="absolute inset-0 pointer-events-none opacity-30" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }} />
      )}
      {type === "vignette" && (
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.7) 100%)",
        }} />
      )}
      {type === "pixelation" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="grid grid-cols-8 grid-rows-6 w-full h-full">
            {Array.from({ length: 48 }).map((_, i) => (
              <div key={i} style={{ background: `hsl(${200 + (i * 3)}, 60%, ${30 + (i % 8) * 5}%)` }} />
            ))}
          </div>
        </div>
      )}
    </FeatureCard>
  );
};

/* ---------- Watermark Position Card ---------- */
const WatermarkCard = ({ position }: { position: string }) => {
  const posClasses: Record<string, string> = {
    "top-left": "top-2 left-2",
    "top-center": "top-2 left-1/2 -translate-x-1/2",
    "top-right": "top-2 right-2",
    "bottom-left": "bottom-2 left-2",
    "bottom-center": "bottom-2 left-1/2 -translate-x-1/2",
    "bottom-right": "bottom-2 right-2",
  };

  return (
    <FeatureCard title={position.replace("-", " ").replace(/\b\w/g, (c) => c.toUpperCase())} configPath={`watermark.position: "${position}"`}>
      <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-900" />
      <div className={`absolute ${posClasses[position]} text-[10px] font-bold text-foreground/60 bg-background/20 backdrop-blur-sm px-1.5 py-0.5 rounded border border-border/20`}>
        © Watermark
      </div>
    </FeatureCard>
  );
};

/* ---------- Easing Card ---------- */
const EasingCard = ({ easing }: { easing: string }) => {
  const [cycle, setCycle] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const iv = setInterval(() => setCycle((c) => c + 1), 2000);
    return () => clearInterval(iv);
  }, []);

  const isRight = cycle % 2 === 0;

  return (
    <FeatureCard title={easing} configPath={`transition.easing: "${easing}"`}>
      <div className="absolute inset-0 bg-gradient-to-b from-slate-800 to-slate-900 flex items-center px-3">
        <div
          ref={ref}
          className="w-5 h-5 rounded-full bg-primary shadow-lg shadow-primary/50"
          style={{
            transition: `transform 1.4s ${easing}`,
            transform: `translateX(${isRight ? 150 : 0}px)`,
          }}
        />
      </div>
    </FeatureCard>
  );
};

/* ---------- Color Mode Card ---------- */
const ColorModeCard = ({ mode }: { mode: string }) => {
  const bgMap: Record<string, string> = {
    solid: "hsl(250, 60%, 50%)",
    gradient: "linear-gradient(135deg, hsl(250, 60%, 50%), hsl(320, 60%, 50%))",
    rainbow: "linear-gradient(90deg, hsl(0,80%,50%), hsl(60,80%,50%), hsl(120,80%,50%), hsl(180,80%,50%), hsl(240,80%,50%), hsl(300,80%,50%), hsl(360,80%,50%))",
    temperature: "linear-gradient(90deg, hsl(240,80%,50%), hsl(180,60%,50%), hsl(60,80%,50%), hsl(30,90%,50%), hsl(0,80%,50%))",
  };

  return (
    <FeatureCard title={mode.charAt(0).toUpperCase() + mode.slice(1)} configPath={`effectLayers[n].colorMode: "${mode}"`}>
      <div className="absolute inset-0" style={{ background: bgMap[mode] }} />
    </FeatureCard>
  );
};

/* ---------- Video Placement Card ---------- */
const VideoPlacementCard = ({ mode }: { mode: string }) => {
  const isContain = mode === "contain";
  return (
    <FeatureCard title={mode.charAt(0).toUpperCase() + mode.slice(1)} configPath={`sources[n].fit: "${mode}"`}>
      <div className="absolute inset-0 bg-slate-900 flex items-center justify-center">
        <div
          className="border-2 border-dashed border-primary/50 bg-primary/10 flex items-center justify-center text-[10px] font-mono text-foreground/60"
          style={{
            width: isContain ? "70%" : "100%",
            height: isContain ? "70%" : "100%",
          }}
        >
          {mode === "contain" ? "16:9 fit inside" : "fills frame"}
        </div>
      </div>
    </FeatureCard>
  );
};

/* ========== Section Component ========== */
const Section = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => (
  <section id={id} className="scroll-mt-20">
    <div className="sticky top-[52px] z-10 py-4 backdrop-blur-xl bg-background/60 border-b border-border/10 mb-8">
      <h2 className="text-2xl font-bold tracking-tight text-foreground/90">{title}</h2>
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 pb-16">
      {children}
    </div>
  </section>
);

/* ========== Main Preview Page ========== */
const effectKeys = Object.keys(backgroundRegistry);

const Preview = () => {
  const [builderOpen, setBuilderOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center gap-4 px-6 py-3 backdrop-blur-xl bg-background/70 border-b border-border/20">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Editor
        </Link>
        <h1 className="text-lg font-bold tracking-tight">Feature Preview</h1>

        {/* Jump links */}
        <div className="hidden md:flex items-center gap-3 ml-auto text-xs text-muted-foreground">
          {[
            ["effects", "Effects"],
            ["transitions", "Transitions"],
            ["blend", "Blend"],
            ["post", "Post-FX"],
            ["watermark", "Watermark"],
            ["easings", "Easings"],
            ["colors", "Colors"],
            ["video", "Video"],
          ].map(([id, label]) => (
            <a key={id} href={`#${id}`} className="hover:text-foreground transition-colors">
              {label}
            </a>
          ))}
          <button
            onClick={() => setBuilderOpen(!builderOpen)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              builderOpen
                ? "bg-primary text-primary-foreground"
                : "bg-accent/50 text-foreground hover:bg-accent"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Builder
          </button>
        </div>
      </nav>

      <div className="flex">
        <main className={`flex-1 min-w-0 px-6 pt-20 ${builderOpen ? "max-w-[calc(100%-380px)]" : "max-w-[1600px] mx-auto"}`}>
          {/* 1. Background Effects */}
          <Section id="effects" title={`Background Effects (${effectKeys.length})`}>
            {effectKeys.map((key) => (
              <EffectCard key={key} effectKey={key} name={EFFECT_NAMES[key] || key} configPath={`background.type: "${key}"`} />
            ))}
          </Section>

          {/* 2. Slide Transitions */}
          <Section id="transitions" title={`Slide Transitions (${SLIDE_TRANSITION_TYPES.length})`}>
            {SLIDE_TRANSITION_TYPES.map((t) => (
              <TransitionCard key={t} transitionType={t} configPath={`transition.type: "${t}"`} />
            ))}
          </Section>

          {/* 3. Blend Modes */}
          <Section id="blend" title={`Blend Modes (${BLEND_MODES.length})`}>
            {BLEND_MODES.map((m) => (
              <BlendModeCard key={m} mode={m} />
            ))}
          </Section>

          {/* 4. Post-Processing */}
          <Section id="post" title="Post-Processing">
            {["scanlines", "film-grain", "pixelation", "vignette", "color-filter", "motion-blur"].map((t) => (
              <PostProcessCard key={t} type={t} />
            ))}
          </Section>

          {/* 5. Watermark Positions */}
          <Section id="watermark" title="Watermark Positions">
            {WATERMARK_POSITIONS.map((p) => (
              <WatermarkCard key={p} position={p} />
            ))}
          </Section>

          {/* 6. Transition Easings */}
          <Section id="easings" title="Transition Easings">
            {SLIDE_TRANSITION_EASINGS.map((e) => (
              <EasingCard key={e} easing={e} />
            ))}
          </Section>

          {/* 7. Color Modes */}
          <Section id="colors" title="Color Modes">
            {COLOR_MODES.map((m) => (
              <ColorModeCard key={m} mode={m} />
            ))}
          </Section>

          {/* 8. Video Placement */}
          <Section id="video" title="Video Placement">
            <VideoPlacementCard mode="contain" />
            <VideoPlacementCard mode="cover" />
          </Section>

          <div className="py-16 text-center text-sm text-muted-foreground">
            End of preview — {effectKeys.length} effects, {SLIDE_TRANSITION_TYPES.length} transitions, {BLEND_MODES.length} blend modes
          </div>
        </main>

        {/* Effect Builder Panel */}
        {builderOpen && <EffectBuilder onClose={() => setBuilderOpen(false)} />}
      </div>
    </div>
  );
};

export default Preview;
