// Service Worker for Wadi Degla Attendance PWA
// Provides instant app installation, seamless background updates, and Push Notifications

const CACHE_NAME = 'wadi-degla-cache-v24';

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

// ================= Push Notifications (Even when app is closed) =================
self.addEventListener('push', (event) => {
  let data = {
    title: 'أندية وادي دجلة - نظام الحضور',
    body: 'لديك إشعار جديد في نظام الحضور والإنصراف',
    url: '/?tab=leaves',
    icon: '/icon-192.png'
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icon-192.png',
    badge: '/favicon-32.png',
    vibrate: [200, 100, 200, 100, 200],
    data: {
      url: data.url || '/?tab=leaves'
    },
    tag: 'wadi-degla-req-' + Date.now(),
    renotify: true,
    dir: 'rtl',
    lang: 'ar'
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/?tab=leaves';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
