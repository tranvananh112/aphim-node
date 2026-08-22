const axios = require('axios');
const fs = require('fs');

(async () => {
    const allMovies = [];
    const totalPages = 400; // Original 400 pages for epic SEO indexing
    const batchSize = 10;   // Original batching
    
    console.log(`Starting dual-engine fetch (Ophim1 + PhimAPI) for ${totalPages} pages...`);
    for (let i = 1; i <= totalPages; i += batchSize) {
        const batch = [];
        for (let j = 0; j < batchSize && (i + j) <= totalPages; j++) {
            batch.push(i + j);
        }
        
        await Promise.all(batch.map(async (page) => {
            // Engine 1: Ophim1
            try {
                const r1 = await axios.get('https://ophim1.com/danh-sach/phim-moi-cap-nhat?page=' + page, { timeout: 15000 });
                if (r1.data && r1.data.data && r1.data.data.items) {
                    allMovies.push(...r1.data.data.items);
                }
            } catch(e) {}

            // Engine 2: PhimAPI
            try {
                const r2 = await axios.get('https://phimapi.com/danh-sach/phim-moi-cap-nhat?page=' + page, { timeout: 15000 });
                const items2 = r2.data && r2.data.items ? r2.data.items : (r2.data && r2.data.data && r2.data.data.items ? r2.data.data.items : []);
                if (items2 && items2.length > 0) {
                    allMovies.push(...items2);
                }
            } catch(e) {}
        }));
        
        console.log(`Batch ${i}..${Math.min(i + batchSize - 1, totalPages)} completed. Total fetched so far: ${allMovies.length}`);
        
        // Original 500ms anti-rate-limit delay
        await new Promise(res => setTimeout(res, 500));
    }

    // Deduplicate by slug & merge details
    const uniqueMoviesMap = new Map();
    allMovies.forEach(m => {
        if (m && m.slug) {
            if (!uniqueMoviesMap.has(m.slug)) {
                uniqueMoviesMap.set(m.slug, { ...m });
            } else {
                const existing = uniqueMoviesMap.get(m.slug);
                if (!existing.poster_url && m.poster_url) existing.poster_url = m.poster_url;
                if (!existing.thumb_url && m.thumb_url) existing.thumb_url = m.thumb_url;
            }
        }
    });
    const uniqueMovies = Array.from(uniqueMoviesMap.values());

    console.log(`Found ${uniqueMovies.length} unique movies from dual engines. Generating XML...`);

    let urlEntries = uniqueMovies.map(function(movie) {
        const slug = movie.slug || '';
        const name = (movie.name || '')
            .replace(/&/g,'&amp;')
            .replace(/</g,'&lt;')
            .replace(/>/g,'&gt;')
            .replace(/"/g,'&quot;');
        const pageUrl = 'https://aphim.top/phim/' + slug;
        const thumb = movie.thumb_url
            ? (movie.thumb_url.startsWith('http') ? movie.thumb_url : 'https://img.ophimimg.com/' + (movie.thumb_url.startsWith('uploads/') ? '' : 'uploads/movies/') + movie.thumb_url)
            : '';
        const poster = movie.poster_url
            ? (movie.poster_url.startsWith('http') ? movie.poster_url : 'https://img.ophimimg.com/' + (movie.poster_url.startsWith('uploads/') ? '' : 'uploads/movies/') + movie.poster_url)
            : '';
        
        let imgs = '';
        if (thumb) {
            imgs += '\n        <image:image><image:loc>' + thumb + '</image:loc><image:title>' + name + '</image:title></image:image>';
        }
        if (poster && poster !== thumb) {
            imgs += '\n        <image:image><image:loc>' + poster + '</image:loc><image:title>' + name + ' - Poster</image:title></image:image>';
        }
        if (!imgs) return '';
        return '\n    <url>\n        <loc>' + pageUrl + '</loc>' + imgs + '\n    </url>';
    }).filter(Boolean).join('');

    // Fallback protection: Never produce empty urlset
    if (!urlEntries || urlEntries.trim().length === 0) {
        urlEntries = '\n    <url>\n        <loc>https://aphim.top/</loc>\n        <image:image><image:loc>https://aphim.top/android-chrome-512x512.png</image:loc><image:title>APhim Logo</image:title></image:image>\n    </url>';
    }

    const xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
        + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n'
        + '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">'
        + urlEntries
        + '\n</urlset>';
    
    fs.writeFileSync('sitemap-images.xml', xml, 'utf-8');
    console.log('Done! Total: ' + uniqueMovies.length + ' unique movies, file size: ' + Math.round(xml.length/1024) + ' KB');
})();
