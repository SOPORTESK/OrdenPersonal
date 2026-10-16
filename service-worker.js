// Service Worker for Orden Personal PWA
const CACHE_NAME = 'orden-pwa-v10';
const ASSETS = [
  './index.html',
  './manifest.json',
  './style.css',
  './main.js',
  './icon-app-512.png',
  './logoTiendaHD.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
    ))
  );
  self.clients.claim();
});

// Estrategia Network-First con fallback a Caché para evitar servir versiones desactualizadas tras un push
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // No interceptar peticiones externas ni dev server
  if (url.origin !== self.location.origin) return;
  if (url.hostname === 'localhost' && url.port === '5174') return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
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
