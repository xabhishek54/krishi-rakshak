/**
 * KrishiRakshak Service Worker — Phase 26: PWA Offline Cache
 *
 * Strategy:
 *  - App shell (HTML/CSS/JS/fonts): Cache-first with background update
 *  - API responses: Network-first with IndexedDB fallback
 *  - Static assets (images): Cache-first, long TTL
 *
 * Key API endpoints cached to IndexedDB:
 *  - /api/v1/advisories
 *  - /api/v1/farmers/me/distress
 *  - /api/v1/weather/*
 *  - /api/v1/mandis/compare
 *  - /api/v1/farmers/me/schemes
 */

const CACHE_NAME = 'krishirakshak-v1';
const IDB_NAME = 'krishirakshak-offline';
const IDB_VERSION = 1;

// App shell assets to cache immediately
const APP_SHELL = [
  '/',
  '/index.html',
];

// API paths that should be cached to IndexedDB for offline use
const CACHEABLE_API_PATTERNS = [
  '/api/v1/advisories',
  '/api/v1/farmers/me/distress',
  '/api/v1/weather/',
  '/api/v1/mandis/compare',
  '/api/v1/farmers/me/schemes',
  '/api/v1/alerts',
  '/api/v1/farmers/me/projections',
  '/api/v1/farmers/me/farms',
];

// ── IndexedDB helpers ──────────────────────────────────────────────────────

function openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('api_cache')) {
        db.createObjectStore('api_cache', { keyPath: 'url' });
      }
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(url) {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('api_cache', 'readonly');
    const req = tx.objectStore('api_cache').get(url);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(url, data) {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['api_cache', 'meta'], 'readwrite');
    tx.objectStore('api_cache').put({ url, data, cachedAt: Date.now() });
    tx.objectStore('meta').put({ key: 'lastSync', value: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getLastSync() {
  try {
    const db = await openIDB();
    return new Promise((resolve) => {
      const tx = db.transaction('meta', 'readonly');
      const req = tx.objectStore('meta').get('lastSync');
      req.onsuccess = () => resolve(req.result?.value || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

// ── Install: cache app shell ───────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: clean old caches ─────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: route-based strategy ────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle same-origin or localhost requests
  if (url.origin !== self.location.origin && !url.hostname.includes('localhost')) {
    return;
  }

  // Skip non-GET requests (POST, PUT, etc.)
  if (event.request.method !== 'GET') {
    return;
  }

  // API routes: Network-first with IndexedDB fallback
  const isApiRoute = CACHEABLE_API_PATTERNS.some(p => url.pathname.includes(p));
  if (url.pathname.startsWith('/api/')) {
    if (isApiRoute) {
      event.respondWith(networkFirstWithIDB(event.request));
    }
    return;
  }

  // App shell / static assets: Cache-first
  event.respondWith(cacheFirstStrategy(event.request));
});

// ── Strategy: Network-first with IDB fallback ──────────────────────────────

async function networkFirstWithIDB(request) {
  const cacheKey = request.url;
  try {
    const response = await fetch(request.clone());
    if (response.ok) {
      // Clone and store to IDB (non-blocking)
      const cloned = response.clone();
      cloned.json().then(data => idbPut(cacheKey, data)).catch(() => {});
      return response;
    }
    throw new Error('Network response not ok');
  } catch {
    // Network failed — try IDB
    const cached = await idbGet(cacheKey);
    if (cached) {
      const ageMinutes = Math.round((Date.now() - cached.cachedAt) / 60000);
      const staleNotice = { _offline: true, _age_minutes: ageMinutes };
      const merged = Array.isArray(cached.data)
        ? cached.data
        : { ...cached.data, ...staleNotice };
      return new Response(JSON.stringify(merged), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Served-From': 'offline-cache',
          'X-Cache-Age-Minutes': String(ageMinutes),
        },
      });
    }
    return new Response(JSON.stringify({ error: 'Offline and no cached data available.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// ── Strategy: Cache-first ──────────────────────────────────────────────────

async function cacheFirstStrategy(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok && response.status < 400) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // If it's a navigation request, serve the SPA shell
    if (request.mode === 'navigate') {
      const cached = await caches.match('/');
      if (cached) return cached;
    }
    return new Response('Offline', { status: 503 });
  }
}

// ── Message handler: expose lastSync timestamp ────────────────────────────

self.addEventListener('message', async (event) => {
  if (event.data?.type === 'GET_LAST_SYNC') {
    const lastSync = await getLastSync();
    event.ports[0]?.postMessage({ lastSync });
  }
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
