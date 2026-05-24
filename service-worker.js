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
        event.request.url.includes('/api/')) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                return fetch(event.request).then(response => {
                    // Don't cache non-GET requests or error responses
                    if (!response || response.status !== 200 || response.type !== 'basic' || event.request.method !== 'GET') {
                        return response;
                    }
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME)
                        .then(cache => {
                            cache.put(event.request, responseToCache);
                        });
                    return response;
                });
            }).catch(() => {
                // If offline and request fails, we could return a fallback page here
            })
    );
});
