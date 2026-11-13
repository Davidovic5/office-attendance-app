// Service Worker for Wadi Degla Attendance PWA
// Provides instant app installation and seamless background updates

const CACHE_NAME = 'wadi-degla-cache-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Network-first strategy to guarantee all real-time updates arrive instantly
self.addEventListener('fetch', (event) => {
  // Always bypass cache for API requests and download packages
  if (event.request.url.includes('/api/') || event.request.url.includes('/download/')) {
    return;
  }

  // Network first, fallback to cache for offline resilience
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
