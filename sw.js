const CACHE = 'aiornahv1';

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(['/index.html', '/manifest.json', '/icon-192.svg']))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(clients.claim());
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Handle share target POST
  if (url.pathname === '/share-target' && e.request.method === 'POST') {
    e.respondWith(
      (async () => {
        const formData = await e.request.formData();
        const title = formData.get('title') || '';
        const text = formData.get('text') || '';
        const sharedUrl = formData.get('url') || '';
        const file = formData.get('media');

        // Store shared data for the app to pick up
        const cache = await caches.open(CACHE);

        if (file && file.size > 0) {
          // Store the image file
          const arrayBuffer = await file.arrayBuffer();
          const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
          await cache.put('/shared-data', new Response(JSON.stringify({
            type: 'image',
            base64,
            mimeType: file.type,
            title,
            text,
            url: sharedUrl,
            timestamp: Date.now()
          }), { headers: { 'Content-Type': 'application/json' } }));
        } else {
          await cache.put('/shared-data', new Response(JSON.stringify({
            type: 'text',
            title,
            text,
            url: sharedUrl,
            timestamp: Date.now()
          }), { headers: { 'Content-Type': 'application/json' } }));
        }

        // Redirect to app
        return Response.redirect('/index.html?shared=1', 303);
      })()
    );
    return;
  }

  // Cache-first for app shell
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
