const CACHE_VERSION = "v23-2026-07-17-gazelle-search";
const CACHE_PREFIX = "chevrolet-niva-manual-";
const CACHE_NAME = `${CACHE_PREFIX}${CACHE_VERSION}`;

const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./os-search.js",
  "./manifest.webmanifest",
  "./icons/icon.svg"
];

const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".avif"];
const FONT_EXTENSIONS = [".woff", ".woff2", ".ttf", ".otf"];

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

function isCacheable(response) {
  return response && response.ok && (response.type === "basic" || response.type === "default");
}

async function putInCache(request, response) {
  if (!isCacheable(response)) return;
  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, response.clone());
}

async function preloadAppShell() {
  const cache = await caches.open(CACHE_NAME);

  await Promise.allSettled(
    APP_SHELL.map(async asset => {
      const request = new Request(asset, { cache: "reload" });
      const response = await fetch(request);
      if (isCacheable(response)) {
        await cache.put(asset, response);
      }
    })
  );
}

async function networkFirst(request, fallbackUrl) {
  try {
    const response = await fetch(new Request(request, { cache: "no-cache" }));
    await putInCache(request, response);
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;

    if (fallbackUrl) {
      const fallback = await caches.match(fallbackUrl);
      if (fallback) return fallback;
    }

    throw error;
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  await putInCache(request, response);
  return response;
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);

  const networkPromise = fetch(request)
    .then(async response => {
      await putInCache(request, response);
      return response;
    })
    .catch(() => null);

  return cached || networkPromise;
}

self.addEventListener("install", event => {
  event.waitUntil(preloadAppShell());
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", event => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Не перехватываем внешние скрипты/аналитику/CDN: пусть браузер работает с ними напрямую.
  if (!isSameOrigin(url)) return;

  const pathname = url.pathname.toLowerCase();
  const extension = pathname.includes(".") ? pathname.slice(pathname.lastIndexOf(".")) : "";
  const acceptsHtml = request.headers.get("accept")?.includes("text/html");

  // HTML и навигация: всегда сначала сеть, чтобы не застревать на старой index.html.
  if (request.mode === "navigate" || acceptsHtml) {
    event.respondWith(networkFirst(request, "./index.html"));
    return;
  }

  // Главные файлы приложения: сначала сеть, иначе fallback из кэша.
  // Это исправляет ситуацию, когда старый app.js/styles.css продолжали отдаваться из Service Worker.
  if ([".js", ".css", ".webmanifest", ".json"].includes(extension)) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Изображения и шрифты: cache-first для экономии трафика и офлайн-режима.
  if (pathname.includes("/images/") || IMAGE_EXTENSIONS.includes(extension) || FONT_EXTENSIONS.includes(extension)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Остальные локальные GET-запросы: быстро из кэша, обновление в фоне.
  event.respondWith(staleWhileRevalidate(request));
});
