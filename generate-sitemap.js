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
    
    let imgXml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n';
    
    staticPages.forEach(p => {
        xml += `  <url>\n    <loc>https://aphim.top/${p}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>${p === '' ? '1.0' : '0.8'}</priority>\n  </url>\n`;
    });
    
    const allMovies = [];
    const totalPages = 1500; // Quét 1500 trang (~36,000 phim - toàn bộ dữ liệu)
    const batchSize = 15;
    
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
        
        if (i % 150 === 1) {
            console.log(`Fetched up to page ${i + batchSize - 1}...`);
        }
        
        await new Promise(res => setTimeout(res, 200));
    }

    const uniqueMoviesMap = new Map();
    allMovies.forEach(m => {
        if (m.slug) uniqueMoviesMap.set(m.slug, m);
    });
    const uniqueMovies = Array.from(uniqueMoviesMap.values());

    console.log(`Found ${uniqueMovies.length} unique movies. Generating sitemaps...`);

    uniqueMovies.forEach(m => {
        let modDate = today;
        if (m.modified && typeof m.modified === 'string') {
            modDate = m.modified.split('T')[0];
        }
        const url = `https://aphim.top/phim/${m.slug}`;
        
        // Sitemap thường
        xml += `  <url>\n    <loc>${url}</loc>\n    <lastmod>${modDate}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
        
        // Sitemap hình ảnh
        imgXml += `  <url>\n    <loc>${url}</loc>\n`;
        if (m.thumb_url) {
            imgXml += `    <image:image>\n      <image:loc>https://img.ophim.live/uploads/movies/${m.thumb_url}</image:loc>\n      <image:title><![CDATA[${m.name}]]></image:title>\n    </image:image>\n`;
        }
        if (m.poster_url) {
            imgXml += `    <image:image>\n      <image:loc>https://img.ophim.live/uploads/movies/${m.poster_url}</image:loc>\n      <image:title><![CDATA[${m.name} - Poster]]></image:title>\n    </image:image>\n`;
        }
        imgXml += `  </url>\n`;
    });
    
    xml += '</urlset>';
    imgXml += '</urlset>';
    
    fs.writeFileSync('sitemap.xml', xml, 'utf8');
    fs.writeFileSync('sitemap-images.xml', imgXml, 'utf8');
    
    console.log(`Done! Total URLs: ${staticPages.length + uniqueMovies.length}.`);
    console.log(`sitemap.xml size: ${Math.round(xml.length / 1024)} KB`);
    console.log(`sitemap-images.xml size: ${Math.round(imgXml.length / 1024)} KB`);
})();
