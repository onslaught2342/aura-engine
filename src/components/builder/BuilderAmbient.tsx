import { memo, useMemo } from "react";
import { BackgroundCanvas } from "@/components/BackgroundCanvas";
import type { SlideBackground } from "@/engine/config";

/**
 * Calm ambient MatrixRain background rendered behind the entire Builder UI.
 * Fixed, low opacity, no interaction. Never changes regardless of the slide
 * being edited — so intense per-slide effects stay corralled inside the
 * docked LivePreview and can't flashbang the editor surface.
 */
export const BuilderAmbient = memo(function BuilderAmbient() {
  const bg = useMemo<SlideBackground>(() => ({
    type: "MatrixRain",
    color: "150, 60%, 45%",
    opacity: 1,
    blendMode: "source-over",
    saturation: 60,
    brightness: 70,
    speed: 0.5,
    intensity: 25,
    scale: 1,
    turbulence: 20,
    direction: 180,
    secondaryEffect: null,
    secondaryOpacity: 0,
    secondaryColor: "",
    effectLayers: [],
    backgroundGradient: "radial-gradient(ellipse at center, #0a0f0d 0%, #05070a 70%)",
    vignetteStrength: 0.55,
    vignetteColor: "0, 0, 0",
    colorFilter: "",
    transitionType: "fade",
    chromaKey: "",
    chromaKeyThreshold: 0,
    motionBlur: 0,
    pixelate: 0,
    scanlines: false,
    scanlineIntensity: 0,
    filmGrain: 0,
  }), []);

  return (
    <div
      aria-hidden
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0, opacity: 0.18 }}
    >
      <BackgroundCanvas background={bg} transitionDuration={0} />
    </div>
  );
});
