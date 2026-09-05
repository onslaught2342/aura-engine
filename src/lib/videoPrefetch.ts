/* Sequential video prefetcher backed by Cache Storage. */

const CACHE_NAME = "slide-videos-v1";

async function openCache(): Promise<Cache | null> {
  try {
    if (typeof caches === "undefined") return null;
    return await caches.open(CACHE_NAME);
  } catch {
    return null;
  }
}

export async function prefetchSequential(urls: string[], signal: AbortSignal): Promise<void> {
  const cache = await openCache();
  for (const url of urls) {
    if (signal.aborted) return;
    if (!url) continue;
    try {
      if (cache) {
        const hit = await cache.match(url);
        if (hit) continue;
      }
      const res = await fetch(url, { signal, cache: "force-cache" });
      if (!res.ok) continue;
      if (cache) {
        try {
          await cache.put(url, res.clone());
        } catch {
          /* ignore quota errors */
        }
      }
      // Drain the body to ensure it lands in the HTTP cache too
      await res.arrayBuffer();
    } catch {
      if (signal.aborted) return;
      // skip failed url and continue
    }
  }
}
