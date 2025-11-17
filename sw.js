const CACHE_NAME = 'dynie-images-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

async function cacheFirst(req) {
  const cache = await caches.open(CACHE_NAME);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  try { await cache.put(req, res.clone()); } catch (_) {}
  return res;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (/\.imgur\.com$/i.test(url.hostname)) {
    event.respondWith(cacheFirst(req));
  }
});

async function prefetchList(urls) {
  const cache = await caches.open(CACHE_NAME);
  await Promise.all(urls.map(async (u) => {
    try {
      const req = new Request(u);
      const match = await cache.match(req);
      if (!match) {
        const res = await fetch(req);
        await cache.put(req, res.clone());
      }
    } catch (_) {}
  }));
}

self.addEventListener('message', (event) => {
  const data = event.data;
  if (data && data.type === 'prefetch' && Array.isArray(data.urls)) {
    event.waitUntil(prefetchList(data.urls));
  }
});