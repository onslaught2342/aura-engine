export const SLIDE_TRANSITION_TYPES = [
  "fade", "wipeLeft", "wipeRight", "wipeUp", "wipeDown",
  "slideLeft", "slideRight", "slideUp", "slideDown",
  "zoomIn", "zoomOut", "zoomRotate",
  "flipX", "flipY", "blur", "dissolve", "iris",
  "swirl", "curtain", "glitch",
  "splitHorizontal", "splitVertical", "rotate", "bounce", "morph",
  "pixelate", "blinds", "diamond", "crossZoom", "doorway",
] as const;

export const SLIDE_TRANSITION_NAMES: Record<string, string> = {
  fade: "Fade",
  wipeLeft: "Wipe Left",
  wipeRight: "Wipe Right",
  wipeUp: "Wipe Up",
  wipeDown: "Wipe Down",
  slideLeft: "Slide Left",
  slideRight: "Slide Right",
  slideUp: "Slide Up",
  slideDown: "Slide Down",
  zoomIn: "Zoom In",
  zoomOut: "Zoom Out",
  zoomRotate: "Zoom Rotate",
  flipX: "Flip X",
  flipY: "Flip Y",
  blur: "Blur",
  dissolve: "Dissolve",
  iris: "Iris",
  swirl: "Swirl",
  curtain: "Curtain",
  glitch: "Glitch",
  splitHorizontal: "Split Horizontal",
  splitVertical: "Split Vertical",
  rotate: "Rotate",
  bounce: "Bounce",
  morph: "Morph",
  pixelate: "Pixelate",
  blinds: "Blinds",
  diamond: "Diamond",
  crossZoom: "Cross Zoom",
  doorway: "Doorway",
};

export const SLIDE_TRANSITION_EASINGS = [
  "linear", "ease", "ease-in", "ease-out", "ease-in-out",
] as const;

export function getEnterAnimation(type: string): {
  from: Record<string, string>;
  to: Record<string, string>;
} {
  switch (type) {
    case "fade":
      return { from: { opacity: "0" }, to: { opacity: "1" } };
    case "wipeLeft":
      return {
        from: { clipPath: "inset(0 0 0 100%)" },
        to: { clipPath: "inset(0 0 0 0)" },
      };
    case "wipeRight":
      return {
        from: { clipPath: "inset(0 100% 0 0)" },
        to: { clipPath: "inset(0 0 0 0)" },
      };
    case "wipeUp":
      return {
        from: { clipPath: "inset(100% 0 0 0)" },
        to: { clipPath: "inset(0 0 0 0)" },
      };
    case "wipeDown":
      return {
        from: { clipPath: "inset(0 0 100% 0)" },
        to: { clipPath: "inset(0 0 0 0)" },
      };
    case "slideLeft":
      return {
        from: { transform: "translateX(100%)" },
        to: { transform: "translateX(0)" },
      };
    case "slideRight":
      return {
        from: { transform: "translateX(-100%)" },
        to: { transform: "translateX(0)" },
      };
    case "slideUp":
      return {
        from: { transform: "translateY(100%)" },
        to: { transform: "translateY(0)" },
      };
    case "slideDown":
      return {
        from: { transform: "translateY(-100%)" },
        to: { transform: "translateY(0)" },
      };
    case "zoomIn":
      return {
        from: { transform: "scale(0)", opacity: "0" },
        to: { transform: "scale(1)", opacity: "1" },
      };
    case "zoomOut":
      return {
        from: { transform: "scale(2)", opacity: "0" },
        to: { transform: "scale(1)", opacity: "1" },
      };
    case "zoomRotate":
      return {
        from: { transform: "scale(0) rotate(180deg)", opacity: "0" },
        to: { transform: "scale(1) rotate(0deg)", opacity: "1" },
      };
    case "flipX":
      return {
        from: { transform: "perspective(1200px) rotateY(90deg)" },
        to: { transform: "perspective(1200px) rotateY(0deg)" },
      };
    case "flipY":
      return {
        from: { transform: "perspective(1200px) rotateX(90deg)" },
        to: { transform: "perspective(1200px) rotateX(0deg)" },
      };
    case "blur":
      return {
        from: { filter: "blur(30px)", opacity: "0" },
        to: { filter: "blur(0px)", opacity: "1" },
      };
    case "dissolve":
      return {
        from: { opacity: "0", filter: "brightness(2) saturate(0)" },
        to: { opacity: "1", filter: "brightness(1) saturate(1)" },
      };
    case "iris":
      return {
        from: { clipPath: "circle(0% at 50% 50%)" },
        to: { clipPath: "circle(100% at 50% 50%)" },
      };
    case "swirl":
      return {
        from: { transform: "scale(0) rotate(720deg)", opacity: "0" },
        to: { transform: "scale(1) rotate(0deg)", opacity: "1" },
      };
    case "curtain":
      return {
        from: { clipPath: "inset(0 50% 0 50%)" },
        to: { clipPath: "inset(0 0 0 0)" },
      };
    case "glitch":
      return {
        from: {
          clipPath: "polygon(0 0, 100% 0, 100% 20%, 0 20%)",
          filter: "hue-rotate(90deg) saturate(3)",
        },
        to: {
          clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)",
          filter: "hue-rotate(0deg) saturate(1)",
        },
      };
    case "splitHorizontal":
      return {
        from: { clipPath: "inset(50% 0 50% 0)" },
        to: { clipPath: "inset(0 0 0 0)" },
      };
    case "splitVertical":
      return {
        from: { clipPath: "inset(0 50% 0 50%)" },
        to: { clipPath: "inset(0 0 0 0)" },
      };
    case "rotate":
      return {
        from: { transform: "rotate(-90deg) scale(0.8)", opacity: "0", transformOrigin: "center center" },
        to: { transform: "rotate(0deg) scale(1)", opacity: "1", transformOrigin: "center center" },
      };
    case "bounce":
      return {
        from: { transform: "translateY(-100%) scale(0.9)", opacity: "0" },
        to: { transform: "translateY(0) scale(1)", opacity: "1" },
      };
    case "morph":
      return {
        from: { borderRadius: "50%", transform: "scale(0.3)", opacity: "0", clipPath: "circle(15% at 50% 50%)" },
        to: { borderRadius: "0%", transform: "scale(1)", opacity: "1", clipPath: "circle(100% at 50% 50%)" },
      };
    case "pixelate":
      return {
        from: { filter: "blur(20px) contrast(5)", opacity: "0" },
        to: { filter: "blur(0px) contrast(1)", opacity: "1" },
      };
    case "blinds":
      return {
        from: { clipPath: "inset(0 0 90% 0)" },
        to: { clipPath: "inset(0 0 0 0)" },
      };
    case "diamond":
      return {
        from: { clipPath: "polygon(50% 50%, 50% 50%, 50% 50%, 50% 50%)" },
        to: { clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" },
      };
    case "crossZoom":
      return {
        from: { transform: "scale(3)", filter: "blur(15px)", opacity: "0" },
        to: { transform: "scale(1)", filter: "blur(0px)", opacity: "1" },
      };
    case "doorway":
      return {
        from: { transform: "perspective(1200px) rotateY(-60deg)", transformOrigin: "left center", opacity: "0" },
        to: { transform: "perspective(1200px) rotateY(0deg)", transformOrigin: "left center", opacity: "1" },
      };
    default:
      return { from: { opacity: "0" }, to: { opacity: "1" } };
  }
}

export function getExitAnimation(type: string): {
  from: Record<string, string>;
  to: Record<string, string>;
} {
  switch (type) {
    case "fade":
      return { from: { opacity: "1" }, to: { opacity: "0" } };
    case "wipeLeft":
      return { from: { clipPath: "inset(0 0 0 0)" }, to: { clipPath: "inset(0 100% 0 0)" } };
    case "wipeRight":
      return { from: { clipPath: "inset(0 0 0 0)" }, to: { clipPath: "inset(0 0 0 100%)" } };
    case "wipeUp":
      return { from: { clipPath: "inset(0 0 0 0)" }, to: { clipPath: "inset(0 0 100% 0)" } };
    case "wipeDown":
      return { from: { clipPath: "inset(0 0 0 0)" }, to: { clipPath: "inset(100% 0 0 0)" } };
    case "slideLeft":
      return { from: { transform: "translateX(0)" }, to: { transform: "translateX(-100%)" } };
    case "slideRight":
      return { from: { transform: "translateX(0)" }, to: { transform: "translateX(100%)" } };
    case "slideUp":
      return { from: { transform: "translateY(0)" }, to: { transform: "translateY(-100%)" } };
    case "slideDown":
      return { from: { transform: "translateY(0)" }, to: { transform: "translateY(100%)" } };
    case "zoomIn":
      return { from: { transform: "scale(1)", opacity: "1" }, to: { transform: "scale(2)", opacity: "0" } };
    case "zoomOut":
      return { from: { transform: "scale(1)", opacity: "1" }, to: { transform: "scale(0)", opacity: "0" } };
    case "zoomRotate":
      return { from: { transform: "scale(1) rotate(0deg)", opacity: "1" }, to: { transform: "scale(0) rotate(-180deg)", opacity: "0" } };
    case "flipX":
      return { from: { transform: "perspective(1200px) rotateY(0deg)" }, to: { transform: "perspective(1200px) rotateY(-90deg)" } };
    case "flipY":
      return { from: { transform: "perspective(1200px) rotateX(0deg)" }, to: { transform: "perspective(1200px) rotateX(-90deg)" } };
    case "blur":
      return { from: { filter: "blur(0px)", opacity: "1" }, to: { filter: "blur(30px)", opacity: "0" } };
    case "dissolve":
      return { from: { opacity: "1", filter: "brightness(1) saturate(1)" }, to: { opacity: "0", filter: "brightness(2) saturate(0)" } };
    case "iris":
      return { from: { clipPath: "circle(100% at 50% 50%)" }, to: { clipPath: "circle(0% at 50% 50%)" } };
    case "swirl":
      return { from: { transform: "scale(1) rotate(0deg)", opacity: "1" }, to: { transform: "scale(0) rotate(-720deg)", opacity: "0" } };
    case "curtain":
      return { from: { clipPath: "inset(0 0 0 0)" }, to: { clipPath: "inset(0 50% 0 50%)" } };
    case "glitch":
      return {
        from: { clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)", filter: "hue-rotate(0deg) saturate(1)" },
        to: { clipPath: "polygon(0 80%, 100% 80%, 100% 100%, 0 100%)", filter: "hue-rotate(-90deg) saturate(3)" },
      };
    case "splitHorizontal":
      return { from: { clipPath: "inset(0 0 0 0)" }, to: { clipPath: "inset(50% 0 50% 0)" } };
    case "splitVertical":
      return { from: { clipPath: "inset(0 0 0 0)" }, to: { clipPath: "inset(0 50% 0 50%)" } };
    case "rotate":
      return { from: { transform: "rotate(0deg) scale(1)", opacity: "1", transformOrigin: "center center" }, to: { transform: "rotate(90deg) scale(0.8)", opacity: "0", transformOrigin: "center center" } };
    case "bounce":
      return { from: { transform: "translateY(0) scale(1)", opacity: "1" }, to: { transform: "translateY(100%) scale(0.9)", opacity: "0" } };
    case "morph":
      return { from: { borderRadius: "0%", transform: "scale(1)", opacity: "1", clipPath: "circle(100% at 50% 50%)" }, to: { borderRadius: "50%", transform: "scale(0.3)", opacity: "0", clipPath: "circle(15% at 50% 50%)" } };
    case "pixelate":
      return { from: { filter: "blur(0px) contrast(1)", opacity: "1" }, to: { filter: "blur(20px) contrast(5)", opacity: "0" } };
    case "blinds":
      return { from: { clipPath: "inset(0 0 0 0)" }, to: { clipPath: "inset(0 0 90% 0)" } };
    case "diamond":
      return { from: { clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" }, to: { clipPath: "polygon(50% 50%, 50% 50%, 50% 50%, 50% 50%)" } };
    case "crossZoom":
      return { from: { transform: "scale(1)", filter: "blur(0px)", opacity: "1" }, to: { transform: "scale(3)", filter: "blur(15px)", opacity: "0" } };
    case "doorway":
      return { from: { transform: "perspective(1200px) rotateY(0deg)", transformOrigin: "right center", opacity: "1" }, to: { transform: "perspective(1200px) rotateY(60deg)", transformOrigin: "right center", opacity: "0" } };
    default:
      return { from: { opacity: "1" }, to: { opacity: "0" } };
  }
}
