const CACHE_NAME = 'estuda-ai-v1.1';
const urlsToCache = ['/'];

// Instalação e ativação imediata
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Estratégia Network First: Tenta a rede, se falhar (offline), usa o cache
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Opcional: atualizar o cache com a nova resposta
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});