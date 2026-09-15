/* Salesventory service worker — installable PWA + resilient app shell.
   Network-first navigations, stale-while-revalidate static assets.
   Never intercepts /api or external (Supabase) requests. */
'use strict';
var CACHE = 'salesventory-v1';
var SHELL = [
  './index.html',
  './app.css?v=20260915-launch',
  './app.js',
  './cloud.js',
  './fx.js',
  './supabase/config.js',
  './assets/logo.png',
  './assets/logo-full.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(SHELL);
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

function putInCache(request, response) {
  if (response && response.ok && request.method === 'GET') {
    return caches.open(CACHE).then(function (cache) { return cache.put(request, response); });
  }
  return Promise.resolve(response);
}

function staleWhileRevalidate(request) {
  return caches.match(request).then(function (cached) {
    if (cached) {
      fetch(request).then(function (fresh) { if (fresh && fresh.ok) putInCache(request, fresh); }).catch(function () {});
      return cached;
    }
    return fetch(request).then(function (fresh) { return putInCache(request, fresh).then(function () { return fresh; }); });
  });
}

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') return;
  var url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.indexOf('/api/') === 0) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(function (resp) { putInCache(request, resp); return resp; })
        .catch(function () {
          return caches.match(request).then(function (hit) {
            return hit || caches.match('./index.html');
          });
        })
    );
    return;
  }
  event.respondWith(staleWhileRevalidate(request));
});