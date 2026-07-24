const CACHE_NAME = 'coffee-experience-cache-v8';
const ASSETS = [
  './index.html',
  './styles.css',
  './app.js',
  './coffee-news.js',
  './dashboard-utils.js',
  './assets/coffee-hero.svg',
  './manifest.json',
  'https://www.gstatic.com/firebasejs/10.13.1/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.13.1/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore-compat.js'
];

// Force immediate activation without waiting for old tabs to close
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // CRITICAL: Only intercept same-origin static assets or Firebase CDN SDK scripts.
  // Bypass all live API/Firestore/Auth endpoints (e.g. firestore.googleapis.com).
  const isSameOrigin = url.origin === self.location.origin;
  const isFirebaseSDK = url.origin === 'https://www.gstatic.com' && url.pathname.includes('/firebasejs/');

  if (!isSameOrigin && !isFirebaseSDK) {
    return;
  }

  // Skip browser extension requests
  if (url.protocol === 'chrome-extension:' || url.pathname.includes('extension')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // If response is valid, update the cache dynamically
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch((err) => {
        // Fallback to cache if offline
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          throw err;
        });
      })
  );
});
