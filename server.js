require('dotenv').config({ quiet: true }); // Load .env local (nếu có), bỏ qua nếu không tìm thấy
const express = require('express');
const path = require('path');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

// ===== VIEW ENGINE: EJS =====
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===== STATIC FILES: Serve từ thư mục gốc =====
app.use(express.static(__dirname));

// ===== STATIC: Serve icons/ ra đường dẫn root (để Lottie load /icon-*.json) =====
// VD: GET /icon-phim-bo.json → f:\Wesite Xem Phim Node\icons\icon-phim-bo.json
app.use(express.static(path.join(__dirname, 'icons')));

// ===== CACHE for API proxies =====
const apiCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 phút
function getCached(key) {
    const entry = apiCache.get(key);
    if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
    return null;
}
function setCache(key, data) {
    apiCache.set(key, { data, ts: Date.now() });
}
let apiQueue = Promise.resolve();
function queuedFetch(url, options) {
    apiQueue = apiQueue.then(() =>
        fetch(url, options).then(async r => ({ status: r.status, text: await r.text() }))
    );
    return apiQueue;
}

// ==========================================
// ROUTES: PAGES (SSR với EJS)
// ==========================================

// Trang chủ
app.get('/', async (req, res) => {
    try {
        const response = await axios.get('https://ophim1.com/v1/api/home', { timeout: 5000 });
        const movies = response.data && response.data.data ? response.data.data.items || [] : [];
        res.render('index', {
            title: 'APhim | Xem Phim Mới 2026 | Phim Hay Vietsub | Phim Full HD Miễn Phí',
            currentPage: 'home',
            movies: movies,
            metaDescription: 'APhim - Website xem phim trực tuyến chất lượng Full HD miễn phí. Kho phim mới khổng lồ, phim chiếu rạp, phim lẻ, phim bộ được cập nhật thường xuyên 2026.',
            canonicalUrl: 'https://aphim.top/',
            ogTitle: 'APhim | Xem Phim Mới 2026 | Phim Hay Vietsub',
            ogImage: 'https://aphim.top/android-chrome-512x512.png',
            ogUrl: 'https://aphim.top/'
        });
    } catch (error) {
        console.error('Lỗi lấy dữ liệu trang chủ:', error.message);
        res.render('index', {
            title: 'APhim | Xem Phim Mới 2026 | Phim Hay Vietsub | Phim Full HD Miễn Phí',
            currentPage: 'home',
            movies: [],
            canonicalUrl: 'https://aphim.top/'
        });
    }
});

// Trang chi tiết phim (SEO-friendly URL: /phim/:slug)
app.get('/phim/:slug', async (req, res) => {
    const slug = req.params.slug;
    if (slug.endsWith('.html') || slug.includes('.')) {
        const cleanUrl = req.url.replace('/phim/', '/').replace('.html', '');
        return res.redirect(301, cleanUrl);
    }
    try {
        const response = await axios.get(`https://ophim1.com/phim/${slug}`, { timeout: 5000 });
        const data = response.data;

        if (data && data.status && data.movie) {
            const movie = data.movie;
            const episodes = data.episodes || [];
            const name = movie.name || movie.title || '';
            const originName = movie.origin_name || '';
            const year = movie.year || new Date().getFullYear();
            const genre = (movie.category && movie.category[0]) ? movie.category[0].name : 'Phim mới';
            const country = (movie.country && movie.country[0]) ? movie.country[0].name : '';
            const eps = movie.episode_total || '?';
            const rawContent = movie.content ? movie.content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() : '';
            const content = rawContent.substring(0, 100);

            // Chuẩn SEO Title: "Xem Phim [Tên Phim] Tập Mới Nhất - Vietsub Thuyết Minh HD [Năm]"
            const seoEps = movie.episode_current && movie.episode_current.toLowerCase() !== 'full' ? `Tập ${movie.episode_current}` : 'Full HD';
            const title = `Xem Phim ${name} ${seoEps} - Vietsub Thuyết Minh HD ${year}`;
            
            const isSeries = movie.type === 'series';
            let desc;
            if (isSeries) {
                desc = `Xem phim ${name} (${originName}) ${year} Vietsub Thuyết Minh Full HD. Bộ phim ${genre} ${country} siêu hay gồm ${eps} tập. ${content}... Xem phim online chất lượng cao, không quảng cáo tại APhim.`;
            } else {
                desc = `Xem phim ${name} (${originName}) ${year} Vietsub Thuyết Minh Full HD. Phim chiếu rạp ${genre} ${country} cực đỉnh. ${content}... Xem phim online chất lượng cao, không quảng cáo tại APhim.`;
            }
            desc = desc.substring(0, 155);

            const img = movie.thumb_url
                ? (movie.thumb_url.startsWith('http') ? movie.thumb_url : 'https://img.ophim.live/uploads/movies/' + movie.thumb_url)
                : 'https://aphim.top/android-chrome-512x512.png';
            const pageUrl = `https://aphim.top/phim/${slug}`;

            res.render('detail', {
                title: title,
                currentPage: 'detail',
                movie: movie,
                episodes: episodes,
                metaDescription: desc,
                canonicalUrl: pageUrl,
                ogUrl: pageUrl,
                ogTitle: title,
                ogImage: img
            });
        } else {
            res.status(404).render('404', { title: '404 - Không tìm thấy trang' });
        }
    } catch (error) {
        console.error('Lỗi lấy chi tiết phim:', error.message);
        res.status(404).send('Không tìm thấy phim yêu cầu');
    }
});

// Render trang xem phim mặc định khi không có slug
app.get('/xem-phim', (req, res) => {
    res.render('watch', {
        title: 'Xem Phim - APhim',
        currentPage: 'watch',
        movie: null,
        episodes: [],
        episode: 'tap-1',
        metaDescription: 'Xem phim online chất lượng cao, miễn phí tại APhim. Cập nhật phim mới mỗi ngày.',
        canonicalUrl: 'https://aphim.top/xem-phim'
    });
});

// Trang xem phim: /xem-phim/:slug/:episode
app.get('/xem-phim/:slug/:episode?', async (req, res) => {
    let { slug, episode } = req.params;
    if (slug.endsWith('.html') || slug.includes('.')) {
        const realSlug = req.query.slug;
        const realEp = req.query.episode || req.query.ep || '1';
        const realEpClean = realEp.toString().replace(/^tap-/, '');
        if (realSlug) {
            return res.redirect(301, `/xem-phim/${realSlug}/tap-${realEpClean}`);
        } else {
            return res.redirect(301, '/');
        }
    }

    // Handle malformed URL containing query symbols in slug (e.g. tieu-dao-tu-cong-tu&episode=1)
    if (slug.includes('&') || slug.includes('?') || slug.includes('=')) {
        const cleanSlug = slug.split(/[&?=]/)[0];
        let ep = req.query.episode || req.query.ep || '1';
        const match = slug.match(/episode=([^&]+)/) || slug.match(/ep=([^&]+)/);
        if (match) {
            ep = match[1];
        }
        const cleanEp = ep.toString().replace(/^tap-/, '');
        return res.redirect(301, `/xem-phim/${cleanSlug}/tap-${cleanEp}`);
    }

    // Redirect to clean path if queried with ?episode=... instead of path segment
    if (!episode && (req.query.episode || req.query.ep)) {
        const ep = req.query.episode || req.query.ep;
        const cleanEp = ep.toString().replace(/^tap-/, '');
        return res.redirect(301, `/xem-phim/${slug}/tap-${cleanEp}`);
    }
    try {
        const response = await axios.get(`https://ophim1.com/phim/${slug}`, { timeout: 5000 });
        const data = response.data;
        const movie = data && data.movie ? data.movie : null;
        const episodes = data && data.episodes ? data.episodes : [];

        let title = 'Xem Phim - APhim';
        let metaDescription = 'Xem phim online chất lượng cao, miễn phí tại APhim. Cập nhật phim mới mỗi ngày.';
        let ogImage = 'https://aphim.top/android-chrome-512x512.png';
        
        if (movie) {
            const name = movie.name || movie.title || '';
            const year = movie.year || '';
            let currentEpStr = episode ? episode.replace('-', ' ') : 'tập mới nhất';
            currentEpStr = currentEpStr.replace(/\b\w/g, l => l.toUpperCase()); // Tap 1
            
            title = `Xem Phim ${name} ${currentEpStr} - Vietsub Thuyết Minh HD ${year}`;
            metaDescription = `Xem phim ${name} ${currentEpStr} Vietsub Thuyết Minh Full HD trực tuyến. Xem ngay không quảng cáo, tải trang siêu tốc tại APhim.`;
            ogImage = movie.thumb_url ? (movie.thumb_url.startsWith('http') ? movie.thumb_url : 'https://img.ophim.live/uploads/movies/' + movie.thumb_url) : ogImage;
        }

        res.render('watch', {
            title: title,
            metaDescription: metaDescription,
            canonicalUrl: `https://aphim.top/xem-phim/${slug}/${episode || 'tap-1'}`,
            ogTitle: title,
            ogImage: ogImage,
            currentPage: 'watch',
            movie: movie,
            episodes: episodes,
            episode: episode || 'tap-1'
        });
    } catch (error) {
        console.error('Lỗi lấy thông tin phim để xem:', error.message);
        res.render('watch', {
            title: 'Xem Phim - APhim',
            currentPage: 'watch',
            movie: null,
            episodes: [],
            episode: 'tap-1'
        });
    }
});

// Trang tìm kiếm
app.get('/search', (req, res) => {
    const keyword = req.query.q || '';
    res.render('search', {
        title: 'Tìm Kiếm Phim - APhim',
        currentPage: 'search',
        keyword: keyword
    });
});

// Trang gói cước
app.get('/pricing', (req, res) => {
    res.render('pricing', {
        title: 'Gói Cước - APhim',
        currentPage: 'pricing'
    });
});

// Trang danh sách phim
app.get('/danh-sach', (req, res) => {
    res.render('danh-sach', {
        title: 'Danh Sách Phim - APhim',
        currentPage: 'danh-sach'
    });
});

// Trang đăng nhập
app.get('/login', (req, res) => {
    res.render('login', {
        title: 'Đăng Nhập - APhim',
        currentPage: 'login'
    });
});

// Legacy redirects (giữ tương thích với URL cũ)
app.get('/index.html', (req, res) => {
    res.redirect(301, '/');
});

app.get(['/movie-detail', '/movie-detail.html'], (req, res) => {
    const slug = req.query.slug;
    if (slug) {
        res.redirect(301, `/phim/${slug}`);
    } else {
        res.redirect(301, '/');
    }
});

app.get(['/watch', '/watch.html'], (req, res) => {
    const slug = req.query.slug;
    const ep = req.query.episode || req.query.ep || '1';
    const cleanEp = ep.toString().replace(/^tap-/, '');
    if (slug) {
        res.redirect(301, `/xem-phim/${slug}/tap-${cleanEp}`);
    } else {
        res.redirect(301, '/');
    }
});

app.get('/search.html', (req, res) => {
    const q = req.query.q || '';
    res.redirect(301, q ? `/search?q=${encodeURIComponent(q)}` : '/search');
});

app.get('/pricing.html', (req, res) => {
    res.redirect(301, '/pricing');
});

app.get('/danh-sach.html', (req, res) => {
    const list = req.query.list || '';
    res.redirect(301, list ? `/danh-sach?list=${encodeURIComponent(list)}` : '/danh-sach');
});

app.get('/login.html', (req, res) => {
    res.redirect(301, '/login');
});

app.get('/categories', (req, res) => {
    res.render('categories', { title: 'Thể Loại - APhim', currentPage: 'categories' });
});

app.get('/filter', (req, res) => {
    res.render('filter', { title: 'Lọc Phim - APhim', currentPage: 'filter' });
});

app.get('/hanh-dong', (req, res) => {
    res.render('hanh-dong', { title: 'Phim Hành Động - APhim', currentPage: 'hanh-dong' });
});

app.get('/linh-mieu', (req, res) => {
    res.render('linh-mieu', { title: 'Linh Miêu - APhim', currentPage: 'linh-mieu' });
});

app.get('/partner', (req, res) => {
    res.render('partner', { title: 'Đối Tác - APhim', currentPage: 'partner' });
});

app.get('/payment', (req, res) => {
    res.render('payment', { title: 'Thanh Toán - APhim', currentPage: 'payment' });
});

app.get('/phim-theo-quoc-gia', (req, res) => {
    res.render('phim-theo-quoc-gia', { title: 'Phim Theo Quốc Gia - APhim', currentPage: 'phim-theo-quoc-gia' });
});

app.get('/phim-x-watch', (req, res) => {
    res.render('phim-x-watch', { title: 'Xem Phim X - APhim', currentPage: 'phim-x-watch' });
});

app.get('/phim-x', (req, res) => {
    res.render('phim-x', { title: 'Phim X - APhim', currentPage: 'phim-x' });
});

app.get('/profile', (req, res) => {
    res.render('profile', { title: 'Hồ Sơ - APhim', currentPage: 'profile' });
});

app.get('/register', (req, res) => {
    res.render('register', { title: 'Đăng Ký - APhim', currentPage: 'register' });
});

app.get('/support', (req, res) => {
    res.render('support', { title: 'Hỗ Trợ - APhim', currentPage: 'support' });
});

// Legacy redirects for new pages
app.get('/categories.html', (req, res) => res.redirect(301, req.url.replace('.html', '')));
app.get('/filter.html', (req, res) => res.redirect(301, req.url.replace('.html', '')));
app.get('/hanh-dong.html', (req, res) => res.redirect(301, req.url.replace('.html', '')));
app.get('/linh-mieu.html', (req, res) => res.redirect(301, req.url.replace('.html', '')));
app.get('/partner.html', (req, res) => res.redirect(301, req.url.replace('.html', '')));
app.get('/payment.html', (req, res) => res.redirect(301, req.url.replace('.html', '')));
app.get('/phim-theo-quoc-gia.html', (req, res) => res.redirect(301, req.url.replace('.html', '')));
app.get('/phim-x-watch.html', (req, res) => res.redirect(301, req.url.replace('.html', '')));
app.get('/phim-x.html', (req, res) => res.redirect(301, req.url.replace('.html', '')));
app.get('/profile.html', (req, res) => res.redirect(301, req.url.replace('.html', '')));
app.get('/register.html', (req, res) => res.redirect(301, req.url.replace('.html', '')));
app.get('/support.html', (req, res) => res.redirect(301, req.url.replace('.html', '')));

app.get('/tiktok5pgXUVWzUxAifGnSg4nsTciyOtz2bvpK.txt', (req, res) => {
    res.send('tiktok-developers-site-verification=5pgXUVWzUxAifGnSg4nsTciyOtz2bvpK');
});

app.get(['/the-thao', '/the-thao.html'], (req, res) => {
    res.redirect(301, '/pricing');
});

// Admin routes (vẫn dùng HTML tĩnh)
app.get('/admin/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin', 'dashboard.html'));
});
app.get('/admin/movies', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin', 'movies.html'));
});
app.get('/admin/users', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin', 'users.html'));
});
app.get('/admin/payments', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin', 'payments.html'));
});

// ==========================================
// SITEMAP
// ==========================================
let sitemapCache = { xml: null, timestamp: 0 };
const SITEMAP_TTL = 6 * 60 * 60 * 1000; // 6 giờ

app.get('/sitemap-images.xml', async (req, res) => {
    try {
        const now = Date.now();
        if (sitemapCache.xml && (now - sitemapCache.timestamp < SITEMAP_TTL)) {
            res.setHeader('Content-Type', 'application/xml; charset=utf-8');
            return res.send(sitemapCache.xml);
        }

        const pages = [1, 2, 3, 4, 5];
        const allMovies = [];

        await Promise.all(pages.slice(0, 1).map(async (page) => {
            try {
                // /danh-sach/phim-moi-cap-nhat không còn tồn tại (404) - dùng /home
                const r = await axios.get('https://ophim1.com/v1/api/home', { timeout: 6000 });
                if (r.data && r.data.data && r.data.data.items) {
                    allMovies.push(...r.data.data.items);
                }
            } catch (e) { /* bỏ qua lỗi */ }
        }));

        const urlEntries = allMovies.map(function (movie) {
            const slug = movie.slug || '';
            const name = (movie.name || '').replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"');
            const pageUrl = 'https://aphim.top/phim/' + slug;
            const thumb = movie.thumb_url
                ? (movie.thumb_url.startsWith('http') ? movie.thumb_url : 'https://img.ophim.live/uploads/movies/' + movie.thumb_url)
                : '';
            const poster = movie.poster_url
                ? (movie.poster_url.startsWith('http') ? movie.poster_url : 'https://img.ophim.live/uploads/movies/' + movie.poster_url)
                : '';

            let imageEntries = '';
            if (thumb) {
                imageEntries += '\n        <image:image>\n            <image:loc>' + thumb + '</image:loc>\n            <image:title>' + name + '</image:title>\n        </image:image>';
            }
            if (poster && poster !== thumb) {
                imageEntries += '\n        <image:image>\n            <image:loc>' + poster + '</image:loc>\n            <image:title>' + name + ' - Poster</image:title>\n        </image:image>';
            }

            if (!imageEntries) return '';

            return '\n    <url>\n        <loc>' + pageUrl + '</loc>' + imageEntries + '\n    </url>';
        }).filter(Boolean).join('');

        const xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
            + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n'
            + '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">'
            + urlEntries
            + '\n</urlset>';

        sitemapCache = { xml: xml, timestamp: now };

        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=21600');
        res.send(xml);
    } catch (e) {
        console.error('[Sitemap] Error:', e.message);
        res.status(500).send('<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
    }
});

app.get('/sitemap.xml', (req, res) => {
    try {
        const sitemapPath = path.join(__dirname, 'sitemap.xml');
        const xml = fs.readFileSync(sitemapPath, 'utf8');
        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        res.send(xml);
    } catch (e) {
        res.status(500).send('<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
    }
});

// ==========================================
// API PROXY CHO OPHIM (cho client-side JS)
// ==========================================
app.use('/v1/api', async (req, res) => {
    const urlsToTry = [
        `https://ophim1.com/v1/api${req.path}`,
        `https://ophim17.cc/v1/api${req.path}`,
        `https://ophim10.cc/v1/api${req.path}`
    ];
    
    let lastError = null;

    for (const targetUrl of urlsToTry) {
        try {
            const response = await axios({
                method: req.method,
                url: targetUrl,
                params: req.query,
                data: req.method === 'POST' || req.method === 'PUT' ? req.body : undefined,
                timeout: 4000,
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                responseType: 'json'
            });
            return res.status(response.status).json(response.data);
        } catch (error) {
            lastError = error;
            // Continue to the next URL if there's an error
            console.warn(`Proxy to ${targetUrl} failed:`, error.message);
        }
    }

    // If all URLs fail
    if (lastError && lastError.response) {
        return res.status(lastError.response.status).json(lastError.response.data);
    } else {
        console.error('All proxy fallback URLs failed:', lastError?.message);
        return res.status(500).json({ status: false, message: lastError?.message || 'All mirrors failed' });
    }
});

// ==========================================
// API PROXIES (giữ nguyên từ server cũ)
// ==========================================

// iSports API
const ISPORTS_API_KEY = 'R86CxN79bK1lrAC0';
let cacheLivescores = { data: null, timestamp: 0 };
let cacheChanges = { data: null, timestamp: 0 };
const ISPORTS_CACHE_TTL = 30000; // 30 seconds

app.get(['/api/isports/livescores', '/v1/api/isports/livescores'], async (req, res) => {
    try {
        const now = Date.now();
        if (cacheLivescores.data && (now - cacheLivescores.timestamp < ISPORTS_CACHE_TTL)) {
            return res.status(200).json(cacheLivescores.data);
        }
        const url = `http://api.isportsapi.com/sport/football/livescores?api_key=${ISPORTS_API_KEY}`;
        const response = await axios.get(url);
        if (response.data && response.data.code === 2) {
            console.warn("iSports Limit Reached!");
            return res.status(200).json({ code: 2, message: "API iSports (Trial 200) đã hết hạn mức ngày hôm nay. Vui lòng cung cấp Key mới.", data: [] });
        }
        cacheLivescores = { data: response.data, timestamp: now };
        res.status(200).json(response.data);
    } catch (error) {
        console.error("iSports Livescores Error:", error.message);
        res.status(500).json({ error: 'Failed to fetch from iSports' });
    }
});

app.get(['/api/isports/schedule', '/v1/api/isports/schedule'], async (req, res) => {
    try {
        const date = req.query.date || '';
        const url = `http://api.isportsapi.com/sport/football/schedule?api_key=${ISPORTS_API_KEY}&date=${date}`;
        const response = await axios.get(url);
        res.status(200).json(response.data);
    } catch (error) {
        console.error("iSports Schedule Error:", error.message);
        res.status(500).json({ error: 'Failed to fetch schedule from iSports' });
    }
});

app.get(['/api/isports/summary', '/v1/api/isports/summary'], async (req, res) => {
    try {
        const url = `http://api.isportsapi.com/sport/football/summary?api_key=${ISPORTS_API_KEY}`;
        const response = await axios.get(url);
        res.status(200).json(response.data);
    } catch (error) {
        console.error("iSports Summary Error:", error.message);
        res.status(500).json({ error: 'Failed to fetch summary from iSports' });
    }
});

app.get(['/api/isports/livetext', '/v1/api/isports/livetext'], async (req, res) => {
    try {
        const url = `http://api.isportsapi.com/sport/football/livetext/list?api_key=${ISPORTS_API_KEY}`;
        const response = await axios.get(url);
        res.status(200).json(response.data);
    } catch (error) {
        console.error("iSports LiveText Error:", error.message);
        res.status(500).json({ error: 'Failed to fetch livetext from iSports' });
    }
});

app.get(['/api/isports/changes', '/v1/api/isports/changes'], async (req, res) => {
    try {
        const now = Date.now();
        if (cacheChanges.data && (now - cacheChanges.timestamp < 10000)) {
            return res.status(200).json(cacheChanges.data);
        }
        const url = `http://api.isportsapi.com/sport/football/livescores/changes?api_key=${ISPORTS_API_KEY}`;
        const response = await axios.get(url);
        if (response.data && response.data.code === 2) {
            if (cacheChanges.data) return res.status(200).json(cacheChanges.data);
        } else {
            cacheChanges = { data: response.data, timestamp: now };
        }
        res.status(200).json(response.data);
    } catch (error) {
        console.error("iSports Changes Error:", error.message);
        if (cacheChanges.data) return res.status(200).json(cacheChanges.data);
        res.status(500).json({ error: 'Failed to fetch changes from iSports' });
    }
});

app.get(['/api/isports/team/:teamId', '/v1/api/isports/team/:teamId'], async (req, res) => {
    try {
        const teamId = req.params.teamId;
        const url = `http://api.isportsapi.com/sport/football/team?api_key=${ISPORTS_API_KEY}&teamId=${teamId}`;
        const response = await axios.get(url);
        res.status(200).json(response.data);
    } catch (error) {
        console.error("iSports Team Error:", error.message);
        res.status(500).json({ error: 'Failed to fetch team from iSports' });
    }
});

const isportsLogoCache = {};
app.get(['/api/isports/image/:teamId', '/v1/api/isports/image/:teamId'], async (req, res) => {
    try {
        const teamId = req.params.teamId;
        let logoUrl = isportsLogoCache[teamId];
        if (!logoUrl) {
            const url = `http://api.isportsapi.com/sport/football/team?api_key=${ISPORTS_API_KEY}&teamId=${teamId}`;
            const response = await axios.get(url);
            if (response.data && response.data.data && response.data.data[0] && response.data.data[0].logo) {
                logoUrl = response.data.data[0].logo;
                isportsLogoCache[teamId] = logoUrl;
            }
        }
        if (logoUrl) {
            const imgParams = {
                responseType: 'arraybuffer',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                    'Accept-Encoding': 'gzip, deflate',
                    'Connection': 'keep-alive'
                }
            };
            const imgResult = await axios.get(logoUrl, imgParams);
            res.set('Content-Type', 'image/png');
            res.set('Cache-Control', 'public, max-age=86400');
            res.send(imgResult.data);
        } else {
            res.status(404).send('No logo');
        }
    } catch (e) {
        res.status(404).send('Error fetching proxy image');
    }
});

// Sportmonks API
const SPORTMONKS_TOKEN = 'x8HmVIpZZd9bz5AqazZIeygXWXnNsqLIPNokCI1M5lQ4LTzMOGTp3i8ePBCk';
const FOOTBALL_DATA_TOKEN = '693024976693480792fe9c97125c68ca';

const fdAxios = axios.create({
    baseURL: 'https://api.football-data.org/v4/',
    headers: { 'X-Auth-Token': FOOTBALL_DATA_TOKEN }
});

app.get(['/api/fd/standings/:league', '/v1/api/fd/standings/:league'], async (req, res) => {
    try {
        const { league } = req.params;
        const response = await fdAxios.get(`competitions/${league}/standings`);
        res.status(200).json(response.data);
    } catch (error) {
        console.error("FD Standings Error:", error.response?.data || error.message);
        res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed' });
    }
});

app.get(['/api/fd/scorers/:league', '/v1/api/fd/scorers/:league'], async (req, res) => {
    try {
        const { league } = req.params;
        const response = await fdAxios.get(`competitions/${league}/scorers?limit=10`);
        res.status(200).json(response.data);
    } catch (error) {
        console.error("FD Scorers Error:", error.response?.data || error.message);
        res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed' });
    }
});

app.get(['/api/fd/matches', '/v1/api/fd/matches'], async (req, res) => {
    try {
        const response = await fdAxios.get(`matches`);
        res.status(200).json(response.data);
    } catch (error) {
        console.error("FD Matches Error:", error.response?.data || error.message);
        res.status(error.response?.status || 500).json(error.response?.data || { error: 'Failed' });
    }
});

app.get(['/api/sportmonks/livescores', '/v1/api/sportmonks/livescores'], async (req, res) => {
    try {
        const url = `https://api.sportmonks.com/v3/football/livescores/inplay?api_token=${SPORTMONKS_TOKEN}&include=participants;scores;periods;events;league.country;round`;
        const response = await axios.get(url);
        res.status(200).json(response.data);
    } catch (error) {
        console.error("Sportmonks Proxy Error:", error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to fetch from Sportmonks' });
    }
});

app.get(['/api/sportmonks/h2h/:t1/:t2', '/v1/api/sportmonks/h2h/:t1/:t2'], async (req, res) => {
    try {
        const { t1, t2 } = req.params;
        const url = `https://api.sportmonks.com/v3/football/fixtures/head-to-head/${t1}/${t2}?api_token=${SPORTMONKS_TOKEN}&include=participants;league;scores;state;venue;events`;
        const response = await axios.get(url);
        res.status(200).json(response.data);
    } catch (error) {
        console.error("Sportmonks H2H Error:", error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to fetch H2H from Sportmonks' });
    }
});

app.get(['/api/sportmonks/fixture/:id', '/v1/api/sportmonks/fixture/:id'], async (req, res) => {
    try {
        const { id } = req.params;
        const url = `https://api.sportmonks.com/v3/football/fixtures/${id}?api_token=${SPORTMONKS_TOKEN}&include=participants;league;venue;state;scores;lineups.player;lineups.type;lineups.details.type;metadata.type;coaches`;
        const response = await axios.get(url);
        res.status(200).json(response.data);
    } catch (error) {
        console.error("Sportmonks Fixture Error:", error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to fetch fixture from Sportmonks' });
    }
});

// RapidAPI Sofascore proxy
app.get(['/api/sofascore/*', '/v1/api/sofascore/*'], async (req, res) => {
    try {
        const targetPath = req.params[0];
        const cacheKey = targetPath;
        const cached = getCached(cacheKey);
        if (cached) {
            res.setHeader('X-Cache', 'HIT');
            return res.status(200).send(cached);
        }
        const url = `https://sportapi7.p.rapidapi.com/${targetPath}`;
        console.log(`[Proxy] Fetching: ${url}`);
        const result = await queuedFetch(url, {
            headers: {
                'x-rapidapi-key': '8e131041e5msheef9200c98e9712p109669jsn30145b3c501d',
                'x-rapidapi-host': 'sportapi7.p.rapidapi.com',
                'Accept': 'application/json'
            }
        });
        if (result.status === 200 && result.text) {
            setCache(cacheKey, result.text);
            res.setHeader('X-Cache', 'MISS');
            res.setHeader('Content-Type', 'application/json');
            res.status(200).send(result.text);
        } else {
            console.error(`[Proxy] Error ${result.status}:`, result.text);
            res.status(result.status || 500).json({ error: 'Upstream Error', details: result.text });
        }
    } catch (error) {
        console.error("RapidAPI Proxy Error:", error.message);
        res.status(200).json({ events: [] });
    }
});

// Sofascore team image proxy
app.get('/api/image/team/:id', async (req, res) => {
    try {
        const teamId = req.params.id;
        const imageUrl = `https://api.sofascore.app/api/v1/team/${teamId}/image`;
        const response = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            validateStatus: () => true,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://www.sofascore.com/',
                'Origin': 'https://www.sofascore.com',
                'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
            }
        });
        if (response.status === 200) {
            res.set('Content-Type', 'image/png');
            res.send(response.data);
        } else {
            res.status(404).send('Not Found');
        }
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch team image' });
    }
});

// ==========================================

// ==========================================
// VSMOV PROXY: Fetch episodes từ nguồn phụ (server-side, tránh CORS)
// GET /api/vsmov/:slug => thử phimapi.com, nguonc.com, rồi ophim1.com
// ==========================================
const vsmovCache = new Map();
const VSMOV_CACHE_TTL = 5 * 60 * 1000; // 5 phút

app.get('/api/vsmov/:slug', async (req, res) => {
    const slug = req.params.slug;
    if (!slug || slug.length > 200) {
        return res.status(400).json({ status: false, message: 'Invalid slug' });
    }

    const cacheEntry = vsmovCache.get(slug);
    if (cacheEntry && Date.now() - cacheEntry.ts < VSMOV_CACHE_TTL) {
        res.setHeader('X-Cache', 'HIT');
        return res.json(cacheEntry.data);
    }

    const mirrors = [
        {
            url: `https://phimapi.com/phim/${slug}`,
            parse: d => ({
                episodes: d?.episodes,
                movie: d?.movie
            })
        },
        {
            url: `https://phim.nguonc.com/api/film/${slug}`,
            parse: d => {
                if (!d || !d.movie || !d.movie.episodes) return null;
                const mappedEps = d.movie.episodes.map(s => ({
                    server_name: s.server_name || 'Vietsub',
                    server_data: (s.items || []).map(it => ({
                        name: it.name && !it.name.toLowerCase().includes('tập') ? `Tập ${it.name}` : (it.name || 'Tập 1'),
                        slug: it.slug || `tap-${it.name}`,
                        link_embed: it.embed || '',
                        link_m3u8: it.m3u8 || ''
                    }))
                }));
                return {
                    episodes: mappedEps,
                    movie: {
                        name: d.movie.name,
                        origin_name: d.movie.original_name,
                        thumb_url: d.movie.thumb_url,
                        poster_url: d.movie.poster_url,
                        content: d.movie.description,
                        quality: d.movie.quality,
                        lang: d.movie.language,
                        year: d.movie.created ? new Date(d.movie.created).getFullYear() : ''
                    }
                };
            }
        },
        {
            url: `https://ophim1.com/phim/${slug}`,
            parse: d => ({
                episodes: d?.data?.item?.episodes || d?.episodes || d?.movie?.episodes,
                movie: d?.data?.item || d?.movie
            })
        }
    ];

    for (const { url, parse } of mirrors) {
        try {
            const response = await axios.get(url, {
                timeout: 8000,
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            const parsed = parse(response.data);
            const episodes = parsed?.episodes;

            if (episodes && Array.isArray(episodes) && episodes.length > 0) {
                const movieMeta = parsed?.movie || null;
                const result = { status: true, source: url, episodes, movie: movieMeta };
                vsmovCache.set(slug, { data: result, ts: Date.now() });
                res.setHeader('X-Cache', 'MISS');
                return res.json(result);
            }
        } catch (err) {
            console.warn(`[VSMOV] Lỗi fetch ${url}:`, err.message);
        }
    }

    res.status(500).json({ status: false, message: 'All API proxy mirrors failed' });
});

// 404 HANDLER
// ==========================================
app.use((req, res) => {
    res.status(404).render('404', {
        title: '404 - Không tìm thấy trang',
        currentPage: '404'
    });
});

// ==========================================
// START SERVER
// ==========================================
const server = app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🎬 APhim Server (Express + EJS) đang chạy!           ║
║                                                           ║
║   🌐 URL: http://localhost:${PORT}                        ║
║                                                           ║
║   📄 Trang chính (SSR):                                  ║
║   • http://localhost:${PORT}/                             ║
║   • http://localhost:${PORT}/phim/:slug                   ║
║   • http://localhost:${PORT}/xem-phim/:slug/:ep           ║
║   • http://localhost:${PORT}/search                       ║
║   • http://localhost:${PORT}/pricing                      ║
║   • http://localhost:${PORT}/danh-sach                    ║
║   • http://localhost:${PORT}/login                        ║
║   • http://localhost:${PORT}/profile                      ║
║   • http://localhost:${PORT}/admin/dashboard              ║
║   • http://localhost:${PORT}/sitemap.xml                  ║
║                                                           ║
║   🚀 SSR với EJS + Express                               ║
║   ⏹️  Nhấn Ctrl+C để dừng server                         ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
    `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
    });
});
