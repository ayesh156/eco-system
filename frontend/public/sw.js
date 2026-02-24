/**
 * Service Worker for ECOTEC System
 * Caches static assets (JS, CSS, fonts, images) for instant subsequent loads
 * Uses Cache-First strategy for static assets, Network-First for API calls
 * 
 * Version: 1.0.0
 */

const CACHE_VERSION = 'ecotec-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const FONT_CACHE = `${CACHE_VERSION}-fonts`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;
const API_CACHE = `${CACHE_VERSION}-api`;

// Static assets to pre-cache on install
const PRECACHE_URLS = [
  '/',
  '/index.html',
];

// Patterns for different cache strategies
const STATIC_EXTENSIONS = /\.(js|css|woff2?|ttf|eot)(\?.*)?$/i;
const IMAGE_EXTENSIONS = /\.(png|jpg|jpeg|gif|svg|ico|webp|avif)(\?.*)?$/i;
const FONT_DOMAINS = ['fonts.googleapis.com', 'fonts.gstatic.com'];
const API_PATTERN = /\/api\//;

// Install: Pre-cache critical assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Pre-caching critical assets');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => self.skipWaiting()) // Activate immediately
  );
});

// Activate: Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name.startsWith('ecotec-') && !name.startsWith(CACHE_VERSION))
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim()) // Take control immediately
  );
});

// Fetch: Apply caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) return;

  // Skip Vite dev-server requests so HMR and source-file serving work
  // correctly. In dev mode Vite serves raw source files (tsx/ts/jsx)
  // from paths like /src/, /@vite/, /@fs/, /node_modules/.vite/ etc.
  if (
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/@vite/') ||
    url.pathname.startsWith('/@fs/') ||
    url.pathname.startsWith('/@id/') ||
    url.pathname.startsWith('/@react-refresh') ||
    url.pathname.startsWith('/node_modules/.vite/')
  ) {
    return; // Let the browser handle it normally
  }

  // Strategy 1: Font files - Cache First (fonts rarely change)
  if (FONT_DOMAINS.some(domain => url.hostname.includes(domain))) {
    event.respondWith(cacheFirst(request, FONT_CACHE, 30 * 24 * 60 * 60 * 1000)); // 30 days
    return;
  }

  // Strategy 2: Static assets (JS, CSS, WOFF) - Cache First with version busting
  if (STATIC_EXTENSIONS.test(url.pathname)) {
    // Vite adds content hashes to filenames, so cache forever
    event.respondWith(cacheFirst(request, STATIC_CACHE, 365 * 24 * 60 * 60 * 1000)); // 1 year
    return;
  }

  // Strategy 3: Images - Cache First
  if (IMAGE_EXTENSIONS.test(url.pathname)) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE, 7 * 24 * 60 * 60 * 1000)); // 7 days
    return;
  }

  // Strategy 4: API calls - Network First with short cache fallback
  if (API_PATTERN.test(url.pathname)) {
    event.respondWith(networkFirst(request, API_CACHE, 2 * 60 * 1000)); // 2 min cache
    return;
  }

  // Strategy 5: HTML pages - Network First (always get latest)
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirst(request, STATIC_CACHE, 60 * 1000)); // 1 min cache
    return;
  }

  // Default: Network with cache fallback
  event.respondWith(networkFirst(request, STATIC_CACHE, 5 * 60 * 1000));
});

/**
 * Cache-First Strategy
 * Try cache first, fallback to network. Cache the network response.
 */
async function cacheFirst(request, cacheName, maxAge) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    // Check if cache entry is still fresh
    const cachedDate = cachedResponse.headers.get('sw-cached-at');
    if (cachedDate && maxAge) {
      const age = Date.now() - parseInt(cachedDate);
      if (age > maxAge) {
        // Cache expired, fetch new version in background
        fetchAndCache(request, cache).catch(() => {});
      }
    }
    return cachedResponse;
  }

  return fetchAndCache(request, cache);
}

/**
 * Network-First Strategy
 * Try network first, fallback to cache. Update cache with network response.
 */
async function networkFirst(request, cacheName, maxAge) {
  const cache = await caches.open(cacheName);

  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Clone and cache the response
      const cloned = networkResponse.clone();
      const headers = new Headers(cloned.headers);
      headers.set('sw-cached-at', Date.now().toString());
      
      const body = await cloned.blob();
      const cachedResponse = new Response(body, {
        status: cloned.status,
        statusText: cloned.statusText,
        headers: headers,
      });
      
      cache.put(request, cachedResponse).catch(() => {});
    }
    
    return networkResponse;
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      console.log('[SW] Serving from cache (offline):', request.url);
      return cachedResponse;
    }
    
    // Nothing in cache either, return offline page for HTML requests
    if (request.headers.get('accept')?.includes('text/html')) {
      return cache.match('/') || new Response('Offline', { status: 503 });
    }
    
    throw error;
  }
}

/**
 * Fetch from network and store in cache
 */
async function fetchAndCache(request, cache) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cloned = networkResponse.clone();
      const headers = new Headers(cloned.headers);
      headers.set('sw-cached-at', Date.now().toString());
      
      const body = await cloned.blob();
      const cachedResponse = new Response(body, {
        status: cloned.status,
        statusText: cloned.statusText,
        headers: headers,
      });
      
      cache.put(request, cachedResponse).catch(() => {});
    }
    
    return networkResponse;
  } catch (error) {
    throw error;
  }
}

// Listen for messages from the main app
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data === 'CLEAR_CACHE') {
    caches.keys().then((names) => {
      names.forEach((name) => caches.delete(name));
    });
  }

  if (event.data === 'GET_VERSION') {
    event.ports[0]?.postMessage({ version: CACHE_VERSION });
  }
});
