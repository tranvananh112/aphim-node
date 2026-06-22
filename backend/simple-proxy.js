// Simple proxy server to bypass CORS
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
                console.log('Received from Ophim:', Object.keys(jsonData));

                // For movie detail endpoint
                if (jsonData.status === 'success' && jsonData.data && jsonData.data.item) {
                    console.log('Movie detail:', jsonData.data.item.name);
                    res.json({
                        status: 'success',
                        data: {
                            item: jsonData.data.item
                        }
                    });
                    return;
                }

                // For v1 API home endpoint
                if (jsonData.status === true && jsonData.data) {
                    // Check if it's the home API response (array of sections)
                    if (Array.isArray(jsonData.data)) {
                        console.log('Home API response with', jsonData.data.length, 'sections');

                        // Extract all movies from all sections
                        let allMovies = [];
                        jsonData.data.forEach(section => {
                            if (section.items && Array.isArray(section.items)) {
                                allMovies = allMovies.concat(section.items);
                            }
                        });

                        console.log('Total movies extracted:', allMovies.length);

                        res.json({
                            status: 'success',
                            data: {
                                items: allMovies,
                                params: {
                                    pagination: {
                                        currentPage: 1,
                                        totalItems: allMovies.length,
                                        totalItemsPerPage: allMovies.length,
                                        totalPages: 1
                                    }
                                },
                                sections: jsonData.data // Keep original sections
                            }
                        });
                        return;
                    }
                    // Regular movie list
                    else if (jsonData.items && Array.isArray(jsonData.items)) {
                        console.log('Movie list, items:', jsonData.items.length);
                        res.json({
                            status: 'success',
                            data: {
                                items: jsonData.items,
                                params: {
                                    pagination: jsonData.pagination || {}
                                }
                            }
                        });
                        return;
                    }
                    // Single movie (old format)
                    else if (jsonData.movie && jsonData.movie.item) {
                        console.log('Single movie (old format):', jsonData.movie.item.name);
                        res.json({
                            status: 'success',
                            data: {
                                item: jsonData.movie.item
                            }
                        });
                        return;
                    }
                }

                // Unknown format, return as-is
                console.log('Unknown format, returning as-is');
                res.json(jsonData);

            } catch (error) {
                console.error('JSON parse error:', error.message);
                res.status(500).json({ success: false, message: 'Invalid JSON response' });
            }
        });
    });

    req.on('error', (error) => {
        console.error('Proxy error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    });

    req.end();
}

// Routes
app.get('/api/movies', (req, res) => {
    const page = req.query.page || 1;
    console.log(`\n📥 Request: GET /api/movies?page=${page}`);

    // Use v1 home API for first page
    if (page == 1) {
        console.log('Using v1/api/home for homepage');
        proxyOphim('/v1/api/home', res);
    } else {
        proxyOphim(`/danh-sach/phim-moi-cap-nhat?page=${page}`, res);
    }
});

app.get('/api/movies/:slug', (req, res) => {
    console.log(`\n📥 Request: GET /api/movies/${req.params.slug}`);
    proxyOphim(`/phim/${req.params.slug}`, res);
});

app.get('/api/movies/search', (req, res) => {
    const keyword = req.query.q || '';
    const page = req.query.page || 1;
    console.log(`\n📥 Request: GET /api/movies/search?q=${keyword}&page=${page}`);
    proxyOphim(`/tim-kiem?keyword=${encodeURIComponent(keyword)}&page=${page}`, res);
});

app.get('/api/movies/vietnam', (req, res) => {
    const page = req.query.page || 1;
    console.log(`\n📥 Request: GET /api/movies/vietnam?page=${page}`);
    proxyOphim(`/v1/api/quoc-gia/viet-nam?page=${page}`, res);
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Simple proxy is running' });
});

const PORT = 5001;
app.listen(PORT, () => {
    console.log(`\n🔄 Simple Proxy Server running on http://localhost:${PORT}`);
    console.log(`   Proxying requests to ophim1.com`);
    console.log(`   Using v1/api/home for homepage`);
    console.log(`   Test: http://localhost:${PORT}/health\n`);
});
