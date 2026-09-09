/**
 * High-Capacity Multi-Source Sitemap Generator for APhim (Node Version)
 * Scans all available endpoints across PhimAPI, NguonC, and categories to discover maximum unique movies for TODAY.
 */

const fs = require('fs');

const DOMAINS = ['https://aphim.top', 'https://aphim.io.vn', 'https://aphim1.io.vn'];
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
            await new Promise(r => setTimeout(r, 150 * (i + 1)));
        }
    }
    return null;
}

async function processInBatches(items, batchSize, fn) {
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        await Promise.allSettled(batch.map(item => fn(item).catch(() => {})));
        await new Promise(r => setTimeout(r, 30));
    }
}

(async () => {
    console.log(`🚀 Starting high-capacity sitemap generator for TODAY (${TODAY}) across ${DOMAINS.join(' & ')}...`);
    const uniqueMoviesMap = new Map();

    const targets = [];

    // 1. PhimAPI Main Lists
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
        'co-trang', 'chinh-kich', 'bi-an', 'hoc-duong'
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

    // 3. NguonC Main List
    for (let p = 1; p <= 200; p++) {
        targets.push({
            url: `https://phim.nguonc.com/api/films/phim-moi-cap-nhat?page=${p}`,
            extractor: data => data?.items || []
        });
    }

    console.log(`📋 Total API targets queued for scanning: ${targets.length}`);
    let completed = 0;
    const startTime = Date.now();

    await processInBatches(targets, 20, async (target) => {
        try {
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
        } catch (e) {}
        completed++;
        if (completed % 500 === 0 || completed === targets.length) {
            const elapsed = Math.round((Date.now() - startTime) / 1000);
            console.log(`⏳ Scanned: ${completed}/${targets.length} endpoints | Unique Movies: ${uniqueMoviesMap.size} | Time: ${elapsed}s`);
        }
    });

    const movies = Array.from(uniqueMoviesMap.values());
    console.log(`\n🎉 SCAN COMPLETE FOR TODAY (${TODAY})! Total unique movies discovered: ${movies.length}`);

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

    // Primary domain (https://aphim.top) writes to sitemap.xml & sitemap-images.xml
    // Secondary domains write to domain-specific files
    DOMAINS.forEach(domain => {
        let sitemapFilename = 'sitemap.xml';
        let imagesFilename = 'sitemap-images.xml';

        if (domain.includes('aphim.io.vn')) {
            sitemapFilename = 'sitemap_aphim.xml';
            imagesFilename = 'sitemap-images_aphim.xml';
        } else if (domain.includes('aphim1.io.vn')) {
            sitemapFilename = 'sitemap_aphim1.xml';
            imagesFilename = 'sitemap-images_aphim1.xml';
        }

        const sitemapStream = fs.createWriteStream(sitemapFilename, { encoding: 'utf-8' });
        sitemapStream.write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n');

        staticPages.forEach(path => {
            sitemapStream.write(`    <url>\n        <loc>${domain}${path}</loc>\n        <lastmod>${TODAY}</lastmod>\n        <changefreq>${path === '/' ? 'daily' : 'weekly'}</changefreq>\n        <priority>${path === '/' ? '1.0' : '0.8'}</priority>\n    </url>\n`);
        });

        const imagesStream = fs.createWriteStream(imagesFilename, { encoding: 'utf-8' });
        imagesStream.write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n');

        let imageCount = 0;

        movies.forEach(movie => {
            const slug = movie.slug;
            const name = escapeXml(movie.name);
            const detailUrl = `${domain}/phim/${slug}`;
            const watchUrl = `${domain}/xem-phim/${slug}`;

            sitemapStream.write(`    <url>\n        <loc>${detailUrl}</loc>\n        <lastmod>${TODAY}</lastmod>\n        <changefreq>daily</changefreq>\n        <priority>0.9</priority>\n    </url>\n    <url>\n        <loc>${watchUrl}</loc>\n        <lastmod>${TODAY}</lastmod>\n        <changefreq>daily</changefreq>\n        <priority>0.8</priority>\n    </url>\n`);

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
                imageCount++;
                imagesStream.write(`    <url>\n        <loc>${detailUrl}</loc>${imgs}\n    </url>\n`);
            }
        });

        sitemapStream.write('</urlset>');
        sitemapStream.end();

        imagesStream.write('</urlset>');
        imagesStream.end();

        console.log(`📄 Generated ${sitemapFilename} & ${imagesFilename} for ${domain} (${movies.length * 2} URLs, ${imageCount} images)`);
    });

    console.log(`\n✨ ALL SITEMAPS FOR TODAY (${TODAY}) GENERATED SUCCESSFULLY!`);
})().catch(err => console.error('Fatal Error generating sitemap:', err));
