/// <reference types="@cloudflare/workers-types" />
import { RoomDO } from "./RoomDO";

export { RoomDO };

export interface Env {
  ROOMS: DurableObjectNamespace;
}

const ROOM_RE = /^\/room\/([A-Z0-9]{4,12})\/ws$/i;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "content-type": "application/json" },
      });
    }

    const match = ROOM_RE.exec(url.pathname);
    if (!match) return new Response("not found", { status: 404 });

    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("expected websocket", { status: 426 });
    }

    const id = env.ROOMS.idFromName(match[1].toUpperCase());
    return env.ROOMS.get(id).fetch(request);
  },
};
