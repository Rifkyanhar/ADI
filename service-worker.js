// Absensi Digital — Service Worker
// Naikkan versi ini SETIAP kali deploy ulang index.html agar HP karyawan/bos
// mengambil versi terbaru, bukan versi lama dari cache.
const CACHE_VERSION = 'absensi-v1';
const APP_SHELL = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Strategi: app shell (HTML/CSS/JS/icon) pakai cache-first supaya bisa dibuka
// tanpa sinyal. Panggilan ke Firebase (Firestore/Auth) TIDAK di-cache di sini —
// itu ditangani oleh Firestore SDK sendiri lewat offline persistence
// (lihat enableIndexedDbPersistence di index.html), yang jauh lebih aman untuk
// data absensi (antre otomatis & sinkron saat online kembali).
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isFirebaseCall = url.hostname.includes('googleapis.com') ||
                          url.hostname.includes('firebaseio.com') ||
                          url.hostname.includes('firestore.googleapis.com');
  if (isFirebaseCall) return; // biarkan lewat, jangan di-intercept

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).catch(() => caches.match('./index.html'));
    })
  );
});
