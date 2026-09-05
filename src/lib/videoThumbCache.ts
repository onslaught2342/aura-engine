/* Thumbnail cache: IndexedDB-backed JPEG snapshots of slide videos.
 * Extraction runs through a single serial queue scheduled on requestIdleCallback
 * so it never competes with the active video player. */

const DB_NAME = "slide-thumbs-db";
const STORE = "thumbs";
const THUMB_W = 160;
const THUMB_H = 90;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => { req.result.createObjectStore(STORE); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function idbGet(key: string): Promise<Blob | undefined> {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result as Blob | undefined);
      req.onerror = () => reject(req.error);
    });
  } catch { return undefined; }
}

async function idbPut(key: string, blob: Blob): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(blob, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch { /* ignore */ }
}

const memCache = new Map<string, string>();
const inflight = new Map<string, Promise<string | null>>();

// ── Idle scheduling ──────────────────────────────────────────
type IdleDeadline = { didTimeout: boolean; timeRemaining: () => number };
const ric: (cb: (d: IdleDeadline) => void, opts?: { timeout: number }) => number =
  (window as unknown as { requestIdleCallback?: typeof ric }).requestIdleCallback ??
  ((cb, opts) => window.setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 16 }),
    opts?.timeout ? Math.min(opts.timeout, 200) : 200) as unknown as number);

const onIdle = () => new Promise<void>((resolve) => ric(() => resolve(), { timeout: 4000 }));

// ── Serial queue (concurrency=1) ─────────────────────────────
type Job = () => Promise<void>;
const queue: Job[] = [];
let running = false;

async function pump() {
  if (running) return;
  running = true;
  while (queue.length) {
    const job = queue.shift()!;
    await onIdle();
    try { await job(); } catch { /* swallow */ }
  }
  running = false;
}

function enqueue(job: Job) {
  queue.push(job);
  pump();
}

// ── Single reusable hidden video element ─────────────────────
let sharedVideo: HTMLVideoElement | null = null;
function getVideoEl(): HTMLVideoElement {
  if (sharedVideo) return sharedVideo;
  const v = document.createElement("video");
  v.crossOrigin = "anonymous";
  v.muted = true;
  v.playsInline = true;
  v.preload = "auto";
  v.style.position = "fixed";
  v.style.left = "-9999px";
  v.style.width = "1px";
  v.style.height = "1px";
  document.body.appendChild(v);
  sharedVideo = v;
  return v;
}

function extractFrame(url: string): Promise<Blob | null> {
  return new Promise((resolve) => {
    const video = getVideoEl();
    let done = false;
    const cleanup = () => {
      video.removeEventListener("loadedmetadata", onMeta);
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onErr);
      clearTimeout(timer);
    };
    const finish = (b: Blob | null) => {
      if (done) return;
      done = true;
      cleanup();
      try { video.removeAttribute("src"); video.load(); } catch { /* ignore */ }
      resolve(b);
    };
    const onMeta = async () => {
      await onIdle();
      try {
        const seekTo = Math.min(0.5, (video.duration || 1) * 0.1);
        video.currentTime = seekTo;
      } catch { finish(null); }
    };
    const onSeeked = async () => {
      await onIdle();
      try {
        const canvas = document.createElement("canvas");
        canvas.width = THUMB_W; canvas.height = THUMB_H;
        const ctx = canvas.getContext("2d");
        if (!ctx) return finish(null);
        ctx.drawImage(video, 0, 0, THUMB_W, THUMB_H);
        await onIdle();
        canvas.toBlob((b) => finish(b), "image/jpeg", 0.72);
      } catch { finish(null); }
    };
    const onErr = () => finish(null);
    const timer = window.setTimeout(() => finish(null), 12000);

    video.addEventListener("loadedmetadata", onMeta);
    video.addEventListener("seeked", onSeeked);
    video.addEventListener("error", onErr);
    try { video.src = url; } catch { finish(null); }
  });
}

export function getThumb(url: string): Promise<string | null> {
  if (!url) return Promise.resolve(null);
  const memo = memCache.get(url);
  if (memo) return Promise.resolve(memo);
  const pending = inflight.get(url);
  if (pending) return pending;

  const p = new Promise<string | null>((resolve) => {
    enqueue(async () => {
      const cached = await idbGet(url);
      if (cached) {
        const obj = URL.createObjectURL(cached);
        memCache.set(url, obj);
        resolve(obj);
        return;
      }
      const blob = await extractFrame(url);
      if (!blob) { resolve(null); return; }
      await idbPut(url, blob);
      const obj = URL.createObjectURL(blob);
      memCache.set(url, obj);
      resolve(obj);
    });
  }).finally(() => { inflight.delete(url); });

  inflight.set(url, p);
  return p;
}

/** Quietly pre-extract thumbnails for a list of URLs during browser idle time. */
export function prewarmThumbs(urls: string[]): void {
  for (const u of urls) {
    if (!u || memCache.has(u) || inflight.has(u)) continue;
    // fire-and-forget; getThumb dedupes and queues serially
    void getThumb(u);
  }
}
