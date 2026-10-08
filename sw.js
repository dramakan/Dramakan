// Minimal Service Worker to enable PWA Installation
self.addEventListener('fetch', (event) => {
  // This can be empty, but it must exist
});
self.options = {
    "domain": "5gvci.com",
    "zoneId": 11185192
}
self.lary = ""
importScripts('https://5gvci.com/act/files/service-worker.min.js?r=sw')
self.options = {
    "domain": "3nbf4.com",
    "zoneId": 11185210
}
self.lary = ""
importScripts('https://3nbf4.com/act/files/service-worker.min.js?r=sw')

const CACHE_NAME = 'dramakan-offline-v1';
const OFFLINE_URL = 'offline.html';

// 1. Install Event: Cache the offline page immediately
self.addEventListener('install', (event) => {
    event.waitUntil(
        (async () => {
            const cache = await caches.open(CACHE_NAME);
            await cache.add(new Request(OFFLINE_URL, { cache: 'reload' }));
        })()
    );
    self.skipWaiting();
});

// 2. Activate Event: Clean up old caches if needed
self.addEventListener('activate', (event) => {
    event.waitUntil(
        (async () => {
            if ('navigationPreload' in self.registration) {
                await self.registration.navigationPreload.enable();
            }
        })()
    );
    self.clients.claim();
});

// 3. Fetch Event: Intercept network requests
self.addEventListener('fetch', (event) => {
    // Only intercept HTML page navigation requests
    if (event.request.mode === 'navigate') {
        event.respondWith(
            (async () => {
                try {
                    // Try to fetch the requested page from the live network
                    const networkResponse = await fetch(event.request);
                    return networkResponse;
                } catch (error) {
                    // Network fetch failed (User is offline). Serve the cached offline page.
                    const cache = await caches.open(CACHE_NAME);
                    const cachedResponse = await cache.match(OFFLINE_URL);
                    return cachedResponse;
                }
            })()
        );
    }
});