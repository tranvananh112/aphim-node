const axios = require('axios');
const fs = require('fs');
const path = require('path');

const DOMAIN = 'https://aphim.top';
const MAX_URLS_PER_SITEMAP = 10000; // An toàn dưới 50,000

(async () => {
    // 1. URL Tĩnh (Static Pages)
    const staticPages = [
        '', 'danh-sach', 'categories', 'search', 'pricing', 'support', 
        'filter', 'hanh-dong', 'linh-mieu', 'phim-theo-quoc-gia', 
        'phim-x', 'partner', 'payment', 'login', 'profile'
    ];
    
    const today = new Date().toISOString().split('T')[0];
    
    // Khởi tạo các mảng chứa dữ liệu
    const allMovies = [];
    const totalPages = 1500; // Quét 1500 trang (~36,000 phim)
    const batchSize = 15;
    
    console.log(`Bắt đầu lấy dữ liệu ${totalPages} trang API...`);
    for (let i = 1; i <= totalPages; i += batchSize) {
        const batch = [];
        for (let j = 0; j < batchSize && (i + j) <= totalPages; j++) {
            batch.push(i + j);
        }
        
        await Promise.all(batch.map(async (page) => {
            try {
                const r = await axios.get(`https://phimapi.com/danh-sach/phim-moi-cap-nhat?page=${page}`, { timeout: 15000 });
                if (r.data && r.data.data && r.data.data.items) {
                    allMovies.push(...r.data.data.items);
                }
            } catch(e) { /* ignore single page error */ }
        }));
        
        if (i % 150 === 1) {
            console.log(`Đã lấy dữ liệu đến trang ${i + batchSize - 1}...`);
        }
        
        await new Promise(res => setTimeout(res, 200));
    }

    const uniqueMoviesMap = new Map();
    allMovies.forEach(m => {
        if (m.slug) uniqueMoviesMap.set(m.slug, m);
    });

    const uniqueMovies = Array.from(uniqueMoviesMap.values());
    console.log(`Đã tìm thấy ${uniqueMovies.length} bộ phim độc nhất. Đang tạo Sitemap Index...`);

    // Lưu danh sách file sitemap con đã tạo
    const generatedSitemaps = [];

    // Hàm tiện ích tạo sitemap XML header/footer
    const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n';
    const xmlFooter = '</urlset>';

    // --- SITEMAP PAGES (URL TĨNH) ---
    let pagesXml = xmlHeader;
    staticPages.forEach(p => {
        pagesXml += `  <url>\n    <loc>${DOMAIN}/${p}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>${p === '' ? '1.0' : '0.8'}</priority>\n  </url>\n`;
    });
    pagesXml += xmlFooter;
    fs.writeFileSync('sitemap_pages.xml', pagesXml, 'utf8');
    generatedSitemaps.push('sitemap_pages.xml');

    // --- SITEMAP CHUNKED (PHIM + HÌNH ẢNH + TRANG XEM PHIM) ---
    let currentChunkIndex = 1;
    let currentXml = xmlHeader;
    let currentUrlCount = 0;

    const saveCurrentChunk = () => {
        currentXml += xmlFooter;
        const fileName = `sitemap_movies_${currentChunkIndex}.xml`;
        fs.writeFileSync(fileName, currentXml, 'utf8');
        generatedSitemaps.push(fileName);
        
        currentChunkIndex++;
        currentXml = xmlHeader;
        currentUrlCount = 0;
    };

    uniqueMovies.forEach(m => {
        let modDate = today;
        if (m.modified && typeof m.modified === 'string') {
            modDate = m.modified.split('T')[0];
        }
        
        const detailUrl = `${DOMAIN}/phim/${m.slug}`;
        // Nếu không có thông tin tập, mặc định lấy tap-1
        let firstEpisode = m.episode_current || 'tap-1';
        if(firstEpisode.toLowerCase() === 'full' || firstEpisode === '1') {
            firstEpisode = 'tap-1';
        } else if(!firstEpisode.startsWith('tap-')) {
            firstEpisode = `tap-${firstEpisode.replace(/[^0-9a-zA-Z-]/g, '')}`; // Dọn dẹp ký tự thừa
        }
        const watchUrl = `${DOMAIN}/xem-phim/${m.slug}/${firstEpisode}`;
        
        // 1. URL Trang Chi Tiết (có đính kèm ảnh để ăn SEO Image)
        currentXml += `  <url>\n    <loc>${detailUrl}</loc>\n    <lastmod>${modDate}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n`;
        if (m.thumb_url) {
            currentXml += `    <image:image>\n      <image:loc>https://phimimg.com/${m.thumb_url}</image:loc>\n      <image:title><![CDATA[${m.name}]]></image:title>\n    </image:image>\n`;
        }
        if (m.poster_url) {
            currentXml += `    <image:image>\n      <image:loc>https://phimimg.com/${m.poster_url}</image:loc>\n      <image:title><![CDATA[${m.name} - Poster]]></image:title>\n    </image:image>\n`;
        }
        currentXml += `  </url>\n`;
        currentUrlCount++;

        // Nếu file sitemap con đã đầy, lưu lại và tạo file mới
        if (currentUrlCount >= MAX_URLS_PER_SITEMAP) saveCurrentChunk();

        // 2. URL Trang Xem Phim
        currentXml += `  <url>\n    <loc>${watchUrl}</loc>\n    <lastmod>${modDate}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.9</priority>\n  </url>\n`;
        currentUrlCount++;

        if (currentUrlCount >= MAX_URLS_PER_SITEMAP) saveCurrentChunk();
    });

    // Lưu chunk cuối cùng nếu còn sót
    if (currentUrlCount > 0) {
        saveCurrentChunk();
    }
    
    // --- TẠO SITEMAP INDEX ---
    let indexXml = '<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    generatedSitemaps.forEach(file => {
        indexXml += `  <sitemap>\n    <loc>${DOMAIN}/${file}</loc>\n    <lastmod>${today}</lastmod>\n  </sitemap>\n`;
    });
    indexXml += '</sitemapindex>';
    fs.writeFileSync('sitemap.xml', indexXml, 'utf8'); // sitemap.xml giờ là file Index
    
    console.log(`Thành công! Đã chia thành ${generatedSitemaps.length} file sitemap con.`);
    
    // Xóa file sitemap-images.xml cũ nếu có để tránh rác git
    if (fs.existsSync('sitemap-images.xml')) {
        fs.unlinkSync('sitemap-images.xml');
        console.log('Đã xóa file sitemap-images.xml cũ (do đã gộp chung vào chuẩn mới).');
    }

    // --- PING GOOGLE SEARCH CONSOLE ---
    console.log('Đang gửi tín hiệu Ping tới Google...');
    try {
        await axios.get(`http://www.google.com/ping?sitemap=${DOMAIN}/sitemap.xml`, { timeout: 10000 });
        console.log('✅ Ping Google thành công!');
    } catch (err) {
        console.log('⚠️ Ping Google thất bại (có thể bị chặn tạm thời, không sao cả):', err.message);
    }
})();
