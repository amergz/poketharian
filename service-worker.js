// Service Worker ringkas untuk Poket Harian
// Tujuan: (1) bolehkan Chrome anggap app ni "installable", (2) app boleh dibuka walau offline

const CACHE_NAME = 'poket-harian-cache-v1';
const ASSETS_TO_CACHE = [
    './index.html',
    './manifest.json',
    './icon-192.png',
    './icon-512.png'
];

// Pasang & simpan fail asas dalam cache
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
    );
    self.skipWaiting();
});

// Bersihkan cache versi lama bila service worker baru diaktifkan
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// Strategi "cache dulu, jaringan sebagai sandaran" — app tetap boleh dibuka offline
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) return cached;
            return fetch(event.request).catch(() => cached);
        })
    );
});
