// register-sw.js
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Removed the / from 'sw.js'
    navigator.serviceWorker.register('sw.js')
      .then(reg => console.log('Service Worker Active!', reg.scope))
      .catch(err => console.log('Service Worker Error', err));
  });
}
