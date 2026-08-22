const CACHE = "autoai-v2";
const CORE = ["/", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(CORE))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE)
            .map((key) => caches.delete(key))
        )
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Never cache non-GET requests or API traffic.
  if (
    request.method !== "GET" ||
    new URL(request.url).pathname.startsWith("/api/")
  ) {
    return;
  }

  // Always fetch the HTML shell from the network first so a deployment
  // cannot leave users pinned to an old hashed JavaScript bundle.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE).then((cache) => {
              cache.put("/", clone).catch(() => {});
            }).catch(() => {});
          }
          return response;
        })
        .catch(() => caches.match(request).then(
          (cached) => cached || caches.match("/")
        ))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const fetched = fetch(request)
        .then((response) => {
          if (response.ok && response.type === "basic") {
            const clone = response.clone();
            caches.open(CACHE).then((cache) => {
              cache.put(request, clone).catch(() => {});
            }).catch(() => {});
          }
          return response;
        })
        .catch(() => cached);

      return cached || fetched;
    })
  );
});
