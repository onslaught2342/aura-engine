/* Shared wire protocol between the presenter page, the remote page and the
 * Cloudflare Durable Object relay.
 *
 * IMPORTANT: this file is mirrored verbatim at worker/src/protocol.ts.
 * Keep both copies byte-identical when changing frames.
 *
 * Design note: the socket only carries *volatile* state (which slide, playing,
 * volume, …). Everything static — slide names, the playlist, thumbnails — is
 * read by the remote from the very same site build it was served from, so the
 * relay stays tiny. */

export const PROTOCOL_VERSION = 3;

export type Role = "presenter" | "remote";

/* ── Commands (remote → presenter) ── */

export type RemoteCommand =
  | { k: "next" }
  | { k: "prev" }
  | { k: "goto"; index: number }
  | { k: "play" }
  | { k: "pause" }
  | { k: "togglePlay" }
  | { k: "mute"; value: boolean }
  | { k: "volume"; value: number }
  | { k: "blank"; value: boolean }
  | { k: "fullscreen"; value: boolean }
  | { k: "resync" }
  | {
      k: "setControls";
      patch: Partial<{
        autoAdvance: boolean;
        autoAdvanceDelay: number;
        loopPlaylist: boolean;
        randomTransitions: boolean;
        transitionDuration: number;
        showSlideNumber: boolean;
        showProgressBar: boolean;
        idleHideUI: boolean;
        arrowNavigation: boolean;
        swipeNavigation: boolean;
      }>;
    }
  | { k: "setVideo"; patch: Partial<{ fit: "contain" | "cover"; globalVolume: number }> }
  | { k: "setSlideEffect"; effect: string }
  | { k: "setTransition"; type: string }
  | { k: "timer"; action: "start" | "pause" | "reset" | "countdown"; seconds?: number };

export interface TimerState {
  running: boolean;
  /** elapsed ms accumulated before `at` */
  base: number;
  /** wall-clock ms when it last started (only meaningful while running) */
  at: number;
  /** countdown length in seconds, 0 = none */
  countdown: number;
}

export interface DeviceInfo {
  id: string;
  name: string;
  since: number;
  status: "pending" | "admitted";
}

/* ── Presenter state snapshot (presenter → remotes) ── */

export interface PresenterState {
  index: number;
  total: number;
  paused: boolean;
  muted: boolean;
  volume: number;
  blank: boolean;
  fullscreen: boolean;
  fit: "contain" | "cover";
  controls: {
    autoAdvance: boolean;
    autoAdvanceDelay: number;
    loopPlaylist: boolean;
    randomTransitions: boolean;
    transitionDuration: number;
    showSlideNumber: boolean;
    showProgressBar: boolean;
    idleHideUI: boolean;
    arrowNavigation: boolean;
    swipeNavigation: boolean;
  };
  startedAt: number;
  timer: TimerState;
  label: string;
  nextLabel: string;
  notes: string;
  effect: string;
  transition: string;
}

/* ── Frames ── */

export interface JoinFrame {
  t: "join";
  v: number;
  role: Role;
  auth: string; // sha-256 hex of `${room}:${password}`
  deviceId?: string;
  deviceName?: string;
}
export interface JoinedFrame {
  t: "joined";
  role: Role;
  remotes: number;
  presenter: boolean;
  version: number;
  state: PresenterState | null;
}
export interface StateFrame {
  t: "state";
  version: number;
  state: PresenterState;
}
export interface CmdFrame {
  t: "cmd";
  id: string;
  cmd: RemoteCommand;
}
export interface AckFrame {
  t: "ack";
  id: string;
  version: number;
}
export interface PeersFrame {
  t: "peers";
  remotes: number;
  presenter: boolean;
  /** presenter only */
  devices?: DeviceInfo[];
  blocked?: { id: string; name: string }[];
  autoAdmit?: boolean;
}
/** presenter → relay: manage who may control the show */
export interface AdminFrame {
  t: "admin";
  op: "admit" | "deny" | "kick" | "unblock" | "autoAdmit";
  deviceId?: string;
  value?: boolean;
}
/** remote → presenter (relayed, never stored) */
export interface PointerFrame {
  t: "ptr";
  x: number;
  y: number;
  down: boolean;
  color?: string;
  size?: number;
}
/** relay → remote: admission status */
export interface GateFrame {
  t: "gate";
  status: "waiting" | "denied" | "kicked";
}
/** Handled by the Durable Object's hibernation auto-response — costs no
 *  wake-up, so the exact strings below must never change. */
export interface PingFrame {
  t: "ping";
}
export interface PongFrame {
  t: "pong";
}
export const PING_FRAME = '{"t":"ping"}';
export const PONG_FRAME = '{"t":"pong"}';
export interface ErrorFrame {
  t: "error";
  code: "auth" | "proto" | "full" | "version";
  message: string;
}

export type ClientFrame = JoinFrame | CmdFrame | StateFrame | PingFrame | PongFrame | AdminFrame | PointerFrame;
export type ServerFrame =
  | JoinedFrame
  | StateFrame
  | CmdFrame
  | AckFrame
  | PeersFrame
  | PointerFrame
  | GateFrame
  | PingFrame
  | PongFrame
  | ErrorFrame;

/* ── Helpers ── */

export const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function makeRoomCode(len = 6): string {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += ROOM_CODE_ALPHABET[b % ROOM_CODE_ALPHABET.length];
  return out;
}

export function normalizeRoom(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
}

export async function authToken(room: string, password: string): Promise<string> {
  const data = new TextEncoder().encode(`${normalizeRoom(room)}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
