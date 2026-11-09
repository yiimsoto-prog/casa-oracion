const CACHE = 'iglesia-v10-r5';
const FILES = [
  './',
  'index.html',
  'style.css',
  'app.js',
  'config.js',
  'cloud.js',
  'theme-boot.js',
  'export-worker.js',
  'logo.jpg',
  'manifest.json',
  'version.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-192.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
  'vendor/dexie.min.js',
  'vendor/jspdf.min.js',
  'vendor/autotable.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.pathname.endsWith('/version.json') || url.pathname.includes('/api/') || url.pathname.includes('/auth/')) {
    e.respondWith(fetch(e.request));
    return;
  }
  const appShell = url.origin === location.origin && (
    url.pathname.endsWith('/') ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.includes('/icons/')
  );
  if (appShell) {
    e.respondWith(
      fetch(e.request).then(res => {
        const cp = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, cp));
        return res;
      }).catch(() => caches.match(e.request).then(r => r || caches.match('index.html')))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(res => {
      if (/fonts\.(googleapis|gstatic)\.com/.test(e.request.url) && res.ok) {
        const cp = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, cp));
      }
      return res;
    }).catch(() => caches.match(e.request)))
  );
});
