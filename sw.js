// sw.js
self.addEventListener('install', (event) => {
  self.skipWaiting(); 
});

self.addEventListener('fetch', (event) => {
  // Static pages still need this handler to pass the install check
  event.respondWith(fetch(event.request));
});
