const CACHE_NAME = 'do-warehouse-v1';
const ASSETS_TO_CACHE = [
    './',
    './app.html',
    './app.js',
    './drive.js',
    './styles.css',
    './translations.js',
    './manifest.json',
    'https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS_TO_CACHE))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    // Don't intercept Google API calls or OAuth redirects
    if (event.request.url.includes('googleapis.com') || 
        event.request.url.includes('accounts.google.com') ||
        event.request.url.includes('/api/') ||
        event.request.method !== 'GET') {
        return;
    }

    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            const networkFetch = fetch(event.request).then(networkResponse => {
                // Update the cache with the newest version from the network
                if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return networkResponse;
            }).catch(() => {
                // Network failed, we'll just rely on the cached response if available
            });

            // Return cached response immediately if available (stale-while-revalidate)
            // Or wait for the network response if not in cache
            return cachedResponse || networkFetch;
        })
    );
});
