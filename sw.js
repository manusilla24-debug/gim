/* Service worker: deja la aplicación utilizable sin conexión.
   Al cambiar archivos, sube VERSION para que se renueve la caché. */

const VERSION = 'gim-2026-09-26-entrenador-local-1';
const FONTS = 'gim-fuentes-1';

const SHELL = [
  '/',
  '/index.html',
  '/assets/styles.css',
  '/assets/app.js',
  '/assets/boot.js',
  '/assets/icon.svg',
  '/assets/icon-192.png',
  '/assets/icon-512.png',
  '/assets/apple-touch-icon.png',
  '/assets/manifest.webmanifest'
];

const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(VERSION)
      .then(cache => cache.addAll(SHELL))
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
  // Son cuatro archivos pequeños: así nunca se sirve una versión vieja y el
  // modo sin conexión sigue funcionando.
  const fallback = request.mode === 'navigate' ? '/index.html' : request;

  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(VERSION).then(cache => cache.put(fallback, copy));
        }
        return response;
      })
      .catch(() => caches.match(fallback).then(hit => hit || caches.match('/')))
  );
});
