const axios = require('axios');

// API Configuration
const EPORNER_API = 'https://www.eporner.com/api/v2/video/search/';
const REDTUBE_API = 'https://api.redtube.com/';
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || 'bb67265324msh4c5898bf6efc534p155049jsn16e88ce02321';
const RAPIDAPI_HOST = 'pornhub-api1.p.rapidapi.com';

// Helper: Create axios instance with spoofed headers
const createAxiosInstance = (referer = 'https://www.eporner.com/') => {
    return axios.create({
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Referer': referer,
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.9',
        },
        timeout: 30000
    });
};

// 1. Search videos (Eporner primary, RedTube fallback)
exports.searchVideos = async (req, res) => {
    try {
        const { query = 'all', page = 1 } = req.query;
        const perPage = 30;

        // Try Eporner first
        try {
            const epornerResponse = await axios.get(EPORNER_API, {
                params: {
                    query: query,
                    per_page: perPage,
                    page: page,
                    thumbsize: 'big',
                    order: 'top-weekly',
                    gay: 0,
                    lq: 1,
                    format: 'json'
                },
                timeout: 15000
            });

            console.log('Eporner response:', epornerResponse.data);

            if (epornerResponse.data && epornerResponse.data.videos && epornerResponse.data.videos.length > 0) {
                return res.json({
                    success: true,
                    source: 'eporner',
                    total: epornerResponse.data.total_count || 0,
                    count: epornerResponse.data.count || 0,
                    page: parseInt(page),
                    total_pages: epornerResponse.data.total_pages || 0,
                    videos: epornerResponse.data.videos.map(v => ({
                        id: v.id,
                        title: v.title,
                        duration: v.length_min || 'N/A',
                        views: v.views ? v.views.toLocaleString() : 'N/A',
                        rating: v.rate || 'N/A',
                        thumb: v.default_thumb?.src || (v.thumbs && v.thumbs[0] ? v.thumbs[0].src : null),
                        embed: v.embed,
                        url: v.url,
                        added: v.added,
                        keywords: v.keywords
                    }))
                });
            }
        } catch (epornerError) {
            console.log('Eporner failed, trying RedTube...', epornerError.message);
        }

        // Fallback to RedTube
        const redtubeResponse = await axios.get(REDTUBE_API, {
            params: {
                data: 'redtube.Videos.searchVideos',
                output: 'json',
                search: query,
                page: page
            },
            timeout: 10000
        });

        if (redtubeResponse.data && redtubeResponse.data.videos) {
            return res.json({
                success: true,
                source: 'redtube',
                total: redtubeResponse.data.count || 0,
                page: parseInt(page),
                videos: redtubeResponse.data.videos.map(v => ({
                    id: v.video_id || v.video.video_id,
                    title: v.title || v.video.title,
                    duration: v.duration || v.video.duration,
                    views: v.views || v.video.views,
                    rating: v.rating || v.video.rating,
                    thumb: v.thumb || v.video.thumb,
                    embed: v.embed || v.video.embed_url || `https://embed.redtube.com/?id=${v.video_id}`,
                    url: v.url || v.video.url,
                    added: v.publish_date || v.video.publish_date
                }))
            });
        }

        throw new Error('Both APIs failed');

    } catch (error) {
        console.error('Search videos error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// 2. Extract video source (MP4 URL from embed page)
exports.getVideoSource = async (req, res) => {
    try {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({ error: 'URL parameter required' });
        }

        const axiosInstance = createAxiosInstance(url);
        const response = await axiosInstance.get(url);
        const html = response.data;

        // Regex patterns to extract video URLs
        const patterns = [
            /"file"\s*:\s*"([^"]+\.(mp4|webm)[^"]*)"/i,
            /"videoUrl"\s*:\s*"([^"]+)"/i,
            /"src"\s*:\s*"([^"]+\.mp4[^"]*)"/i,
            /src:\s*['"]([^'"]+\.mp4[^'"]*)['"]/i,
            /file:\s*['"]([^'"]+\.mp4[^'"]*)['"]/i
        ];

        for (const pattern of patterns) {
            const match = html.match(pattern);
            if (match && match[1]) {
                const videoUrl = match[1].replace(/\\"/g, '"').replace(/\\\//g, '/');
                return res.json({
                    success: true,
                    videoUrl: videoUrl,
                    embedUrl: url
                });
            }
        }

        res.status(404).json({
            success: false,
            error: 'Video source not found in page'
        });

    } catch (error) {
        console.error('Get video source error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// 3. Proxy video stream (bypass restrictions)
exports.proxyVideoStream = async (req, res) => {
    try {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({ error: 'URL parameter required' });
        }

        const axiosInstance = createAxiosInstance();

        // Forward Range header for seeking support
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Referer': 'https://www.eporner.com/',
        };

        if (req.headers.range) {
            headers['Range'] = req.headers.range;
        }

        const response = await axiosInstance.get(url, {
            responseType: 'stream',
            headers: headers
        });

        // Forward response headers
        res.set({
            'Content-Type': response.headers['content-type'] || 'video/mp4',
            'Content-Length': response.headers['content-length'],
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'public, max-age=3600'
        });

        if (response.headers['content-range']) {
            res.status(206);
            res.set('Content-Range', response.headers['content-range']);
        }

        response.data.pipe(res);

    } catch (error) {
        console.error('Proxy video stream error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// 4. Proxy embed page (remove frame-busting scripts)
exports.proxyEmbed = async (req, res) => {
    try {
        const { url } = req.query;

        if (!url) {
            return res.status(400).send('URL parameter required');
        }

        const axiosInstance = createAxiosInstance(url);
        const response = await axiosInstance.get(url);
        let html = response.data;

        // Remove frame-busting scripts
        html = html.replace(/if\s*\(\s*top\s*!=\s*self\s*\).*?;/gi, '');
        html = html.replace(/if\s*\(\s*window\.top\s*!==\s*window\.self\s*\).*?}/gi, '');
        html = html.replace(/top\.location\s*=\s*self\.location/gi, '');
        html = html.replace(/top\.location\s*=\s*location/gi, '');

        // Add base tag for relative URLs
        const baseUrl = new URL(url).origin;
        html = html.replace(/<head>/i, `<head><base href="${baseUrl}/">`);

        res.set('Content-Type', 'text/html');
        res.send(html);

    } catch (error) {
        console.error('Proxy embed error:', error.message);
        res.status(500).send(`Error: ${error.message}`);
    }
};

// 5. Proxy image (thumbnail)
exports.proxyImage = async (req, res) => {
    try {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({ error: 'URL parameter required' });
        }

        const axiosInstance = createAxiosInstance();
        const response = await axiosInstance.get(url, {
            responseType: 'stream'
        });

        res.set({
            'Content-Type': response.headers['content-type'] || 'image/jpeg',
            'Cache-Control': 'public, max-age=86400'
        });

        response.data.pipe(res);

    } catch (error) {
        console.error('Proxy image error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// 6. Pornhub API proxy (RapidAPI)
exports.pornhubProxy = async (req, res) => {
    try {
        const path = req.params.path || '';
        const method = req.method.toLowerCase();

        const options = {
            method: method,
            url: `https://${RAPIDAPI_HOST}/${path}`,
            headers: {
                'x-rapidapi-key': RAPIDAPI_KEY,
                'x-rapidapi-host': RAPIDAPI_HOST,
                'Content-Type': 'application/json'
            }
        };

        if (method === 'post' || method === 'put') {
            options.data = req.body;
        } else {
            options.params = req.query;
        }

        const response = await axios(options);
        res.json(response.data);

    } catch (error) {
        console.error('Pornhub proxy error:', error.message);
        res.status(error.response?.status || 500).json({
            success: false,
            error: error.message,
            details: error.response?.data
        });
    }
};
