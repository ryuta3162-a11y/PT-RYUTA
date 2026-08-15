/* workout-log service worker */
const CACHE = "wl-v2";
const PRECACHE = [
  "/",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/apple-touch-icon.png",
  "/favicon.ico",
];

async function notify(progress, status) {
  const clientsList = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });
  for (const client of clientsList) {
    client.postMessage({ type: "WL_PROGRESS", progress, status });
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const total = PRECACHE.length;
      for (let i = 0; i < total; i++) {
        const url = PRECACHE[i];
        try {
          await cache.add(url);
        } catch {
          /* ignore single miss */
        }
        const pct = Math.round(((i + 1) / total) * 100);
        await notify(pct, "準備中");
      }
      await notify(100, "準備完了");
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "GET_PROGRESS") {
    void notify(100, "準備完了");
  }
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api") ||
    url.hostname.includes("script.google")
  ) {
    return;
  }

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          void caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("/")))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(
      (cached) =>
        cached ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            void caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
    )
  );
});
