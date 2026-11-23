const CACHE = 'rotta-canonica-v1.3';
const ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.webmanifest',
  '/fonts/fonts.css',
  '/fonts/manrope-latin-400-normal.woff2',
  '/fonts/manrope-latin-600-normal.woff2',
  '/fonts/manrope-latin-700-normal.woff2',
  '/fonts/manrope-latin-800-normal.woff2',
  '/fonts/dm-sans-latin-400-normal.woff2',
  '/fonts/dm-sans-latin-600-normal.woff2',
  '/fonts/dm-sans-latin-700-normal.woff2',
  '/assets/ocean-chart.svg',
  '/assets/wave-band.svg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request)
        .then((res) => {
          if (res.ok && (url.pathname.startsWith('/fonts/') || url.pathname.startsWith('/assets/'))) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
          }
          return res;
        })
        .catch(() => {
          if (e.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          return caches.match(e.request);
        });
    })
  );
});
