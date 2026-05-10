const VERSION = 'v1';
const CACHE_NAME = 'networking-crm-v1';

const ASSETS_TO_CACHE = [
  '/networking-crm/',
  '/networking-crm/index.html',
  '/networking-crm/main.js',
  '/networking-crm/db.js',
  '/networking-crm/ui.js',
  '/networking-crm/dates.js',
  '/networking-crm/style.css',
  '/networking-crm/manifest.json',
  '/networking-crm/icon.png'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE)));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => clients.claim())
      .then(() => self.clients.matchAll())
      .then(clients => clients.forEach(client => client.postMessage({ type: 'RELOAD' })))
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;
  const isIndex = url.endsWith('/networking-crm/') || url.endsWith('/networking-crm/index.html');

  if (isIndex) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
  } else {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
          return response;
        });
      }).catch(() => undefined)
    );
  }
});
