// EMDR-AI Service Worker — офлайн-кэширование для непрерывности терапии
// v2 (2026-05-27): не кэшируем /api/* (PHI) и /trpc/* (PHI); fallback
// сужен до /offline вместо /session (на /dashboard fallback в /session
// показывает невалидный контент и дезориентирует пациента).
const CACHE_NAME = 'emdr42-v2';

// Критические ресурсы для работы офлайн-BLS
const PRECACHE_URLS = [
  '/',
  '/session',
  '/offline',
];

// Установка: кэшируем критические ресурсы
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// Активация: чистим старые кэши (включая v1 c PHI)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Стратегия: Network-first для API без кэша, Cache-first для статики
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Пропускаем не-GET запросы и внешние ресурсы
  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // API/tRPC-запросы — network-only БЕЗ кэширования.
  // Ответы содержат PHI пациентов (sessions, transcripts, notes) — кэшировать
  // их в Cache Storage браузера = HIPAA/GDPR violation.
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/trpc/')) {
    event.respondWith(fetch(request));
    return;
  }

  // Next.js статика — cache-first (immutable assets)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    );
    return;
  }

  // Остальные страницы — network-first с fallback на /offline.
  // Раньше fallback был /session — это приводило к показу EMDR-канваса
  // на любой странице при потере сети, что дезориентирует пациента
  // (особенно если он на /dashboard или /settings/billing).
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Кэшируем только HTML страниц приложения, без PHI.
        const isHtml = response.headers.get('content-type')?.includes('text/html');
        if (isHtml) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then((cached) => cached || caches.match('/offline'))
      )
  );
});
