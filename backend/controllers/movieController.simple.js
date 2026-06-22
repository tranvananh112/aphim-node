// Simple Movie Controller - No MongoDB required
const axios = require('axios');

const OPHIM_BASE = 'https://ophim17.cc';
const OPHIM_CDN = 'https://img.ophim.live';

// In-memory cache
let moviesCache = {};

// @desc    Get all movies (proxy to Ophim)
// @route   GET /api/movies
// @access  Public
exports.getMovies = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const cacheKey = `movies_page_${page}`;

        // Check cache
        if (moviesCache[cacheKey] && Date.now() - moviesCache[cacheKey].timestamp < 300000) {
            return res.json(moviesCache[cacheKey].data);
        }

        // Fetch from Ophim
        const response = await axios.get(`${OPHIM_BASE}/danh-sach/phim-moi-cap-nhat?page=${page}`);
        const data = response.data;

        if (data.status === 'success') {
            const result = {
                success: true,
                data: {
                    movies: data.data.items,
                    pagination: data.data.params?.pagination || {
                        page,
                        total: data.data.items.length
                    }
                }
            };

            // Cache result
            moviesCache[cacheKey] = {
                data: result,
                timestamp: Date.now()
            };

            res.json(result);
        } else {
            res.status(500).json({
                success: false,
                message: 'Không thể lấy danh sách phim'
            });
        }
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get single movie
// @route   GET /api/movies/:slug
// @access  Public
exports.getMovie = async (req, res) => {
    try {
        const slug = req.params.slug;
        const cacheKey = `movie_${slug}`;

        // Check cache
        if (moviesCache[cacheKey] && Date.now() - moviesCache[cacheKey].timestamp < 300000) {
            return res.json(moviesCache[cacheKey].data);
        }

        // Fetch from Ophim
        const response = await axios.get(`${OPHIM_BASE}/phim/${slug}`);
        const data = response.data;

        if (data.status === 'success') {
            const result = {
                success: true,
                data: data.data.item
            };

            // Cache result
            moviesCache[cacheKey] = {
                data: result,
                timestamp: Date.now()
            };

            res.json(result);
        } else {
            res.status(404).json({
                success: false,
                message: 'Không tìm thấy phim'
            });
        }
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Search movies
// @route   GET /api/movies/search
// @access  Public
exports.searchMovies = async (req, res) => {
    try {
        const keyword = req.query.q;
        const page = parseInt(req.query.page) || 1;

        if (!keyword) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập từ khóa tìm kiếm'
            });
        }

        // Fetch from Ophim
        const response = await axios.get(`${OPHIM_BASE}/tim-kiem`, {
            params: { keyword, page }
        });
        const data = response.data;

        if (data.status === 'success') {
            res.json({
                success: true,
                data: {
                    movies: data.data.items,
                    pagination: data.data.params?.pagination || {}
                }
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Không thể tìm kiếm phim'
            });
        }
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get featured movies
// @route   GET /api/movies/featured
// @access  Public
exports.getFeaturedMovies = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;

        // Get from page 1 and return limited
        const response = await axios.get(`${OPHIM_BASE}/danh-sach/phim-moi-cap-nhat?page=1`);
        const data = response.data;

        if (data.status === 'success') {
            res.json({
                success: true,
                data: data.data.items.slice(0, limit)
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Không thể lấy phim nổi bật'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get movie stream URL
// @route   GET /api/movies/:slug/stream/:episode
// @access  Public (no auth required for demo)
exports.getStreamURL = async (req, res) => {
    try {
        const slug = req.params.slug;
        const episodeSlug = req.params.episode;

        // Get movie detail
        const response = await axios.get(`${OPHIM_BASE}/phim/${slug}`);
        const data = response.data;

        if (data.status === 'success') {
            const movie = data.data.item;
            let streamURL = null;

            // Find episode
            for (const server of movie.episodes || []) {
                const episode = server.server_data?.find(ep => ep.slug === episodeSlug);
                if (episode) {
                    streamURL = episode.link_m3u8;
                    break;
                }
            }

            if (!streamURL) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy tập phim'
                });
            }

            res.json({
                success: true,
                data: {
                    streamURL,
                    quality: movie.quality,
                    subtitles: []
                }
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'Không tìm thấy phim'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Placeholder for admin functions
exports.syncMovie = (req, res) => {
    res.json({ success: true, message: 'Sync function - MongoDB required' });
};

exports.syncMoviesFromPage = (req, res) => {
    res.json({ success: true, message: 'Sync function - MongoDB required' });
};

exports.updateMovie = (req, res) => {
    res.json({ success: true, message: 'Update function - MongoDB required' });
};

exports.deleteMovie = (req, res) => {
    res.json({ success: true, message: 'Delete function - MongoDB required' });
};
