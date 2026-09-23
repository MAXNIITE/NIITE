const CACHE = "niite-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./config.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Never cache Supabase API calls -- data must always be fresh.
  if (url.hostname.endsWith("supabase.co")) return;

  // Same-origin assets: cache first, fall back to network.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) {
          fetch(req)
            .then((res) => {
              if (res && res.status === 200) {
                caches.open(CACHE).then((c) => c.put(req, res.clone()));
              }
            })
            .catch(() => {});
          return cached;
        }
        return fetch(req)
          .then((res) => {
            if (res && res.status === 200 && res.type === "basic") {
              const clone = res.clone();
              caches.open(CACHE).then((c) => c.put(req, clone));
            }
            return res;
          })
          .catch(() => caches.match("./index.html"));
      })
    );
    return;
  }

  // External requests (fonts, WhatsApp links): straight to network.
  event.respondWith(fetch(req).catch(() => caches.match(req)));
});
