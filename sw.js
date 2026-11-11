const VERSION = "dokidoki-v6-azure";
const FILES = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];
const CDN = /^https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.sheetjs\.com)\//;
self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith("dokidoki-") && k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  const same = url.origin === self.location.origin && url.href.startsWith(self.registration.scope);
  if (!same && !CDN.test(url.href)) return; // 토큰과 동기화 응답은 캐시하지 않음.
  const navigation = same && (e.request.mode === "navigate" || url.pathname.endsWith("/index.html"));
  if (navigation) {
    e.respondWith(fetch(e.request, { cache: "no-store" }).then(async response => {
      if (!response.ok) throw new Error("offline fallback");
      const cache = await caches.open(VERSION); await cache.put(e.request, response.clone());
      return response;
    }).catch(async () => (await caches.match(e.request)) || (await caches.match(new URL("index.html", self.registration.scope).href)) || Response.error()));
    return;
  }
  e.respondWith((async () => {
    const hit = await caches.match(e.request);
    if (hit) return hit;
    const response = await fetch(e.request);
    if (response.ok || response.type === "opaque") {
      const cache = await caches.open(VERSION); await cache.put(e.request, response.clone());
    }
    return response;
  })());
});
