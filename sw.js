/**
 * TechGuru PWA Service Worker — FIXED 2026-09-15
 *
 * What changed vs sw.js v1.0.6 and why:
 *  1. CACHE_VERSION bumped -> old caches (which still hold the pre-Missoula
 *     index.html and the old CSS) are deleted and every visitor picks up the
 *     new site. v1.0.6 served /index.html CACHE-FIRST, so returning visitors
 *     never saw the Missoula update.
 *  2. Navigations are now NETWORK-FIRST (cache = offline fallback only).
 *     Content updates reach visitors immediately instead of being frozen.
 *  3. Precache no longer uses cache.addAll(): one 404 in the list used to
 *     abort the whole precache. Each asset now fails independently.
 *  4. STATIC_ASSETS matches what index.html actually loads
 *     (chat-widget-dark-glass.css + chat-widget.js, not the .min names) and
 *     includes css/layout-v2.css.
 *
 * Upload order matters: restore the missing css/ files FIRST, then this file.
 */

const CACHE_VERSION = 'techguru-v1.3.0-20260930';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;

// Static assets to cache on install.
// Every entry here must exist on the server — a 404 is now logged and skipped
// instead of killing the install, but keep the list truthful.
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/design-tokens.css',
  '/css/components.css',
  '/css/styles.css',
  '/css/layout-v2.css',
  '/css/cinematic.css',
  '/css/nav-glass.css',
  '/css/story.css',
  '/css/chat-widget-dark-glass.css',
  '/js/scripts.js',
  '/js/cinematic.js',
  '/js/story.js',
  '/js/chat-widget.js',
  '/images/icons/nav-icon-new.webp',
  '/images/chat-avatar.webp',
  '/favicon-48x48.png',
  '/favicon-512x512.png',
  '/apple-touch-icon.png',
  '/site.webmanifest'
];

// Install event - cache static assets (resilient: one bad URL can't abort all)
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing ' + CACHE_VERSION + '...');

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        return Promise.all(
          STATIC_ASSETS.map((url) =>
            cache.add(url).catch((err) => {
              console.warn('[Service Worker] Skipped precache (missing?):', url, err && err.message);
            })
          )
        );
      })
      .then(() => {
        console.log('[Service Worker] Installation complete');
        return self.skipWaiting(); // Activate immediately
      })
      .catch((error) => {
        console.error('[Service Worker] Installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating ' + CACHE_VERSION + '...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              // Remove caches that don't match current version
              return cacheName.startsWith('techguru-') &&
                !cacheName.startsWith(CACHE_VERSION);
            })
            .map((cacheName) => {
              console.log('[Service Worker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[Service Worker] Activation complete');
        return self.clients.claim(); // Take control immediately
      })
  );
});

// Fetch event
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Page navigations - NETWORK FIRST so site updates actually ship.
  // Cache (then offline page) is the fallback when the network is unreachable.
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithOfflineFallback(request));
    return;
  }

  // Images - cache first, network fallback
  if (request.destination === 'image') {
    event.respondWith(cacheFirstStrategy(request, IMAGE_CACHE));
    return;
  }

  // Static assets (css/js) - NETWORK first so styling/script updates ship on
  // the very next load (v1.2.0's cache-first + missed bump served stale CSS);
  // the cache now only acts as offline / failed-fetch fallback.
  event.respondWith(networkFirstStrategy(request, STATIC_CACHE));
});

/**
 * Cache-first strategy: check cache, fall back to network.
 * Good for versioned static assets.
 */
async function cacheFirstStrategy(request, cacheName = STATIC_CACHE) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);

    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.error('[Service Worker] Fetch failed:', error);
    throw error;
  }
}

/**
 * Network-first strategy: try network, fall back to cache.
 */
async function networkFirstStrategy(request, cacheName = DYNAMIC_CACHE) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.error('[Service Worker] Network request failed:', error);

    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    throw error;
  }
}

/**
 * Navigations: network first, then cached page, then cached /index.html.
 */
async function networkFirstWithOfflineFallback(request) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const offlinePage = await caches.match('/index.html');
    if (offlinePage) {
      return offlinePage;
    }

    throw error;
  }
}

// Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(DYNAMIC_CACHE)
        .then((cache) => cache.addAll(event.data.urls))
    );
  }
});

// Background sync for failed requests (if supported)
if ('sync' in self.registration) {
  self.addEventListener('sync', (event) => {
    console.log('[Service Worker] Background sync:', event.tag);

    if (event.tag === 'sync-contact-forms') {
      event.waitUntil(syncContactForms());
    }
  });
}

async function syncContactForms() {
  // Implement background sync for contact form submissions
  console.log('[Service Worker] Syncing contact forms...');
}
