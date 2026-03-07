/**
 * VillageLink Service Worker
 * Provides offline support and instant app loading
 */

const CACHE_VERSION = 'v1.0.0';
const STATIC_CACHE = `villagelink-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `villagelink-dynamic-${CACHE_VERSION}`;
const API_CACHE = `villagelink-api-${CACHE_VERSION}`;

// App shell files to cache for instant loading
const STATIC_FILES = [
    '/',
    '/index.html',
    '/manifest.json',
    '/assets/hero-bus-icon.png',
];

// API endpoints to cache with network-first strategy
const API_PATTERNS = [
    '/api/grammandi/produce/listings',
    '/api/food/stalls',
    '/api/food/restaurants',
    '/api/market/prices',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing Service Worker...');
    event.waitUntil(
        caches.open(STATIC_CACHE).then((cache) => {
            console.log('[SW] Caching app shell');
            return cache.addAll(STATIC_FILES).catch(err => {
                console.warn('[SW] Some static files failed to cache:', err);
            });
        })
    );
    self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating Service Worker...');
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) =>
                    key !== STATIC_CACHE &&
                    key !== DYNAMIC_CACHE &&
                    key !== API_CACHE
                ).map((key) => {
                    console.log('[SW] Removing old cache:', key);
                    return caches.delete(key);
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') return;

    // Skip chrome-extension and other non-http(s) requests
    if (!url.protocol.startsWith('http')) return;

    // API requests - Network First with cache fallback
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(networkFirst(request, API_CACHE));
        return;
    }

    // Static assets - Cache First
    if (isStaticAsset(url.pathname)) {
        event.respondWith(cacheFirst(request, STATIC_CACHE));
        return;
    }

    // HTML pages - Network First for freshness
    if (request.headers.get('accept')?.includes('text/html')) {
        event.respondWith(networkFirst(request, DYNAMIC_CACHE));
        return;
    }

    // Default - Stale While Revalidate
    event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
});

// Cache First Strategy (for static assets)
async function cacheFirst(request, cacheName) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        return new Response('Offline', { status: 503 });
    }
}

// Network First Strategy (for API and HTML)
async function networkFirst(request, cacheName) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        // Return offline page for HTML requests
        if (request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/');
        }
        return new Response(JSON.stringify({ error: 'Offline' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Stale While Revalidate (for dynamic content)
async function staleWhileRevalidate(request, cacheName) {
    const cachedResponse = await caches.match(request);
    const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse.ok) {
            caches.open(cacheName).then((cache) => {
                cache.put(request, networkResponse.clone());
            });
        }
        return networkResponse;
    }).catch(() => cachedResponse);

    return cachedResponse || fetchPromise;
}

// Check if request is for static asset
function isStaticAsset(pathname) {
    const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.webp'];
    return staticExtensions.some(ext => pathname.endsWith(ext));
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-orders') {
        event.waitUntil(syncPendingOrders());
    }
});

async function syncPendingOrders() {
    // Get pending orders from IndexedDB and sync
    console.log('[SW] Syncing pending orders...');
    // Implementation will use IndexedDB to store and sync
}

// Push notifications
self.addEventListener('push', (event) => {
    const data = event.data?.json() || { title: 'VillageLink', body: 'New update' };
    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: '/assets/hero-bus-icon.png',
            badge: '/assets/badge-icon.png',
            vibrate: [200, 100, 200],
            tag: data.tag || 'default'
        })
    );
});
