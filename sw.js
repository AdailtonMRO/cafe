/**
 * Service Worker com Estratégia Cache-First & Background Sync para Vendas Offline
 * App Coffee Experience
 */

const CACHE_NAME = 'coffee-experience-v2.3.0';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './styles.css',
  './app.js',
  './src/css/base.css',
  './src/js/core/state-manager.js',
  './src/js/core/firebase-service.js',
  './src/js/utils/currency.js',
  './src/js/utils/date-helpers.js',
  './src/js/modules/participations/sync-queue.js',
  './src/js/modules/participations/payment-service.js',
  './src/js/modules/coffee/brew-calculator.js',
  './src/js/modules/community/feed.js',
  './assets/coffee-hero.svg'
];

// Instalação do Service Worker e Cache Inicial dos Ativos Visuais
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Instalando e armazenando ativos estáticos no cache...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Ativação e Limpeza de Caches Antigos
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Ativando novo Service Worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[ServiceWorker] Removendo cache antigo:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Interceptação de Requisições de Rede (Cache First para Assets / Network First para API)
self.addEventListener('fetch', (event) => {
  // Ignora requisições de extensões de navegador ou esquemas não-http
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).catch(() => {
        // Retorno de fallback offline caso a rede falhe
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('./index.html');
        }
      });
    })
  );
});

// Background Sync: Dispara sincronização automática de compras assim que o sinal de internet retornar
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-participations') {
    console.log('[ServiceWorker] Evento de Background Sync detectado: enviando participações offline...');
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'TRIGGER_OFFLINE_SYNC' });
        });
      })
    );
  }
});
