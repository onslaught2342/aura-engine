/* Tiny event bus so ImpactPeek buttons can broadcast which field is being
 * previewed. The docked LivePreview subscribes and renders an A/B split
 * of the current slide instead of scattering flash-bang mini-stages
 * around the builder. Zero cost when idle. */

import type { VideoItem } from "@/engine/config";
import type { ImpactVariant } from "@/components/builder/ImpactPreview";

export interface ImpactState {
  slide: VideoItem;
  path: string;
  variant: ImpactVariant;
  current: unknown;
  label: string;
}

type Listener = (s: ImpactState | null) => void;

let state: ImpactState | null = null;
const listeners = new Set<Listener>();

export const impactBus = {
  get: () => state,
  set(next: ImpactState | null) {
    state = next;
    listeners.forEach((l) => l(state));
  },
  subscribe(fn: Listener) {
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  },
};
