// Aria Voice Studio - Service Worker
const CACHE_VERSION = 'aria-v3';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;

// Cache configuration
const CACHE_CONFIG = {
    // Maximum entries in dynamic cache before eviction
    maxDynamicEntries: 50,
    // Maximum age for dynamic cache entries (7 days)
    maxAgeMs: 7 * 24 * 60 * 60 * 1000
};

const STATIC_ASSETS = [
    '/AriaVoiceStudio/',
    '/AriaVoiceStudio/index.html',
    '/AriaVoiceStudio/css/base.css',
    '/AriaVoiceStudio/css/layout.css',
    '/AriaVoiceStudio/css/screens.css',
    '/AriaVoiceStudio/css/journey.css',
    '/AriaVoiceStudio/css/snapshots.css',
    '/AriaVoiceStudio/css/sidebar.css',
    '/AriaVoiceStudio/css/modals.css',
    '/AriaVoiceStudio/css/exercises.css',
    '/AriaVoiceStudio/css/onboarding.css',
    '/AriaVoiceStudio/css/tutorial.css',
    '/AriaVoiceStudio/js/app.js',
    '/AriaVoiceStudio/js/core/events.js',
    '/AriaVoiceStudio/js/core/storage.js',
    '/AriaVoiceStudio/js/core/sessionManager.js',
    '/AriaVoiceStudio/js/state/stateManager.js',
    '/AriaVoiceStudio/js/audio/pitch-processor.js',
    '/AriaVoiceStudio/js/audio/index.js',
    '/AriaVoiceStudio/js/utils/validation.js',
    '/AriaVoiceStudio/js/utils/errorBoundary.js',
    '/AriaVoiceStudio/js/utils/formatters.js',
    '/AriaVoiceStudio/js/utils/memoryManager.js',
    '/AriaVoiceStudio/js/utils/performanceMonitor.js',
    '/AriaVoiceStudio/js/ui/toast.js',
    '/AriaVoiceStudio/js/ui/navigation.js',
    '/AriaVoiceStudio/js/services/serviceWorkerManager.js',
    '/AriaVoiceStudio/js/features/vocal-exercises/exerciseUI.js',
    '/AriaVoiceStudio/js/features/vocal-exercises/exerciseManager.js',
    '/AriaVoiceStudio/js/features/vocal-exercises/exerciseRunner.js',
    '/AriaVoiceStudio/js/features/vocal-exercises/exerciseDefinitions.js',
    '/AriaVoiceStudio/js/features/vocal-exercises/exerciseTypes.js',
    '/AriaVoiceStudio/js/features/modals/index.js',
    '/AriaVoiceStudio/js/features/modals/streakModal.js',
    '/AriaVoiceStudio/js/features/modals/helpModal.js',
    '/AriaVoiceStudio/js/features/profile/index.js',
    '/AriaVoiceStudio/js/features/profile/profileModal.js',
    '/AriaVoiceStudio/js/features/profile/avatarManager.js',
    '/AriaVoiceStudio/js/features/settings/index.js',
    '/AriaVoiceStudio/js/features/settings/settingsManager.js',
    '/AriaVoiceStudio/js/features/settings/dataManager.js',
    '/AriaVoiceStudio/manifest.json',
    '/AriaVoiceStudio/icons/icon-192.svg',
    '/AriaVoiceStudio/icons/icon-512.svg'
];

// Install
self.addEventListener('install', (event) => {
    console.log('[SW] Installing...');
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
        // Note: Removed self.skipWaiting() here to allow controlled updates
        // The client will trigger SKIP_WAITING via postMessage when user approves
    );
});

// Activate
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating...');
    event.waitUntil(
        caches.keys()
            .then(keys => {
                return Promise.all(
                    keys.filter(key => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
                        .map(key => {
                            console.log('[SW] Deleting old cache:', key);
                            return caches.delete(key);
                        })
                );
            })
            .then(() => self.clients.claim())
    );
});

// Fetch - Cache first, then network
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Only handle same-origin requests
    if (url.origin !== location.origin) {
        return;
    }

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    event.respondWith(
        caches.match(request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    return cachedResponse;
                }

                return fetch(request)
                    .then(networkResponse => {
                        if (!networkResponse || networkResponse.status !== 200) {
                            return networkResponse;
                        }

                        const responseToCache = networkResponse.clone();
                        
                        // Cache response and run eviction
                        caches.open(DYNAMIC_CACHE)
                            .then(async cache => {
                                await cache.put(request, responseToCache);
                                // Evict old entries to prevent unbounded growth
                                await evictOldCacheEntries(cache);
                            });

                        return networkResponse;
                    })
                    .catch(error => {
                        console.error('[SW] Fetch failed:', error);
                        
                        // Return offline page for navigation requests
                        if (request.mode === 'navigate') {
                            return caches.match('/AriaVoiceStudio/index.html');
                        }
                        
                        return new Response('Offline', {
                            status: 503,
                            statusText: 'Service Unavailable'
                        });
                    });
            })
    );
});

/**
 * Evict old entries from dynamic cache to prevent unbounded growth
 * Uses LRU-style eviction based on entry count
 * @param {Cache} cache - The cache to evict from
 */
async function evictOldCacheEntries(cache) {
    try {
        const keys = await cache.keys();
        
        // Only evict if over the limit
        if (keys.length <= CACHE_CONFIG.maxDynamicEntries) {
            return;
        }
        
        // Calculate how many to remove (remove oldest 20% when limit exceeded)
        const toRemove = Math.ceil(keys.length - CACHE_CONFIG.maxDynamicEntries + (CACHE_CONFIG.maxDynamicEntries * 0.2));
        
        // Remove oldest entries (first in cache = oldest)
        // Note: Cache API doesn't guarantee order, but entries are generally in insertion order
        const keysToRemove = keys.slice(0, toRemove);
        
        await Promise.all(
            keysToRemove.map(key => {
                console.log('[SW] Evicting from dynamic cache:', key.url);
                return cache.delete(key);
            })
        );
        
        console.log(`[SW] Evicted ${keysToRemove.length} entries from dynamic cache`);
    } catch (err) {
        console.warn('[SW] Cache eviction error:', err);
    }
}

// Handle messages
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
