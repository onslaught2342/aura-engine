/// <reference types="@cloudflare/workers-types" />
import type {
  AdminFrame,
  ClientFrame,
  JoinFrame,
  PresenterState,
  Role,
  ServerFrame,
} from "./protocol";
import { PING_FRAME, PONG_FRAME, PROTOCOL_VERSION } from "./protocol";

interface Attachment {
  role: Role;
  joined: boolean;
  /** remotes only: allowed to control the show */
  admitted?: boolean;
  deviceId?: string;
  deviceName?: string;
  since?: number;
}

const MAX_SOCKETS = 24;

/** One Durable Object per room code.
 *  - Presenter is the source of truth; remotes send `cmd` frames.
 *  - The first socket to join fixes the room's auth token; everyone else must match.
 *  - Latest presenter snapshot is persisted so a hibernated room resumes correctly. */
export class RoomDO implements DurableObject {
  private state: DurableObjectState;
  private snapshot: PresenterState | null = null;
  private version = 0;
  private auth: string | null = null;
  private loaded = false;
  private allow: string[] = [];
  private block: { id: string; name: string }[] = [];
  private autoAdmit = false;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  private async load() {
    if (this.loaded) return;
    const [snap, ver, auth, allow, block, autoAdmit] = await Promise.all([
      this.state.storage.get<PresenterState>("snapshot"),
      this.state.storage.get<number>("version"),
      this.state.storage.get<string>("auth"),
      this.state.storage.get<string[]>("allow"),
      this.state.storage.get<{ id: string; name: string }[]>("block"),
      this.state.storage.get<boolean>("autoAdmit"),
    ]);
    this.allow = allow ?? [];
    this.block = block ?? [];
    this.autoAdmit = !!autoAdmit;
    this.snapshot = snap ?? null;
    this.version = ver ?? 0;
    this.auth = auth ?? null;
    this.loaded = true;
  }

  async fetch(request: Request): Promise<Response> {
    await this.load();
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("expected websocket", { status: 426 });
    }
    if (this.state.getWebSockets().length >= MAX_SOCKETS) {
      return new Response("room full", { status: 503 });
    }

    // Heartbeats are answered by the runtime itself: the Durable Object stays
    // hibernated, which keeps the room practically free while idle.
    this.state.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair(PING_FRAME, PONG_FRAME)
    );

    const pair = new WebSocketPair();
    const server = pair[1];
    this.state.acceptWebSocket(server);
    server.serializeAttachment({ role: "remote", joined: false } satisfies Attachment);

    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  private send(ws: WebSocket, frame: ServerFrame) {
    try {
      ws.send(JSON.stringify(frame));
    } catch {
      /* socket already gone */
    }
  }

  private sockets(): { ws: WebSocket; att: Attachment }[] {
    return this.state.getWebSockets().map((ws) => ({
      ws,
      att: (ws.deserializeAttachment() as Attachment | null) ?? { role: "remote", joined: false },
    }));
  }

  private broadcast(frame: ServerFrame, filter: (att: Attachment) => boolean, except?: WebSocket) {
    for (const { ws, att } of this.sockets()) {
      if (ws === except) continue;
      if (!att.joined || !filter(att)) continue;
      if (att.role === "remote" && !att.admitted) continue;
      this.send(ws, frame);
    }
  }

  private peers() {
    const all = this.sockets().filter((s) => s.att.joined);
    const remotes = all.filter((s) => s.att.role === "remote");
    return {
      remotes: remotes.filter((s) => s.att.admitted).length,
      presenter: all.some((s) => s.att.role === "presenter"),
      devices: remotes.map((s) => ({
        id: s.att.deviceId ?? "",
        name: s.att.deviceName ?? "Device",
        since: s.att.since ?? 0,
        status: (s.att.admitted ? "admitted" : "pending") as "admitted" | "pending",
      })),
    };
  }

  private announcePeers() {
    const { remotes, presenter, devices } = this.peers();
    for (const { ws, att } of this.sockets()) {
      if (!att.joined) continue;
      if (att.role === "presenter") {
        this.send(ws, { t: "peers", remotes, presenter, devices, blocked: this.block, autoAdmit: this.autoAdmit });
      } else if (att.admitted) {
        this.send(ws, { t: "peers", remotes, presenter });
      }
    }
  }

  private async saveLists() {
    await this.state.storage.put({ allow: this.allow, block: this.block, autoAdmit: this.autoAdmit });
  }

  private admitSocket(ws: WebSocket, att: Attachment) {
    att.admitted = true;
    ws.serializeAttachment(att);
    const { remotes, presenter } = this.peers();
    this.send(ws, { t: "joined", role: "remote", remotes, presenter, version: this.version, state: this.snapshot });
  }

  private async handleAdmin(frame: AdminFrame) {
    const id = typeof frame.deviceId === "string" ? frame.deviceId.slice(0, 64) : "";
    const targets = this.sockets().filter((s) => s.att.role === "remote" && s.att.deviceId === id);
    switch (frame.op) {
      case "admit":
        if (!id) return;
        if (!this.allow.includes(id)) this.allow.push(id);
        this.block = this.block.filter((b) => b.id !== id);
        for (const t of targets) this.admitSocket(t.ws, t.att);
        break;
      case "deny":
        for (const t of targets) { this.send(t.ws, { t: "gate", status: "denied" }); t.ws.close(4005, "denied"); }
        break;
      case "kick":
        if (!id) return;
        this.allow = this.allow.filter((a) => a !== id);
        if (!this.block.some((b) => b.id === id)) this.block.push({ id, name: targets[0]?.att.deviceName ?? "Device" });
        for (const t of targets) { this.send(t.ws, { t: "gate", status: "kicked" }); t.ws.close(4006, "kicked"); }
        break;
      case "unblock":
        this.block = this.block.filter((b) => b.id !== id);
        break;
      case "autoAdmit":
        this.autoAdmit = !!frame.value;
        if (this.autoAdmit) {
          for (const s of this.sockets()) {
            if (s.att.joined && s.att.role === "remote" && !s.att.admitted) this.admitSocket(s.ws, s.att);
          }
        }
        break;
    }
    await this.saveLists();
    this.announcePeers();
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer) {
    await this.load();
    if (typeof raw !== "string") return;

    let frame: ClientFrame;
    try {
      frame = JSON.parse(raw) as ClientFrame;
    } catch {
      this.send(ws, { t: "error", code: "proto", message: "invalid json" });
      return;
    }

    const att = (ws.deserializeAttachment() as Attachment | null) ?? { role: "remote", joined: false };

    if (frame.t === "join") {
      await this.handleJoin(ws, frame);
      return;
    }
    if (!att.joined) {
      this.send(ws, { t: "error", code: "auth", message: "join first" });
      return;
    }

    switch (frame.t) {
      case "ping":
        this.send(ws, { t: "pong" });
        return;
      case "pong":
        return;
      case "state": {
        if (att.role !== "presenter") {
          this.send(ws, { t: "error", code: "proto", message: "only the presenter can publish state" });
          return;
        }
        this.version += 1;
        this.snapshot = frame.state;
        await this.state.storage.put({ snapshot: this.snapshot, version: this.version });
        this.broadcast({ t: "state", version: this.version, state: frame.state }, (a) => a.role === "remote");
        return;
      }
      case "admin":
        if (att.role !== "presenter") return;
        await this.handleAdmin(frame);
        return;
      case "ptr": {
        if (att.role !== "remote" || !att.admitted) return;
        const x = Number(frame.x), y = Number(frame.y);
        if (!Number.isFinite(x) || !Number.isFinite(y)) return;
        const color = typeof frame.color === "string" && /^#[0-9a-f]{3,8}$/i.test(frame.color) ? frame.color : undefined;
        const size = Number.isFinite(frame.size) ? Math.max(4, Math.min(80, Number(frame.size))) : undefined;
        this.broadcast({ t: "ptr", x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)), down: !!frame.down, color, size }, (a) => a.role === "presenter");
        return;
      }
      case "cmd": {
        if (att.role !== "remote" || !att.admitted) return;
        this.broadcast(frame, (a) => a.role === "presenter");
        this.send(ws, { t: "ack", id: frame.id, version: this.version });
        return;
      }
      default:
        this.send(ws, { t: "error", code: "proto", message: "unknown frame" });
    }
  }

  private async handleJoin(ws: WebSocket, frame: JoinFrame) {
    if (frame.v !== PROTOCOL_VERSION) {
      this.send(ws, { t: "error", code: "version", message: "protocol mismatch — reload both devices" });
      ws.close(4003, "version");
      return;
    }
    const token = typeof frame.auth === "string" ? frame.auth : "";
    if (!/^[0-9a-f]{64}$/.test(token)) {
      this.send(ws, { t: "error", code: "auth", message: "bad credentials" });
      ws.close(4001, "auth");
      return;
    }
    if (this.auth === null) {
      // First joiner (should be the presenter) fixes the room password.
      this.auth = token;
      await this.state.storage.put("auth", token);
    } else if (!timingSafeEqual(this.auth, token)) {
      this.send(ws, { t: "error", code: "auth", message: "wrong room code or password" });
      ws.close(4001, "auth");
      return;
    }

    const role: Role = frame.role === "presenter" ? "presenter" : "remote";

    if (role === "presenter") {
      // Only one presenter — a newer one replaces the stale socket.
      for (const { ws: other, att } of this.sockets()) {
        if (other !== ws && att.role === "presenter") other.close(4000, "replaced");
      }
    }

    if (role === "presenter") {
      ws.serializeAttachment({ role, joined: true } satisfies Attachment);
      const { remotes, presenter } = this.peers();
      this.send(ws, { t: "joined", role, remotes, presenter, version: this.version, state: this.snapshot });
      this.announcePeers();
      return;
    }

    const deviceId = typeof frame.deviceId === "string" && frame.deviceId ? frame.deviceId.slice(0, 64) : crypto.randomUUID();
    const deviceName = (typeof frame.deviceName === "string" ? frame.deviceName : "Device").slice(0, 60);
    if (this.block.some((b) => b.id === deviceId)) {
      this.send(ws, { t: "gate", status: "kicked" });
      ws.close(4006, "blocked");
      return;
    }
    const att: Attachment = { role, joined: true, admitted: false, deviceId, deviceName, since: Date.now() };
    ws.serializeAttachment(att);
    if (this.autoAdmit || this.allow.includes(deviceId)) {
      this.admitSocket(ws, att);
    } else {
      this.send(ws, { t: "gate", status: "waiting" });
    }
    this.announcePeers();
  }

  async webSocketClose(_ws: WebSocket) {
    this.announcePeers();
  }

  async webSocketError(_ws: WebSocket) {
    this.announcePeers();
  }
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
