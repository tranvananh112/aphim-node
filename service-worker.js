// =====================================================
// A Phim Service Worker — v6
// Chiến lược:
//   HTML pages          → Stale-While-Revalidate (trả cache ngay, update ngầm)
//   CSS / JS (versioned)→ Cache-First (có ?v=N nên an toàn)
//   Ảnh / Media         → Cache-First (ít thay đổi)
//   Fonts Google        → Cache-First (bất biến)
//   API OPhim           → Stale-While-Revalidate
// =====================================================

const CACHE_VERSION  = 'aphim-v19';
const FONT_CACHE     = 'aphim-fonts-v1';
const IMAGE_CACHE    = 'aphim-images-v14';
const API_CACHE      = 'aphim-api-v6';

const ALL_CACHES = [CACHE_VERSION, FONT_CACHE, IMAGE_CACHE, API_CACHE];

// ── Install ──────────────────────────────────────────
self.addEventListener('install', event => {
    // Kích hoạt ngay, không chờ tab cũ đóng
    self.skipWaiting();
});

// ── Activate: xóa TOÀN BỘ cache cũ ──────────────────
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(k => !ALL_CACHES.includes(k))
                    .map(k => {
                        console.log('[SW] Xóa cache cũ:', k);
                        return caches.delete(k);
                    })
            )
        ).then(() => self.clients.claim())
    );
});

// ── Fetch ─────────────────────────────────────────────
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Bỏ qua non-GET
    if (request.method !== 'GET') return;

    // Bỏ qua phim-x (cross-origin embeds)
    if (url.pathname.includes('phim-x')) return;

    // ── 1. Google Fonts — Cache First (bất biến) ──────
    if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
        event.respondWith(cacheFirst(request, FONT_CACHE));
        return;
    }

    // ── 2. OPhim API / Images — Stale-While-Revalidate ─
    if (url.hostname.includes('ophim') || url.hostname.includes('img.ophim')) {
        event.respondWith(staleWhileRevalidate(request, API_CACHE));
        return;
    }

    // ── 3. Cross-origin (ads, analytics...) — bỏ qua ─
    if (url.origin !== location.origin) return;

    // ── 4. Ảnh gốc — Cache First (ít thay đổi) ────────
    if (/\.(webp|png|jpg|jpeg|gif|svg|ico)(\?.*)?$/.test(url.pathname)) {
        event.respondWith(cacheFirst(request, IMAGE_CACHE));
        return;
    }

    // ── 5. HTML pages — Stale-While-Revalidate ────────
    // Trả cache ngay (< 10ms) → update ngầm → lần sau có bản mới
    // Hiệu quả: trang thứ 2 trở đi gần như INSTANT
    if (url.pathname.endsWith('.html') || url.pathname === '/' || url.pathname === '') {
        event.respondWith(staleWhileRevalidate(request, CACHE_VERSION));
        return;
    }

    // ── 6. CSS / JS (có ?v=N) — Cache First ───────────
    // Versioned assets: an toàn để cache lâu dài
    if (/\.(css|js)(\?.*)?$/.test(url.pathname)) {
        event.respondWith(cacheFirst(request, CACHE_VERSION));
        return;
    }

    // ── X. Database/API/Config — Network First ────────
    if (url.hostname.includes('firestore') || 
        url.hostname.includes('firebaseio') || 
        url.hostname.includes('api.') || 
        url.pathname.endsWith('.json')) {
        event.respondWith(networkFirst(request, API_CACHE));
        return;
    }

    // ── 7. Còn lại — Stale-While-Revalidate ──────────
    event.respondWith(staleWhileRevalidate(request, CACHE_VERSION));
});

// ─────────────────────────────────────────────────────
// Các hàm chiến lược cache
// ─────────────────────────────────────────────────────

/** Network First: thử mạng → cache nếu offline */
/** Offline/Network Failure helper response */
function getOfflineResponse(request) {
    const isHtml = request.mode === 'navigate' || 
                   (request.headers.get('accept') && request.headers.get('accept').includes('text/html'));

    if (isHtml) {
        return new Response(
            `<!DOCTYPE html>
            <html lang="vi">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Mất kết nối mạng - APhim</title>
                <style>
                    body { background: #0d0f1a; color: #fff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
                    .container { padding: 30px; max-width: 400px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; backdrop-filter: blur(10px); box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
                    .icon { font-size: 48px; margin-bottom: 16px; }
                    h1 { font-size: 20px; font-weight: 700; margin-bottom: 8px; color: #fcd576; }
                    p { color: #9ca3af; font-size: 14px; line-height: 1.5; margin-bottom: 24px; }
                    button { background: #ef4444; color: #fff; border: none; padding: 12px 24px; border-radius: 9999px; font-size: 14px; cursor: pointer; font-weight: bold; transition: all 0.2s; box-shadow: 0 4px 12px rgba(239,68,68,0.3); }
                    button:hover { background: #dc2626; transform: translateY(-1px); }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="icon">📡</div>
                    <h1>Mất kết nối mạng</h1>
                    <p>Không thể tải trang lúc này do sự cố kết nối. Vui lòng kiểm tra lại mạng internet của bạn và thử lại.</p>
                    <button onclick="window.location.reload()">Thử lại</button>
                </div>
            </body>
            </html>`,
            { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
    }

    return new Response(
        JSON.stringify({ error: 'Network failure' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
}

/** Network First: thử mạng → cache nếu offline */
async function networkFirst(request, cacheName) {
    const cache = await caches.open(cacheName);
    try {
        const response = await fetch(request);
        if (response.ok) {
            cache.put(request, response.clone());
        }
        return response;
    } catch {
        const cached = await cache.match(request);
        return cached || getOfflineResponse(request);
    }
}

/** Cache First: trả cache ngay → nếu không có thì fetch và lưu */
async function cacheFirst(request, cacheName) {
    const cache  = await caches.open(cacheName);
    const cached = await cache.match(request);
    if (cached) return cached;
    try {
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
    } catch {
        return getOfflineResponse(request);
    }
}

/** Stale-While-Revalidate: trả cache ngay & cập nhật ngầm */
async function staleWhileRevalidate(request, cacheName) {
    const cache  = await caches.open(cacheName);
    const cached = await cache.match(request);

    const networkFetch = fetch(request).then(response => {
        if (response.ok) cache.put(request, response.clone());
        return response;
    }).catch(() => null);

    return cached || await networkFetch || getOfflineResponse(request);
}

// ── Nhận lệnh từ client ───────────────────────────────
self.addEventListener('message', event => {
    if (event.data?.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    if (event.data?.type === 'CLEAR_CACHE') {
        caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))));
    }
});
