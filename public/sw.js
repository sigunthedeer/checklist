/**
 * Offline support for the installed web app.
 *
 * The point of this app is to be usable on a tablet next to the sim, so it has
 * to keep working when the tablet drops off the network. Content-hashed bundles
 * are cached forever; everything else is fetched fresh when possible and served
 * from cache when not.
 */
const CACHE = 'checkride-v1';
const SHELL = ['/', '/manifest.webmanifest', '/icon.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
      .catch(() => undefined),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const put = (response) => {
    const copy = response.clone();
    caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => undefined);
    return response;
  };

  // Bundles and assets carry a content hash in the name, so they never go stale.
  if (url.pathname.startsWith('/_expo/') || url.pathname.startsWith('/assets/')) {
    event.respondWith(caches.match(request).then((hit) => hit || fetch(request).then(put)));
    return;
  }

  // Everything else: fresh when online, cached when not, app shell as the last resort.
  event.respondWith(
    fetch(request)
      .then(put)
      .catch(() => caches.match(request).then((hit) => hit || caches.match('/'))),
  );
});
