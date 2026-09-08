/**
 * High-Capacity Multi-Source Sitemap Generator for APhim (Node Version)
 * Scans all available endpoints across PhimAPI, NguonC, and categories to discover maximum unique movies.
 */

const fs = require('fs');

const DOMAIN = process.env.DOMAIN || 'https://aphim.top';
const TODAY = new Date().toISOString().split('T')[0];

function escapeXml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function getCleanImageUrl(rawUrl) {
    if (!rawUrl) return '';
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) return rawUrl;
    const cleanPath = rawUrl.startsWith('uploads/') ? rawUrl : 'uploads/movies/' + rawUrl.replace(/^\/+/, '');
    return `https://phimimg.com/${cleanPath}`;
}

async function fetchJsonWithRetry(url, retries = 2) {
    for (let i = 0; i <= retries; i++) {
        try {
            const res = await fetch(url, { headers: { 'User-Agent': 'APhim-Sitemap-Scanner/2.0' } });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.json();
        } catch (err) {
            if (i === retries) return null;
            await new Promise(r => setTimeout(r, 200 * (i + 1)));
        }
    }
    return null;
}

async function processInBatches(items, batchSize, fn) {
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        await Promise.all(batch.map(fn));
        await new Promise(r => setTimeout(r, 30));
    }
}

(async () => {
    console.log(`🚀 Starting high-capacity multi-source sitemap generator for ${DOMAIN}...`);
    const uniqueMoviesMap = new Map();

    const targets = [];

    // 1. PhimAPI Main Lists (phim-moi-cap-nhat up to 200 pages, phim-bo, phim-le, hoat-hinh, tv-shows up to 150 pages)
    const lists = [
        { type: 'phim-moi-cap-nhat', pages: 200 },
        { type: 'phim-bo', pages: 150 },
        { type: 'phim-le', pages: 150 },
        { type: 'hoat-hinh', pages: 150 },
        { type: 'tv-shows', pages: 100 }
    ];

    lists.forEach(l => {
        for (let p = 1; p <= l.pages; p++) {
            targets.push({
                url: `https://phimapi.com/v1/api/danh-sach/${l.type}?page=${p}`,
                extractor: data => data?.data?.items || data?.items || []
            });
        }
    });

    // 2. PhimAPI Categories & Countries
    const categories = [
        'hanh-dong', 'tinh-cam', 'hai-huoc', 'kinh-di', 'phieu-luu',
        'khoa-hoc-vien-tuong', 'tam-ly', 'hinh-su', 'chien-tranh', 'than-thoai',
        'gia-dinh', 'hoat-hinh', 'tai-lieu', 'am-nhac', 'the-thao', 'vo-thuat',
        'co-trang', 'chinh-kich', 'bi-an', 'hoc-duong', 'vo-thuat'
    ];
    categories.forEach(cat => {
        for (let p = 1; p <= 120; p++) {
            targets.push({
                url: `https://phimapi.com/v1/api/the-loai/${cat}?page=${p}`,
                extractor: data => data?.data?.items || []
            });
        }
    });

    const countries = ['viet-nam', 'han-quoc', 'trung-quoc', 'nhat-ban', 'thai-lan', 'au-my', 'hong-kong', 'dai-loan', 'an-do', 'anh', 'phap', 'canada'];
    countries.forEach(c => {
        for (let p = 1; p <= 100; p++) {
            targets.push({
                url: `https://phimapi.com/v1/api/quoc-gia/${c}?page=${p}`,
                extractor: data => data?.data?.items || []
            });
        }
    });

    // 3. NguonC Main List (danh-sach/phim-moi-cap-nhat up to 200 pages)
    for (let p = 1; p <= 200; p++) {
        targets.push({
            url: `https://phim.nguonc.com/api/films/phim-moi-cap-nhat?page=${p}`,
            extractor: data => data?.items || []
        });
    }

    console.log(`📋 Total API targets queued for scanning: ${targets.length}`);
    let completed = 0;
    const startTime = Date.now();

    await processInBatches(targets, 30, async (target) => {
        const data = await fetchJsonWithRetry(target.url);
        if (data) {
            const items = target.extractor(data);
            if (Array.isArray(items)) {
                items.forEach(m => {
                    if (m && m.slug) {
                        if (!uniqueMoviesMap.has(m.slug)) {
                            uniqueMoviesMap.set(m.slug, {
                                slug: m.slug,
                                name: m.name || m.title || '',
                                poster_url: m.poster_url || m.thumb_url || '',
                                thumb_url: m.thumb_url || m.poster_url || '',
                                updated_at: m.modified?.time || m.updated_at || TODAY
                            });
                        } else {
                            const existing = uniqueMoviesMap.get(m.slug);
                            if (!existing.poster_url && m.poster_url) existing.poster_url = m.poster_url;
                            if (!existing.thumb_url && m.thumb_url) existing.thumb_url = m.thumb_url;
                        }
                    }
                });
            }
        }
        completed++;
        if (completed % 500 === 0 || completed === targets.length) {
            const elapsed = Math.round((Date.now() - startTime) / 1000);
            console.log(`⏳ Scanned: ${completed}/${targets.length} endpoints | Unique Movies: ${uniqueMoviesMap.size} | Time: ${elapsed}s`);
        }
    });

    const movies = Array.from(uniqueMoviesMap.values());
    console.log(`\n🎉 SCAN COMPLETE! Total unique movies discovered: ${movies.length}`);

    // --- STATIC PAGES FOR NODE APP ---
    const staticPages = [
        '/',
        '/danh-sach',
        '/categories',
        '/phim-theo-quoc-gia',
        '/filter',
        '/search',
        '/pricing',
        '/support',
        '/gioi-thieu',
        '/chinh-sach-bao-mat',
        '/dieu-khoan-su-dung'
    ];

    categories.forEach(cat => staticPages.push(`/categories?category=${cat}`));
    countries.forEach(c => staticPages.push(`/phim-theo-quoc-gia?country=${c}`));
    ['phim-moi', 'phim-bo', 'phim-le', 'tv-shows', 'hoat-hinh', 'phim-vietsub', 'phim-thuyet-minh', 'phim-chieu-rap'].forEach(l => staticPages.push(`/danh-sach?list=${l}`));

    let xmlUrlEntries = staticPages.map(path => `
    <url>
        <loc>${DOMAIN}${path}</loc>
        <lastmod>${TODAY}</lastmod>
        <changefreq>${path === '/' ? 'daily' : 'weekly'}</changefreq>
        <priority>${path === '/' ? '1.0' : '0.8'}</priority>
    </url>`).join('');

    let imageEntries = [];

    movies.forEach(movie => {
        const slug = movie.slug;
        const name = escapeXml(movie.name);
        const detailUrl = `${DOMAIN}/phim/${slug}`;
        const watchUrl = `${DOMAIN}/xem-phim/${slug}`;

        xmlUrlEntries += `
    <url>
        <loc>${detailUrl}</loc>
        <lastmod>${TODAY}</lastmod>
        <changefreq>daily</changefreq>
        <priority>0.9</priority>
    </url>
    <url>
        <loc>${watchUrl}</loc>
        <lastmod>${TODAY}</lastmod>
        <changefreq>daily</changefreq>
        <priority>0.8</priority>
    </url>`;

        const thumb = getCleanImageUrl(movie.thumb_url);
        const poster = getCleanImageUrl(movie.poster_url);

        let imgs = '';
        if (thumb) {
            imgs += `\n        <image:image><image:loc>${escapeXml(thumb)}</image:loc><image:title>${name}</image:title></image:image>`;
        }
        if (poster && poster !== thumb) {
            imgs += `\n        <image:image><image:loc>${escapeXml(poster)}</image:loc><image:title>${name} - Poster</image:title></image:image>`;
        }

        if (imgs) {
            imageEntries.push(`
    <url>
        <loc>${detailUrl}</loc>${imgs}
    </url>`);
        }
    });

    const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xmlUrlEntries.trim()}
</urlset>`;

    const sitemapImagesXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${imageEntries.join('').trim()}
</urlset>`;

    fs.writeFileSync('sitemap.xml', sitemapXml, 'utf-8');
    fs.writeFileSync('sitemap-images.xml', sitemapImagesXml, 'utf-8');

    console.log(`\n✨ SUCCESS!`);
    console.log(`📄 sitemap.xml: ${staticPages.length + movies.length * 2} URLs (Static: ${staticPages.length}, Detail/Watch: ${movies.length * 2}) | Size: ${Math.round(sitemapXml.length / 1024)} KB`);
    console.log(`🖼️ sitemap-images.xml: ${imageEntries.length} movie image entries | Size: ${Math.round(sitemapImagesXml.length / 1024)} KB`);
})();
