/* Shared in-memory store for handing a fully-built EngineConfig
 * from /builder back to the live presentation at /. */

import type { EngineConfig } from "@/engine/config";

let pending: EngineConfig | null = null;
const listeners = new Set<() => void>();

export const builderStore = {
  set(config: EngineConfig) {
    pending = config;
    listeners.forEach((l) => l());
  },
  consume(): EngineConfig | null {
    const c = pending;
    pending = null;
    return c;
  },
  peek(): EngineConfig | null {
    return pending;
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
