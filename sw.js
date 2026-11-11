// Service worker de "Mis notas": funciona sin internet.
// Si cambias index.html, sube el número de versión para que se actualice.
const VERSION = 'mis-notas-v1';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-180.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Fuentes de Google: se guardan al verlas una vez y luego salen sin internet.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.open(VERSION).then((c) =>
        c.match(req).then((hit) => {
          const net = fetch(req).then((r) => { c.put(req, r.clone()); return r; }).catch(() => hit);
          return hit || net;
        })
      )
    );
    return;
  }

  if (url.origin !== location.origin) return;

  // La app: primero lo guardado (rápido y offline), y se refresca en segundo plano.
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => {
      const net = fetch(req)
        .then((r) => { if (r.ok) caches.open(VERSION).then((c) => c.put(req, r.clone())); return r; })
        .catch(() => hit || caches.match('index.html'));
      return hit || net;
    })
  );
});
