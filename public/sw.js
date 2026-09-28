const CACHE_NAME = 'rocket-club-v2';
const STATIC_ASSETS = [
  '/manifest.json',
  '/favicon.ico',
  '/logo.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
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
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Bypass completo para qualquer chamada de API, Next.js internals, websockets e desenvolvimento
  if (
    event.request.method !== 'GET' ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/_next/') ||
    url.searchParams.has('_rsc') ||
    url.hostname === 'localhost' ||
    url.hostname === '127.0.0.1'
  ) {
    return; // Deixa o navegador lidar diretamente via rede em velocidade máxima
  }

  // 2. Apenas responder do cache para assets estáticos declarados
  if (STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return cached || fetch(event.request);
      })
    );
  }
});
