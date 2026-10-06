import { memo } from "react";

/**
 * Static, non-animated workspace backdrop for the Builder.
 *
 * Deliberately calm and identical on every tab and every slide: a near-black
 * base, a faint dot grid and a soft vignette. Nothing here reflects the slide
 * being edited — all effects live inside the preview panel so an intense
 * configuration can never flashbang the editing surface.
 */
export const BuilderAmbient = memo(function BuilderAmbient() {
  return (
    <div aria-hidden className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
      <div className="absolute inset-0" style={{ background: "#08090b" }} />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
          opacity: 0.5,
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.05) 0%, transparent 55%), radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.75) 100%)",
        }}
      />
    </div>
  );
});
