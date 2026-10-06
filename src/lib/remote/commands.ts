import type { EngineConfig, VideoItem, TransitionType } from "@/engine/config";
import type { PresenterState, RemoteCommand, TimerState } from "./protocol";
import { EFFECT_NAMES } from "@/engine/effectNames";

export const TRANSITION_TYPES: TransitionType[] = [
  "fade", "wipeLeft", "wipeRight", "wipeUp", "wipeDown", "slideLeft", "slideRight", "slideUp", "slideDown",
  "zoomIn", "zoomOut", "zoomRotate", "flipX", "flipY", "blur", "dissolve", "iris", "swirl", "curtain", "glitch",
  "splitHorizontal", "splitVertical", "rotate", "bounce", "morph", "pixelate", "blinds", "diamond", "crossZoom", "doorway",
];

export const slideLabel = (item: VideoItem | undefined, i: number) =>
  item ? item.label || EFFECT_NAMES[item.background?.type] || item.background?.type || `Slide ${i + 1}` : "";

export function timerElapsed(t: TimerState, now = Date.now()): number {
  return t.base + (t.running ? Math.max(0, now - t.at) : 0);
}

const DEFAULT_RELAY_URL = "wss://slide-remote-relay.onslaught2342.workers.dev";

function normalizeRelayUrl(value: string): string {
  return value.trim().replace(/^http:/i, "ws:").replace(/^https:/i, "wss:").replace(/\/+$/, "");
}

export const RELAY_URL = normalizeRelayUrl(
  (import.meta.env.VITE_REMOTE_RELAY_URL as string | undefined) || DEFAULT_RELAY_URL
);

export function roomSocketUrl(room: string): string {
  return `${RELAY_URL}/room/${room}/ws`;
}

/** Local (presenter-side) state that is not part of EngineConfig. */
export interface LocalPresenterState {
  index: number;
  paused: boolean;
  muted: boolean;
  volume: number;
  blank: boolean;
  fullscreen: boolean;
}

export interface CommandResult {
  config?: EngineConfig;
  local?: Partial<LocalPresenterState>;
  /** Slide index to move to, if the command navigates. */
  jump?: number;
  /** Playback intent forwarded to the video player. */
  playback?: "play" | "pause" | "toggle";
  fullscreen?: boolean;
  playlist?: VideoItem[];
  timer?: TimerState;
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** Pure reducer: turn a remote command into concrete changes for the presenter. */
export function applyCommand(
  cmd: RemoteCommand,
  config: EngineConfig,
  local: LocalPresenterState,
  total: number,
  playlist: VideoItem[] = [],
  timer?: TimerState
): CommandResult {
  switch (cmd.k) {
    case "next": {
      if (total === 0) return {};
      const next = local.index + 1;
      if (next >= total) return config.controls.loopPlaylist ? { jump: 0 } : {};
      return { jump: next };
    }
    case "prev": {
      if (total === 0) return {};
      const prev = local.index - 1;
      if (prev < 0) return config.controls.loopPlaylist ? { jump: total - 1 } : {};
      return { jump: prev };
    }
    case "goto": {
      if (!Number.isFinite(cmd.index)) return {};
      return { jump: clamp(Math.round(cmd.index), 0, Math.max(0, total - 1)) };
    }
    case "play":
      return { playback: "play", local: { paused: false } };
    case "pause":
      return { playback: "pause", local: { paused: true } };
    case "togglePlay":
      return { playback: "toggle", local: { paused: !local.paused } };
    case "mute":
      return {
        local: { muted: !!cmd.value },
        config: { ...config, audio: { ...config.audio, globalMute: !!cmd.value } },
      };
    case "volume": {
      const v = clamp(Number(cmd.value) || 0, 0, 1);
      return { local: { volume: v }, config: { ...config, video: { ...config.video, globalVolume: v } } };
    }
    case "blank":
      return { local: { blank: !!cmd.value } };
    case "fullscreen":
      return { fullscreen: !!cmd.value, local: { fullscreen: !!cmd.value } };
    case "resync":
      return {};
    case "setControls": {
      const patch = cmd.patch ?? {};
      const controls = { ...config.controls };
      if (typeof patch.autoAdvance === "boolean") controls.autoAdvance = patch.autoAdvance;
      if (Number.isFinite(patch.autoAdvanceDelay))
        controls.autoAdvanceDelay = clamp(Number(patch.autoAdvanceDelay), 0, 600);
      if (typeof patch.loopPlaylist === "boolean") controls.loopPlaylist = patch.loopPlaylist;
      if (typeof patch.randomTransitions === "boolean") controls.randomTransitions = patch.randomTransitions;
      if (Number.isFinite(patch.transitionDuration))
        controls.transitionDuration = clamp(Number(patch.transitionDuration), 0, 5000);
      if (typeof patch.showSlideNumber === "boolean") controls.showSlideNumber = patch.showSlideNumber;
      if (typeof patch.showProgressBar === "boolean") controls.showProgressBar = patch.showProgressBar;
      if (typeof patch.idleHideUI === "boolean") controls.idleHideUI = patch.idleHideUI;
      if (typeof patch.arrowNavigation === "boolean") controls.arrowNavigation = patch.arrowNavigation;
      if (typeof patch.swipeNavigation === "boolean") controls.swipeNavigation = patch.swipeNavigation;
      return { config: { ...config, controls } };
    }
    case "setVideo": {
      const patch = cmd.patch ?? {};
      const video = { ...config.video };
      if (patch.fit === "contain" || patch.fit === "cover") video.fit = patch.fit;
      if (Number.isFinite(patch.globalVolume)) video.globalVolume = clamp(Number(patch.globalVolume), 0, 1);
      return { config: { ...config, video } };
    }
    case "setSlideEffect": {
      const item = playlist[local.index];
      if (!item || typeof cmd.effect !== "string" || !(cmd.effect in EFFECT_NAMES)) return {};
      const next = playlist.slice();
      next[local.index] = { ...item, background: { ...item.background, type: cmd.effect } };
      return { playlist: next };
    }
    case "setTransition": {
      const item = playlist[local.index];
      if (!item || !TRANSITION_TYPES.includes(cmd.type as TransitionType)) return {};
      const base = item.transition ?? config.defaults.defaultTransition;
      const next = playlist.slice();
      next[local.index] = { ...item, transition: { ...base, type: cmd.type as TransitionType } };
      return { playlist: next };
    }
    case "timer": {
      if (!timer) return {};
      const now = Date.now();
      if (cmd.action === "start") return timer.running ? {} : { timer: { ...timer, running: true, at: now } };
      if (cmd.action === "pause") return timer.running ? { timer: { ...timer, running: false, base: timerElapsed(timer, now), at: now } } : {};
      if (cmd.action === "reset") return { timer: { ...timer, base: 0, at: now } };
      if (cmd.action === "countdown") return { timer: { ...timer, countdown: clamp(Math.round(Number(cmd.seconds) || 0), 0, 6 * 3600) } };
      return {};
    }
    default:
      return {};
  }
}

export function buildSnapshot(
  config: EngineConfig,
  local: LocalPresenterState,
  total: number,
  startedAt: number,
  playlist: VideoItem[] = [],
  timer: TimerState = { running: false, base: 0, at: 0, countdown: 0 }
): PresenterState {
  const cur = playlist[local.index];
  const nextIdx = local.index + 1 < playlist.length ? local.index + 1 : config.controls.loopPlaylist ? 0 : -1;
  return {
    index: local.index,
    total,
    paused: local.paused,
    muted: local.muted,
    volume: local.volume,
    blank: local.blank,
    fullscreen: local.fullscreen,
    fit: config.video.fit,
    controls: {
      autoAdvance: config.controls.autoAdvance,
      autoAdvanceDelay: config.controls.autoAdvanceDelay,
      loopPlaylist: config.controls.loopPlaylist,
      randomTransitions: config.controls.randomTransitions,
      transitionDuration: config.controls.transitionDuration,
      showSlideNumber: config.controls.showSlideNumber,
      showProgressBar: config.controls.showProgressBar,
      idleHideUI: config.controls.idleHideUI,
      arrowNavigation: config.controls.arrowNavigation,
      swipeNavigation: config.controls.swipeNavigation,
    },
    startedAt,
    timer,
    label: slideLabel(cur, local.index),
    nextLabel: nextIdx >= 0 ? slideLabel(playlist[nextIdx], nextIdx) : "",
    notes: (cur?.notes ?? "").slice(0, 4000),
    effect: cur?.background?.type ?? "",
    transition: (cur?.transition ?? config.defaults.defaultTransition)?.type ?? "",
  };
}
