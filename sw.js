/* Service worker: deja la aplicación utilizable sin conexión.
   Al cambiar archivos, sube VERSION para que se renueve la caché. */

const VERSION = 'gim-2026-11-01-bloque-d-pierna';
const FONTS = 'gim-fuentes-1';

const SHELL = [
  '/',
  '/index.html',
  '/assets/styles.css',
  '/assets/app.js',
  '/assets/coach-knowledge.js',
  '/assets/boot.js',
  '/assets/icon.svg',
  '/assets/icon-192.png',
  '/assets/icon-512.png',
  '/assets/icon-maskable-512.png',
  '/assets/apple-touch-icon.png',
  '/assets/manifest.webmanifest'
];

const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(VERSION)
      .then(cache => cache.addAll(SHELL.map(path => new Request(path, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== VERSION && key !== FONTS).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Las fuentes cambian poco: primero la caché.
  if (FONT_HOSTS.includes(url.hostname)) {
    event.respondWith(
      caches.open(FONTS).then(async cache => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      }).catch(() => fetch(request))
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Todo lo propio va primero a la red y cae en la caché si no hay conexión.
  // Evita reutilizar respuestas de la caché HTTP al renovar el shell.
  // La caché propia mantiene el funcionamiento cuando falla la conexión.
  const navigation = request.mode === 'navigate';
  const fallback = navigation ? '/index.html' : request;
  const appDocument = navigation && (url.pathname === '/' || url.pathname === '/index.html');
  const network = fetch(request, { cache: 'no-store' }).then(async response => {
    // Una visita a otro documento o icono no puede sustituir la app offline.
    if (response.ok && (!navigation || (appDocument && (response.headers.get('content-type') || '').includes('text/html')))) {
      const copy = response.clone();
      try { await (await caches.open(VERSION)).put(fallback, copy); }
      catch (e) { /* la respuesta de red sigue siendo utilizable */ }
    }
    return response;
  });
  // La petición puede actualizar la caché aunque ya se haya servido el respaldo.
  event.waitUntil(network.catch(() => {}));
  event.respondWith((async () => {
    let hit = null;
    try {
      const cache = await caches.open(VERSION);
      hit = await cache.match(fallback) || (navigation ? await cache.match('/') : null);
    } catch (e) { /* sin caché disponible, se utiliza la red */ }
    let timer;
    try {
      const response = hit
        ? await Promise.race([network, new Promise(resolve => { timer = setTimeout(() => resolve(hit), 3500); })])
        : await network;
      return !response.ok && hit ? hit : response;
    } catch (e) {
      return hit || Response.error();
    } finally {
      clearTimeout(timer);
    }
  })());
});
