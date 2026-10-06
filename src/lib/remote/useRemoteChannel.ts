import { useCallback, useEffect, useRef, useState } from "react";
import {
  PING_FRAME,
  PONG_FRAME,
  PROTOCOL_VERSION,
  authToken,
  normalizeRoom,
  type AdminFrame,
  type DeviceInfo,
  type PointerFrame,
  type PresenterState,
  type RemoteCommand,
  type Role,
  type ServerFrame,
} from "./protocol";
import { RELAY_URL, roomSocketUrl } from "./commands";

export type ConnectionStatus = "idle" | "connecting" | "connected" | "reconnecting" | "error" | "waiting" | "denied" | "kicked";

const DEVICE_KEY = "remote.deviceId";
function deviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) { id = crypto.randomUUID(); localStorage.setItem(DEVICE_KEY, id); }
    return id;
  } catch { return "anon"; }
}
function deviceName(): string {
  const ua = navigator.userAgent;
  const os = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? (/Mobile/.test(ua) ? "Android phone" : "Android tablet")
    : /Mac/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows PC" : /Linux/.test(ua) ? "Linux PC" : "Device";
  const br = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Browser";
  return `${os} · ${br}`;
}

export interface ChannelOptions {
  room: string;
  password: string;
  role: Role;
  enabled: boolean;
  /** remote-side: called on every fresh snapshot */
  onState?: (state: PresenterState) => void;
  /** presenter-side: called for every command coming from a remote */
  onCommand?: (cmd: RemoteCommand, id: string) => void;
  /** presenter-side: laser pointer frames */
  onPointer?: (p: PointerFrame) => void;
}

export interface Channel {
  status: ConnectionStatus;
  error: string | null;
  latency: number | null;
  remotes: number;
  presenterOnline: boolean;
  send: (cmd: RemoteCommand) => void;
  publish: (state: PresenterState) => void;
  reconnect: () => void;
  devices: DeviceInfo[];
  blocked: { id: string; name: string }[];
  autoAdmit: boolean;
  admin: (op: AdminFrame["op"], deviceId?: string, value?: boolean) => void;
  pointer: (p: Omit<PointerFrame, "t">) => void;
}

/* Heartbeats are answered by the relay's hibernation auto-responder, so they
 * are cheap — but we still keep them rare to save phone battery and data. */
const HEARTBEAT_MS = 20000;
const DEAD_MS = 65000;
const MAX_BACKOFF = 15000;
const SEEN_LIMIT = 200;

export function useRemoteChannel(opts: ChannelOptions): Channel {
  const { room, password, role, enabled, onState, onCommand, onPointer } = opts;
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [blocked, setBlocked] = useState<{ id: string; name: string }[]>([]);
  const [autoAdmit, setAutoAdmit] = useState(false);
  const gated = useRef(false);
  const cbPtr = useRef(onPointer);
  cbPtr.current = onPointer;

  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [remotes, setRemotes] = useState(0);
  const [presenterOnline, setPresenterOnline] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const attemptRef = useRef(0);
  const retryTimer = useRef<number>(0);
  const beatTimer = useRef<number>(0);
  const lastSeenRef = useRef<number>(0);
  const versionRef = useRef<number>(0);
  const seenCmds = useRef<string[]>([]);
  const closedByUs = useRef(false);
  const pendingState = useRef<PresenterState | null>(null);
  const pingSentAt = useRef(0);
  const lastPublished = useRef<string>("");

  const cbState = useRef(onState);
  const cbCmd = useRef(onCommand);
  cbState.current = onState;
  cbCmd.current = onCommand;

  const clearTimers = () => {
    clearTimeout(retryTimer.current);
    clearInterval(beatTimer.current);
  };

  const connect = useCallback(async () => {
    if (!enabled) return;
    const code = normalizeRoom(room);
    if (!RELAY_URL) {
      setStatus("error");
      setError("No relay configured. Set VITE_REMOTE_RELAY_URL to your Cloudflare Worker URL.");
      return;
    }
    if (code.length < 4 || password.length < 3) {
      setStatus("error");
      setError("Enter a room code and a password of at least 3 characters.");
      return;
    }

    setStatus((s) => (s === "connected" ? "reconnecting" : attemptRef.current > 0 ? "reconnecting" : "connecting"));
    setError(null);

    let token: string;
    try {
      token = await authToken(code, password);
    } catch {
      setStatus("error");
      setError("This browser blocked secure hashing. Use an https:// address.");
      return;
    }

    let ws: WebSocket;
    try {
      ws = new WebSocket(roomSocketUrl(code));
    } catch {
      scheduleRetry();
      return;
    }
    wsRef.current = ws;
    closedByUs.current = false;

    ws.onopen = () => {
      lastSeenRef.current = Date.now();
      ws.send(JSON.stringify({ t: "join", v: PROTOCOL_VERSION, role, auth: token, deviceId: deviceId(), deviceName: deviceName() }));
    };

    ws.onmessage = (ev) => {
      lastSeenRef.current = Date.now();
      let frame: ServerFrame;
      try {
        frame = JSON.parse(ev.data as string) as ServerFrame;
      } catch {
        return;
      }
      switch (frame.t) {
        case "joined": {
          attemptRef.current = 0;
          versionRef.current = frame.version;
          setStatus("connected");
          setError(null);
          setRemotes(frame.remotes);
          setPresenterOnline(frame.presenter);
          if (role === "remote" && frame.state) cbState.current?.(frame.state);
          if (role === "presenter" && pendingState.current) {
            ws.send(JSON.stringify({ t: "state", version: 0, state: pendingState.current }));
          }
          break;
        }
        case "state":
          if (frame.version < versionRef.current) return; // stale
          versionRef.current = frame.version;
          cbState.current?.(frame.state);
          break;
        case "cmd": {
          if (role !== "presenter") return;
          if (seenCmds.current.includes(frame.id)) return;
          seenCmds.current.push(frame.id);
          if (seenCmds.current.length > SEEN_LIMIT) seenCmds.current.shift();
          cbCmd.current?.(frame.cmd, frame.id);
          break;
        }
        case "peers":
          setRemotes(frame.remotes);
          setPresenterOnline(frame.presenter);
          if (frame.devices) setDevices(frame.devices);
          if (frame.blocked) setBlocked(frame.blocked);
          if (typeof frame.autoAdmit === "boolean") setAutoAdmit(frame.autoAdmit);
          break;
        case "ptr":
          if (role === "presenter") cbPtr.current?.(frame);
          break;
        case "gate":
          attemptRef.current = 0;
          setStatus(frame.status);
          if (frame.status !== "waiting") { closedByUs.current = true; gated.current = true; }
          break;
        case "pong":
          if (pingSentAt.current) {
            setLatency(Math.max(0, Date.now() - pingSentAt.current));
            pingSentAt.current = 0;
          }
          break;
        case "ping":
          ws.send(PONG_FRAME);
          break;
        case "error":
          setError(frame.message);
          if (frame.code === "auth" || frame.code === "version") {
            closedByUs.current = true;
            setStatus("error");
          }
          break;
        default:
          break;
      }
    };

    ws.onclose = () => {
      clearInterval(beatTimer.current);
      if (closedByUs.current) return;
      scheduleRetry();
    };
    ws.onerror = () => {
      /* close handler drives the retry */
    };

    clearInterval(beatTimer.current);
    beatTimer.current = window.setInterval(() => {
      const sock = wsRef.current;
      if (!sock || sock.readyState !== WebSocket.OPEN) return;
      if (Date.now() - lastSeenRef.current > DEAD_MS) {
        sock.close();
        return;
      }
      pingSentAt.current = Date.now();
      sock.send(PING_FRAME);
    }, HEARTBEAT_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, room, password, role]);

  const scheduleRetry = useCallback(() => {
    if (closedByUs.current || !enabled) return;
    setStatus("reconnecting");
    const attempt = attemptRef.current++;
    const delay = Math.min(MAX_BACKOFF, 500 * 2 ** attempt) * (0.7 + Math.random() * 0.6);
    clearTimeout(retryTimer.current);
    retryTimer.current = window.setTimeout(() => void connect(), delay);
  }, [connect, enabled]);

  useEffect(() => {
    if (!enabled) {
      closedByUs.current = true;
      clearTimers();
      wsRef.current?.close();
      wsRef.current = null;
      setStatus("idle");
      setLatency(null);
      return;
    }
    gated.current = false;
    attemptRef.current = 0;
    void connect();
    return () => {
      closedByUs.current = true;
      clearTimers();
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect, enabled]);

  // Recover fast when the phone comes back from sleep / tab switch
  useEffect(() => {
    if (!enabled) return;
    const wake = () => {
      if (gated.current) return;
      const sock = wsRef.current;
      if (!sock || sock.readyState === WebSocket.CLOSED || sock.readyState === WebSocket.CLOSING) {
        attemptRef.current = 0;
        closedByUs.current = false;
        void connect();
      }
    };
    window.addEventListener("online", wake);
    document.addEventListener("visibilitychange", wake);
    return () => {
      window.removeEventListener("online", wake);
      document.removeEventListener("visibilitychange", wake);
    };
  }, [connect, enabled]);

  const send = useCallback((cmd: RemoteCommand) => {
    const sock = wsRef.current;
    if (!sock || sock.readyState !== WebSocket.OPEN) return;
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    sock.send(JSON.stringify({ t: "cmd", id, cmd }));
  }, []);

  /** Publish a snapshot. Identical snapshots are dropped so an idle
   *  presentation sends nothing at all over the socket. */
  const publish = useCallback((state: PresenterState) => {
    pendingState.current = state;
    const sock = wsRef.current;
    if (!sock || sock.readyState !== WebSocket.OPEN) return;
    const payload = JSON.stringify({ t: "state", version: 0, state });
    if (payload === lastPublished.current) return;
    lastPublished.current = payload;
    sock.send(payload);
  }, []);

  const reconnect = useCallback(() => {
    gated.current = false;
    closedByUs.current = false;
    attemptRef.current = 0;
    wsRef.current?.close();
    void connect();
  }, [connect]);

  const admin = useCallback((op: AdminFrame["op"], id?: string, value?: boolean) => {
    const sock = wsRef.current;
    if (!sock || sock.readyState !== WebSocket.OPEN) return;
    sock.send(JSON.stringify({ t: "admin", op, deviceId: id, value }));
  }, []);

  const lastPtr = useRef(0);
  const pointer = useCallback((p: Omit<PointerFrame, "t">) => {
    const sock = wsRef.current;
    if (!sock || sock.readyState !== WebSocket.OPEN) return;
    const now = performance.now();
    if (p.down && now - lastPtr.current < 33) return; // ≤30 fps, lifts always sent
    lastPtr.current = now;
    sock.send(JSON.stringify({ t: "ptr", ...p }));
  }, []);

  return { status, error, latency, remotes, presenterOnline, send, publish, reconnect, devices, blocked, autoAdmit, admin, pointer };
}
