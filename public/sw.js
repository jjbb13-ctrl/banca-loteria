const CACHE_NAME = 'banca-lottery-v3';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(names =>
      Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Network-first: siempre intenta red primero, fallback a cache
  e.respondWith(
    fetch(e.request).then(res => {
      return res;
    }).catch(() => {
      return caches.match(e.request).then(r => r);
    })
  );
});
