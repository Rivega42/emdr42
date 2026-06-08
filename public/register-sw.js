// Регистрация service worker. Вынесено из inline-<Script> в app/layout.tsx
// чтобы CSP в prod не требовала 'unsafe-inline' в script-src.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker
      .register('/sw.js')
      .catch(function (err) {
        console.warn('SW registration failed', err);
      });
  });
}
