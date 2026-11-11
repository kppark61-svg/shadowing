// 오프라인 실행용 서비스워커 — 앱 파일을 고치면 VERSION 숫자를 올려 주세요
const VERSION = "dokidoki-v7";
const FILES = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png", "./splash.webp"];
const CDN = /^https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.sheetjs\.com|cdn\.jsdelivr\.net)\//;

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request, url = req.url;
  if (req.method !== "GET") return;
  const same = url.startsWith(self.location.origin);
  if (!same && !CDN.test(url)) return; // 구글 시트·Azure 통신은 캐시하지 않음
  const save = res => { if (res && (res.ok || res.type === "opaque")) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); } return res; };
  // 앱 화면(index.html)은 인터넷이 되면 항상 최신으로, 안 되면 저장본으로
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then(save).catch(() => caches.match(req).then(hit => hit || caches.match("./index.html"))));
    return;
  }
  // 나머지는 저장본을 먼저 보여 주고 뒤에서 새로 받아 둠
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(save).catch(() => hit);
      return hit || net;
    })
  );
});
