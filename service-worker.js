// Service Worker ringkas untuk Poket Harian
// Tujuan: (1) bolehkan Chrome anggap app ni "installable", (2) app boleh dibuka walau offline

// PENTING: nombor versi cache dinaikkan (v1 -> v2) supaya cache LAMA yang tersimpan
// dalam app yang dah di-install automatik dibuang bila service worker baru ni aktif.
const CACHE_NAME = 'poket-harian-cache-v2';
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

// Bersihkan SEMUA cache versi lama (contoh: v1) bila service worker baru diaktifkan
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// ------------------------------------------------------------------
// STRATEGI FETCH (dipecahkan ikut jenis fail — ini punca masalah asal):
//
// - Dokumen HTML (index.html): "Network-first" — bila online, SENTIASA
//   ambil versi TERKINI dari server dulu (supaya update/ciri baru macam
//   graf Trend Simpanan terus keluar), cache hanya sandaran bila offline.
//   Strategi lama "cache-first" punca app installed "tersekat" pada versi
//   lama walau code kat GitHub dah update.
//
// - Fail statik (manifest, ikon): kekal "cache-first" — jarang berubah,
//   jadi jimat data & lebih laju.
// ------------------------------------------------------------------
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    const isHtmlRequest = event.request.mode === 'navigate' ||
        (event.request.headers.get('accept') || '').includes('text/html');

    if (isHtmlRequest) {
        event.respondWith(
            fetch(event.request)
                .then((networkResponse) => {
                    const cloned = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
                    return networkResponse;
                })
                .catch(() => caches.match(event.request)) // offline -> guna cache sandaran
        );
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) return cached;
            return fetch(event.request).then((networkResponse) => {
                const cloned = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
                return networkResponse;
            });
        })
    );
});
