const express = require('express');
const router = express.Router();
const axios = require('axios');

// Eporner API Proxy
router.get('/eporner/search', async (req, res) => {
    try {
        const { query = 'hot', page = 1, per_page = 30 } = req.query;

        console.log(`🔄 Proxy: Fetching Eporner - Query: ${query}, Page: ${page}`);

        const response = await axios.get('https://www.eporner.com/api/v2/video/search/', {
            params: {
                query,
                per_page,
                page,
                thumbsize: 'big',
                order: 'top-weekly',
                gay: 0,
                lq: 1,
                format: 'json'
            },
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        console.log(`✅ Proxy: Eporner success - ${response.data.videos?.length || 0} videos`);
        res.json(response.data);

    } catch (error) {
        console.error('❌ Proxy Error (Eporner):', error.message);
        res.status(500).json({
            error: 'Proxy fetch failed',
            message: error.message
        });
    }
});

// RapidAPI Pornhub Proxy
router.get('/pornhub/search', async (req, res) => {
    try {
        const { query = 'hot', page = 1 } = req.query;

        console.log(`🔄 Proxy: Fetching Pornhub - Query: ${query}, Page: ${page}`);

        const response = await axios.get('https://pornhub-api3.p.rapidapi.com/search', {
            params: { query, page },
            headers: {
                'X-RapidAPI-Key': process.env.RAPIDAPI_KEY || 'YOUR_RAPIDAPI_KEY',
                'X-RapidAPI-Host': 'pornhub-api3.p.rapidapi.com'
            },
            timeout: 10000
        });

        console.log(`✅ Proxy: Pornhub success - ${response.data.videos?.length || 0} videos`);
        res.json(response.data);

    } catch (error) {
        console.error('❌ Proxy Error (Pornhub):', error.message);
        res.status(500).json({
            error: 'Proxy fetch failed',
            message: error.message
        });
    }
});

// Video embed proxy (for iframe src)
router.get('/video/:videoId', async (req, res) => {
    try {
        const { videoId } = req.params;
        const { source = 'eporner' } = req.query;

        let embedUrl;
        if (source === 'eporner') {
            embedUrl = `https://www.eporner.com/embed/${videoId}`;
        } else {
            embedUrl = `https://www.pornhub.com/embed/${videoId}`;
        }

        console.log(`🎬 Proxy: Streaming video ${videoId} from ${source}`);

        const response = await axios.get(embedUrl, {
            responseType: 'stream',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        // Forward headers
        res.set(response.headers);
        response.data.pipe(res);

    } catch (error) {
        console.error('❌ Video Proxy Error:', error.message);
        res.status(500).send('Video proxy failed');
    }
});

module.exports = router;
