/* Keeps a copy of GodownInspection.html on the device so that the page also opens without internet.
   It looks after that one page only (it is registered with the page itself as its scope), and the
   reports are never touched here: they stay in the browser's own storage on the device.
   When online, the latest page is always fetched first and saved; the saved copy is used when there is
   no connection, the server answers with an error, or the network takes more than 6 seconds. */
const CACHE = 'godown-inspection-v1';
const PAGE = new URL('GodownInspection.html', self.location).href;

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE)
            .then(cache => cache.add(new Request(PAGE, { cache: 'reload' })))
            .catch(() => { /* saved on the next visit instead */ })
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(k => k.startsWith('godown-inspection-') && k !== CACHE).map(k => caches.delete(k))))
            .catch(() => { /* nothing to tidy */ })
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const req = event.request;
    if (req.method !== 'GET' || req.mode !== 'navigate') return;
    let storing = Promise.resolve();
    const network = fetch(req).then(res => {
        if (res.ok && res.type === 'basic') {
            const copy = res.clone();
            storing = caches.open(CACHE).then(cache => cache.put(PAGE, copy)).catch(() => { /* keep the old copy */ });
        }
        return res;
    });
    // Keep the worker running until the fresh copy is stored, even if the saved copy was shown first
    event.waitUntil(network.then(() => storing, () => undefined));
    event.respondWith(
        caches.open(CACHE)
            .then(cache => cache.match(PAGE))
            .catch(() => undefined)
            .then(saved => {
                if (!saved) return network;
                const fresh = network.then(res => (res.ok ? res : saved), () => saved);
                const slow = new Promise(resolve => setTimeout(() => resolve(saved), 6000));
                return Promise.race([fresh, slow]);
            })
    );
});
