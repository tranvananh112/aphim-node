const axios = require('axios');
const fs = require('fs');

(async () => {
    const staticPages = [
        '', 'danh-sach', 'categories', 'search', 'pricing', 'support', 
        'filter', 'hanh-dong', 'linh-mieu', 'phim-theo-quoc-gia', 
        'phim-x', 'partner', 'payment', 'login', 'profile'
    ];
    
    const today = new Date().toISOString().split('T')[0];
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    
    staticPages.forEach(p => {
        xml += `  <url>\n    <loc>https://aphim.top/${p}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>${p === '' ? '1.0' : '0.8'}</priority>\n  </url>\n`;
    });
    
    const allMovies = [];
    const totalPages = 400; // Quét 400 trang (~9,600 phim hot)
    const batchSize = 10;
    
    console.log(`Starting to fetch ${totalPages} pages of movies...`);
    for (let i = 1; i <= totalPages; i += batchSize) {
        const batch = [];
        for (let j = 0; j < batchSize && (i + j) <= totalPages; j++) {
            batch.push(i + j);
        }
        
        await Promise.all(batch.map(async (page) => {
            try {
                const r = await axios.get(`https://ophim1.com/v1/api/danh-sach/phim-moi-cap-nhat?page=${page}`, { timeout: 15000 });
                if (r.data && r.data.data && r.data.data.items) {
                    allMovies.push(...r.data.data.items);
                }
            } catch(e) { /* ignore single page error */ }
        }));
        
        await new Promise(res => setTimeout(res, 300));
    }

    const uniqueMoviesMap = new Map();
    allMovies.forEach(m => {
        if (m.slug) uniqueMoviesMap.set(m.slug, m);
    });
    const uniqueMovies = Array.from(uniqueMoviesMap.values());

    console.log(`Found ${uniqueMovies.length} unique movies. Generating sitemap entries...`);

    uniqueMovies.forEach(m => {
        let modDate = today;
        if (m.modified && typeof m.modified === 'string') {
            modDate = m.modified.split('T')[0];
        }
        xml += `  <url>\n    <loc>https://aphim.top/phim/${m.slug}</loc>\n    <lastmod>${modDate}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
    });
    
    xml += '</urlset>';
    fs.writeFileSync('sitemap.xml', xml, 'utf8');
    console.log(`Done! Total URLs: ${staticPages.length + uniqueMovies.length}. File size: ${Math.round(xml.length / 1024)} KB`);
})();
