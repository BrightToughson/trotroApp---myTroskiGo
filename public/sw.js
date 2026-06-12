const CACHE_NAME = 'mytroskigo-pwa-cache-v5';

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo/mytroskigo.png',
  '/logo/mytroskigo_favicon.png'
];

// Install event - cache core assets
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Force the waiting service worker to become the active service worker
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Clearing Old Cache', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim(); // Claim control of all open clients instantly
});

// Fetch event - Dynamic caching strategy
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }

  // 1. Network First for HTML and Navigation (Always get the latest app structure)
  if (event.request.mode === 'navigate' || event.request.headers.get('accept').includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          // If successful, put it in the cache and return it
          const cacheCopy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cacheCopy));
          return networkResponse;
        })
        .catch(() => {
          // If offline, serve from cache
          return caches.match(event.request).then((cachedResponse) => {
            return cachedResponse || caches.match('/index.html');
          });
        })
    );
    return;
  }

  // 2. Stale-While-Revalidate for Static Assets (Images, JS, CSS, CDN Libraries, and Fonts)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const isBasic = networkResponse.type === 'basic';
          const isCors = networkResponse.type === 'cors';
          
          // Allow dynamic caching of static resources from same-origin or trusted Mapbox/Google CDNs
          const url = new URL(event.request.url);
          const isTrustedCDN = url.hostname.includes('api.mapbox.com') || 
                               url.hostname.includes('fonts.googleapis.com') || 
                               url.hostname.includes('fonts.gstatic.com');

          if (isBasic || (isCors && isTrustedCDN)) {
            const cacheCopy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cacheCopy));
          }
        }
        return networkResponse;
      }).catch((err) => {
        console.log('Network fetch failed, serving from cache only.', err);
      });

      // Return the cached response immediately if available, while network fetch happens in background
      return cachedResponse || fetchPromise;
    })
  );
});
// Notification Click - Open the app when notification is tapped
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a window client is already open, focus it
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      // If no window client is open, open a new one
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

// Push event - Handle background push notifications (if configured)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/logo/mytroskigo.png',
      badge: '/logo/mytroskigo_favicon.png',
      data: { url: data.url || '/(tabs)/communitypost' },
      vibrate: [200, 100, 200],
      tag: 'community-alert'
    };
    event.waitUntil(self.registration.showNotification(data.title, options));
  }
});
