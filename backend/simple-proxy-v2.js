// Simple proxy server v2 - Using Ophim v1 API
const express = require('express');
const cors = require('cors');
const https = require('https');

const app = express();
app.use(cors());

// Proxy function
function proxyOphim(path, res) {
    const options = {
        hostname: 'ophim1.com',
        port: 443,
        path: path,
        method: 'GET',
        headers: {
            'User-Agent': 'Mozilla/5.0',
            'accept': 'application/json'
        },
        rejectUnauthorized: false
    };

    const req = https.request(options, (response) => {
        let data = '';

        response.on('data', (chunk) => {
            data += chunk;
        });

        response.on('end', () => {
            try {
                const jsonData = JSON.parse(data);
                console.log('API Response keys:', Object.keys(jsonData));

                // Handle v1/api/home response
                if (jsonData.status === 'success' && jsonData.data && typeof jsonData.data === 'object') {
                    // Extract movies from all sections
                    let allMovies = [];

                    Object.keys(jsonData.data).forEach(sectionKey => {
                        const section = jsonData.data[sectionKey];
                        if (section && section.items && Array.isArray(section.items)) {
                            console.log(`  Section "${sectionKey}": ${section.items.length} movies`);
                            allMovies = allMovies.concat(section.items);
                        }
                    });

                    console.log(`✅ Total movies: ${allMovies.length}`);

                    return res.json({
                        status: 'success',
                        data: {
                            items: allMovies,
                            params: {
                                pagination: {
                                    currentPage: 1,
                                    totalItems: allMovies.length
                                }
                            }
                        }
                    });
                }

                // Handle regular movie list
                if (jsonData.items && Array.isArray(jsonData.items)) {
                    console.log(`✅ Movie list: ${jsonData.items.length} movies`);
                    return res.json({
                        status: 'success',
                        data: {
                            items: jsonData.items,
                            params: { pagination: jsonData.pagination || {} }
                        }
                    });
                }

                // Handle single movie
                if (jsonData.movie && jsonData.movie.item) {
                    console.log(`✅ Single movie: ${jsonData.movie.item.name}`);
                    return res.json({
                        status: 'success',
                        data: { item: jsonData.movie.item }
                    });
                }

                // Unknown format
                console.log('⚠️  Unknown format, returning as-is');
                res.json(jsonData);

            } catch (error) {
                console.error('❌ Error:', error.message);
                res.status(500).json({ success: false, message: error.message });
            }
        });
    });

    req.on('error', (error) => {
        console.error('❌ Request error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    });

    req.end();
}

// Routes
app.get('/api/movies', (req, res) => {
    const page = req.query.page || 1;
    console.log(`\n📥 GET /api/movies?page=${page}`);

    if (page == 1) {
        console.log('→ Using v1/api/home');
        proxyOphim('/v1/api/home', res);
    } else {
        console.log('→ Using danh-sach/phim-moi-cap-nhat');
        proxyOphim(`/danh-sach/phim-moi-cap-nhat?page=${page}`, res);
    }
});

app.get('/api/movies/:slug', (req, res) => {
    console.log(`\n📥 GET /api/movies/${req.params.slug}`);
    proxyOphim(`/phim/${req.params.slug}`, res);
});

app.get('/api/movies/search', (req, res) => {
    const keyword = req.query.q || '';
    const page = req.query.page || 1;
    console.log(`\n📥 GET /api/movies/search?q=${keyword}`);
    proxyOphim(`/tim-kiem?keyword=${encodeURIComponent(keyword)}&page=${page}`, res);
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Proxy v2 running' });
});

const PORT = 5001;
app.listen(PORT, () => {
    console.log(`\n🔄 Proxy Server v2 running on http://localhost:${PORT}`);
    console.log(`   API: ophim1.com/v1/api/home`);
    console.log(`   Test: http://localhost:${PORT}/health\n`);
});
