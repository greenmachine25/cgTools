const CACHE_NAME = 'cgtools-cache-v0.05';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './logo.svg'
];

// Perform install cache population
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching core offline shell');
        // Fetch each asset bypass-caching to guarantee latest copy
        return Promise.allSettled(
          ASSETS_TO_CACHE.map(asset => {
            return fetch(new Request(asset, { cache: 'reload' }))
              .then(response => {
                if (response.ok) {
                  return cache.put(asset, response);
                }
                throw new Error(`Status ${response.status}`);
              })
              .catch(err => {
                console.warn(`[Service Worker] Failed to cache resource: ${asset}`, err);
              });
          })
        );
      })
      .then(() => self.skipWaiting())
  );
});

// Cache cleanups on activation
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Cleaning up stale cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch interception with Cache-First strategy & dynamic Font caching
self.addEventListener('fetch', (event) => {
  // Ignore non-GET requests (e.g. tracking or post requests if any)
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then((networkResponse) => {
          // If response is valid, dynamically cache standard dependencies such as Google Fonts
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            (event.request.url.includes('fonts.googleapis.com') || event.request.url.includes('fonts.gstatic.com'))
          ) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Offline fallback logic for html navigation
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
    })
  );
});
