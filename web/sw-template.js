// ukemusic web player: the offline copy (4.45). Written by web/make.js into web/out/sw.js, with
// the version and the files filled in. Once the player has been opened with a connection, it
// opens and plays with none: the page, the starter songs, the sounds, the icons and the fonts.
// The page and the song list come from the network when it's there (so updates arrive), from
// the copy when it isn't; the sounds and icons from the copy.
const VERSION = '__VERSION__';
const FILES = __FILES__;
const CACHE = `ukemusic-${VERSION}`;
const FONTS = 'ukemusic-fonts';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith('ukemusic-') && k !== CACHE && k !== FONTS).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// the network, but not for ever: on a weak connection the copy answers after a few seconds
function fresh(request, wait = 4000) {
  return new Promise((resolve) => {
    let done = false;
    const fallback = () => caches.match(request, { ignoreSearch: true }).then((hit) => hit || caches.match('./'));
    const timer = setTimeout(() => { if (!done) { done = true; fallback().then(resolve); } }, wait);
    fetch(request).then((response) => {
      if (response && response.ok) { const copy = response.clone(); caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {}); }
      if (!done) { done = true; clearTimeout(timer); resolve(response); }
    }).catch(() => { if (!done) { done = true; clearTimeout(timer); fallback().then(resolve); } });
  });
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // Google Fonts: the copy at once, refreshed behind it
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(caches.open(FONTS).then((cache) => cache.match(request).then((hit) => {
      const net = fetch(request).then((response) => { if (response && (response.ok || response.type === 'opaque')) cache.put(request, response.clone()); return response; }).catch(() => hit);
      return hit || net;
    })));
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (request.mode === 'navigate' || url.pathname.endsWith('.json') || url.pathname.endsWith('.webmanifest')) {
    event.respondWith(fresh(request));
    return;
  }
  event.respondWith(caches.match(request, { ignoreSearch: true }).then((hit) => hit || fetch(request).then((response) => {
    if (response && response.ok) { const copy = response.clone(); caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {}); }
    return response;
  })));
});
