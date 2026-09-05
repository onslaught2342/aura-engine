// Sanitizers for free-text CSS values that may originate from imported configs.
// Goal: prevent CSS injection (extra properties / corrupted syntax) via
// malicious values. Returns undefined when the input is unsafe so callers
// can fall back to a default.

const UNSAFE_RE = /url\(|expression\(|[;{}<>]/i;

const FILTER_FN_RE =
  /^(\s*(blur|brightness|contrast|drop-shadow|grayscale|hue-rotate|invert|opacity|saturate|sepia)\([^()]*\)\s*)+$/i;

export function sanitizeFilter(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  if (UNSAFE_RE.test(value)) return undefined;
  if (!FILTER_FN_RE.test(value)) return undefined;
  return value;
}

// Accepts "r,g,b" with each component 0-255.
export function sanitizeRgbTriplet(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const m = value.trim().match(/^(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})$/);
  if (!m) return undefined;
  const parts = [m[1], m[2], m[3]].map(Number);
  if (parts.some((n) => n < 0 || n > 255)) return undefined;
  return parts.join(",");
}

// Allow only gradient() / hsl() / rgb() / hex / named-color-like background
// values. Rejects anything containing url(), expression(), or statement
// separators that could break out of the CSS context.
export function sanitizeBackground(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const v = value.trim();
  if (UNSAFE_RE.test(v)) return undefined;
  // Allowed: gradients, color functions, hex, simple keywords.
  const ALLOWED_RE =
    /^((linear|radial|conic|repeating-linear|repeating-radial|repeating-conic)-gradient\([^;{}<>]*\)|(rgb|rgba|hsl|hsla|hwb|color|oklch|oklab)\([^;{}<>]*\)|#[0-9a-fA-F]{3,8}|[a-zA-Z]+)$/;
  return ALLOWED_RE.test(v) ? v : undefined;
}
