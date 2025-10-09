const CACHE_NAME = 'linguabbox-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/assets/styles.css',
  '/src/app.js',
  '/manifest.json',
  '/assets/icons/icon-192.svg',
  '/assets/icons/icon-512.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  // Network first for navigation requests, cache-first for others
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match('/index.html')),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((networkResp) => {
      if (!networkResp || networkResp.status !== 200) return networkResp;
      const respClone = networkResp.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, respClone));
      return networkResp;
    }).catch(() => cached)),
  );
});