const express = require('express');
const router = express.Router();
const https = require('https');
const http = require('http');

// ============================================================
// GET /api/px-source?url=<pornhub_watch_url_or_embed_url>
// Extract direct video source from a PornHub embed page
// Returns: { mp4: '...', hd: '...', quality: 'HD' } or { error: '...' }
// ============================================================
router.get('/', async (req, res) => {
    const { url, viewkey } = req.query;

    let targetUrl = '';

    if (viewkey) {
        targetUrl = `https://www.pornhub.com/embed/${viewkey}`;
    } else if (url) {
        // Convert watch URL to embed URL if needed
        if (url.includes('/embed/')) {
            targetUrl = url;
        } else {
            const vk = url.match(/[?&]viewkey=([^&]+)/i);
            if (vk) {
                targetUrl = `https://www.pornhub.com/embed/${vk[1]}`;
            } else {
                return res.json({ error: 'Cannot parse viewkey from URL' });
            }
        }
    } else {
        return res.status(400).json({ error: 'Missing url or viewkey parameter' });
    }

    try {
        const html = await fetchPage(targetUrl);
        const sources = extractVideoSources(html);

        if (sources.length === 0) {
            return res.json({ error: 'No video sources found', embed: targetUrl });
        }

        // Pick best quality
        const hd = sources.find(s => s.quality === '720' || s.quality === '1080') || null;
        const sd = sources.find(s => s.quality === '480' || s.quality === '360') || null;
        const best = hd || sd || sources[0];

        res.json({
            success: true,
            sources,
            best: best.url,
            quality: best.quality + 'p',
            embed: targetUrl
        });

    } catch (e) {
        console.error('[px-source] Error:', e.message);
        res.json({ error: e.message, embed: targetUrl });
    }
});

// -------------------------------------------------------
// Fetch a URL and return HTML string
// -------------------------------------------------------
function fetchPage(url) {
    return new Promise((resolve, reject) => {
        const lib = url.startsWith('https') ? https : http;
        const opts = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://www.pornhub.com/',
                'Cookie': 'age_verified=1; platform=pc'
            },
            timeout: 12000
        };

        lib.get(url, opts, (response) => {
            // Follow redirects
            if ([301, 302, 303, 307, 308].includes(response.statusCode) && response.headers.location) {
                return fetchPage(response.headers.location).then(resolve).catch(reject);
            }

            let data = '';
            response.on('data', chunk => data += chunk);
            response.on('end', () => resolve(data));
            response.on('error', reject);
        }).on('error', reject).on('timeout', () => reject(new Error('Request timeout')));
    });
}

// -------------------------------------------------------
// Extract video source URLs from PornHub embed page HTML
// -------------------------------------------------------
function extractVideoSources(html) {
    const sources = [];

    // Method 1: Parse flashvars / mediaDefinitions JSON
    // PornHub embeds video data in a JS var like:
    // var flashvars_... = { "mediaDefinitions": [...] }
    const mediaDefMatch = html.match(/"mediaDefinitions"\s*:\s*(\[.*?\])/s);
    if (mediaDefMatch) {
        try {
            const mediaDefs = JSON.parse(mediaDefMatch[1]);
            for (const def of mediaDefs) {
                if (def.videoUrl && (
                    def.videoUrl.includes('.mp4') ||
                    def.videoUrl.includes('.m3u8')
                )) {
                    sources.push({
                        url: def.videoUrl,
                        quality: String(def.quality || def.defaultQuality || '480'),
                        format: def.format || (def.videoUrl.includes('.m3u8') ? 'hls' : 'mp4')
                    });
                }
            }
        } catch (e) {}
    }

    // Method 2: Look for direct mp4 URL patterns
    if (sources.length === 0) {
        const mp4Matches = html.matchAll(/"videoUrl"\s*:\s*"([^"]+\.mp4[^"]*)"/g);
        for (const m of mp4Matches) {
            const decoded = m[1].replace(/\\u002F/g, '/').replace(/\\\//g, '/');
            const qualMatch = decoded.match(/(\d{3,4})P?\./i);
            sources.push({
                url: decoded,
                quality: qualMatch ? qualMatch[1] : '480',
                format: 'mp4'
            });
        }
    }

    // Method 3: Look for CDN mp4 URL patterns (xnxx style)
    if (sources.length === 0) {
        const cdnMatches = html.matchAll(/https?:[^"'\\s]+\.(mp4|m3u8)[^"'\\s]*/g);
        for (const m of cdnMatches) {
            const url = m[0];
            if (!sources.find(s => s.url === url)) {
                sources.push({ url, quality: '480', format: m[1] });
            }
        }
    }

    // Deduplicate and sort by quality descending
    const unique = sources.filter((s, i, arr) =>
        arr.findIndex(x => x.url === s.url) === i
    );
    unique.sort((a, b) => parseInt(b.quality) - parseInt(a.quality));

    return unique;
}

module.exports = router;
