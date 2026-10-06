# Slide Remote Relay (Cloudflare Worker + Durable Object)

Tiny WebSocket relay that lets a phone/tablet/laptop drive the slideshow running on
another machine, across any network.

## Deploy

```bash
cd worker
npm install
npx wrangler login
npm run deploy
```

Wrangler prints a URL such as `https://slide-remote-relay.<you>.workers.dev`.
Put the websocket form of it in the app's `.env`:

```
VITE_REMOTE_RELAY_URL=wss://slide-remote-relay.<you>.workers.dev
```

Local development: `npm run dev` then `VITE_REMOTE_RELAY_URL=ws://localhost:8787`.

## Endpoints

- `GET /health` → `{ ok: true }`
- `GET /room/:CODE/ws` → WebSocket upgrade, one Durable Object per room code.

## Protocol

`src/protocol.ts` is a verbatim copy of `src/lib/remote/protocol.ts` in the app.
Keep both in sync.

- The first socket in a room fixes the auth token (`sha256("ROOM:password")`);
  later joins must match or are closed with code 4001.
- Only the `presenter` role may publish `state`; only `remote` roles may send `cmd`.
- Every published snapshot bumps a monotonic `version`; remotes drop stale frames.
- The latest snapshot is persisted in Durable Object storage, so a remote that joins
  (or reconnects) after hibernation immediately gets the true current slide.
