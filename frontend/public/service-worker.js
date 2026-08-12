// Simple service worker for Auto-AI India PWA
const CACHE = "autoai-v1";
const CORE = ["/", "/index.html", "/manifest.json"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(CORE))
      // Precaching is best-effort: the app must still install without offline assets.
      .catch((err) => console.error("[sw] precache failed", err))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  // Never cache API or POST
  if (req.method !== "GET" || req.url.includes("/api/")) return;
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetched = fetch(req).then((res) => {
        if (res && res.status === 200 && res.type === "basic") {
          const clone = res.clone();
          caches
            .open(CACHE)
            .then((c) => c.put(req, clone))
            .catch((err) => console.error("[sw] cache write failed for", req.url, err));
        }
        return res;
      }).catch((err) => {
        if (cached) return cached;
        console.error("[sw] fetch failed with no cached copy for", req.url, err);
        throw err;
      });
      return cached || fetched;
    })
  );
});
