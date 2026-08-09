const STATIC_CACHE = "legacy-os-static-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/") ||
    url.searchParams.has("portal")
  ) {
    return;
  }

  const cacheable =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname === "/favicon.png" ||
    url.pathname === "/icon.svg";
  if (cacheable) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
        return response;
      }),
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(
        () =>
          new Response(
            "Legacy OS is offline. Reconnect to protect the freshness and security of your workspace data.",
            { headers: { "content-type": "text/plain; charset=utf-8" }, status: 503 },
          ),
      ),
    );
  }
});
