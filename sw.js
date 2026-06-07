// sw.js
self.addEventListener('install', (event) => {
  // Forces the waiting service worker to become the active service worker immediately
  self.skipWaiting(); 
  console.log('Bakery Service Worker installed.');
});

self.addEventListener('activate', (event) => {
  // Allows the service worker to take control of the page immediately
  event.waitUntil(self.clients.claim());
  console.log('Bakery Service Worker activated.');
});

self.addEventListener('fetch', (event) => {
  // This empty fetch handler is mandatory to trigger the installation prompt
  event.respondWith(fetch(event.request));
});
