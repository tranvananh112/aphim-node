const Movie = require('../models/Movie');
const HiddenMovie = require('../models/HiddenMovie');
const ophimService = require('../services/ophimService');
const cache = require('../utils/cache');

// @desc    Get all movies
// @route   GET /api/movies
// @access  Public
exports.getMovies = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        // Try to get from database first
        try {
            const skip = (page - 1) * limit;
            const query = { isPublished: true };

            // Filters
            if (req.query.type) query.type = req.query.type;
            if (req.query.status) query.status = req.query.status;
            if (req.query.year) query.year = parseInt(req.query.year);
            if (req.query.quality) query.quality = req.query.quality;
            if (req.query.category) {
                query['category.slug'] = req.query.category;
            }
            if (req.query.country) {
                query['country.slug'] = req.query.country;
            }

            // Sort
            let sort = { createdAt: -1 };
            if (req.query.sort === 'view') sort = { view: -1 };
            if (req.query.sort === 'rating') sort = { 'ratings.average': -1 };
            if (req.query.sort === 'year') sort = { year: -1 };

            const movies = await Movie.find(query)
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .select('-episodes');

            const total = await Movie.countDocuments(query);

            // If we have movies in database, return them
            if (movies.length > 0) {
                return res.json({
                    success: true,
                    data: {
                        items: movies,
                        params: {
                            pagination: {
                                currentPage: page,
                                totalItems: total,
                                totalItemsPerPage: limit,
                                totalPages: Math.ceil(total / limit)
                            }
                        }
                    }
                });
            }
        } catch (dbError) {
            console.log('Database not available, fetching from Ophim API...');
        }

        // Fallback to Ophim API if no database or no movies
        const ophimData = await ophimService.fetchMovieList(page);

        if (ophimData && ophimData.status === 'success') {
            return res.json({
                success: true,
                data: ophimData.data
            });
        }

        throw new Error('Could not fetch movies from any source');

    } catch (error) {
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
        let movie = null;

        // Try to get from database first
        try {
            movie = await Movie.findOne({ slug: req.params.slug });

            if (movie) {
                // Increment view count
                await movie.incrementView();

                // Return in Ophim-compatible format
                return res.json({
                    success: true,
                    data: {
                        item: movie
                    }
                });
            }
        } catch (dbError) {
            console.log('Database not available, fetching from Ophim API...');
        }

        // Fallback to Ophim API
        const ophimData = await ophimService.fetchMovieDetail(req.params.slug);

        if (ophimData && ophimData.status === 'success') {
            return res.json({
                success: true,
                data: ophimData.data
            });
        }

        return res.status(404).json({
            success: false,
            message: 'Không tìm thấy phim'
        });

    } catch (error) {
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
        const limit = parseInt(req.query.limit) || 20;

        if (!keyword) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập từ khóa tìm kiếm'
            });
        }

        // Try database first
        try {
            const skip = (page - 1) * limit;

            const movies = await Movie.find({
                $text: { $search: keyword },
                isPublished: true
            })
                .sort({ score: { $meta: 'textScore' } })
                .skip(skip)
                .limit(limit)
                .select('-episodes');

            const total = await Movie.countDocuments({
                $text: { $search: keyword },
                isPublished: true
            });

            if (movies.length > 0) {
                return res.json({
                    success: true,
                    data: {
                        items: movies,
                        params: {
                            pagination: {
                                currentPage: page,
                                totalItems: total,
                                totalItemsPerPage: limit,
                                totalPages: Math.ceil(total / limit)
                            }
                        }
                    }
                });
            }
        } catch (dbError) {
            console.log('Database not available, searching via Ophim API...');
        }

        // Fallback to Ophim API
        const ophimData = await ophimService.searchMovies(keyword, page);

        if (ophimData && ophimData.status === 'success') {
            return res.json({
                success: true,
                data: ophimData.data
            });
        }

        return res.json({
            success: true,
            data: {
                items: [],
                params: {
                    pagination: {
                        currentPage: page,
                        totalItems: 0,
                        totalItemsPerPage: limit,
                        totalPages: 0
                    }
                }
            }
        });

    } catch (error) {
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

        const movies = await Movie.find({
            isPublished: true,
            isFeatured: true
        })
            .sort({ createdAt: -1 })
            .limit(limit)
            .select('-episodes');

        res.json({
            success: true,
            data: movies
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Sync movie from Ophim
// @route   POST /api/movies/sync/:slug
// @access  Private/Admin
exports.syncMovie = async (req, res) => {
    try {
        const movie = await ophimService.syncMovieToDatabase(req.params.slug);

        res.json({
            success: true,
            message: 'Đồng bộ phim thành công',
            data: movie
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Sync movies from Ophim page
// @route   POST /api/movies/sync-page
// @access  Private/Admin
exports.syncMoviesFromPage = async (req, res) => {
    try {
        const page = parseInt(req.body.page) || 1;
        const result = await ophimService.syncMoviesFromPage(page);

        res.json({
            success: true,
            message: `Đồng bộ thành công ${result.synced}/${result.total} phim`,
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Update movie
// @route   PUT /api/movies/:id
// @access  Private/Admin
exports.updateMovie = async (req, res) => {
    try {
        const movie = await Movie.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!movie) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy phim'
            });
        }

        res.json({
            success: true,
            data: movie
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Delete movie
// @route   DELETE /api/movies/:id
// @access  Private/Admin
exports.deleteMovie = async (req, res) => {
    try {
        const movie = await Movie.findByIdAndDelete(req.params.id);

        if (!movie) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy phim'
            });
        }

        res.json({
            success: true,
            message: 'Xóa phim thành công'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get movie stream URL
// @route   GET /api/movies/:slug/stream/:episode
// @access  Private (requires authentication)
exports.getStreamURL = async (req, res) => {
    try {
        const movie = await Movie.findOne({ slug: req.params.slug });

        if (!movie) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy phim'
            });
        }

        // Check user subscription
        if (!req.user.hasActiveSubscription()) {
            return res.status(403).json({
                success: false,
                message: 'Vui lòng nâng cấp gói thành viên để xem phim'
            });
        }

        // Find episode
        const episodeSlug = req.params.episode;
        let streamURL = null;

        for (const server of movie.episodes) {
            const episode = server.serverData.find(ep => ep.slug === episodeSlug);
            if (episode) {
                streamURL = episode.linkM3u8;
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
                subtitles: [] // Add subtitles if available
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get all hidden movies slugs
// @route   GET /api/movies/hidden/list
// @access  Public
exports.getHiddenMovies = async (req, res) => {
    try {
        const cachedSlugs = cache.get('hidden_movies');
        if (cachedSlugs) return res.json({ success: true, data: cachedSlugs });

        const hiddenList = await HiddenMovie.find().select('slug -_id');
        const slugs = hiddenList.map(item => item.slug);
        cache.set('hidden_movies', slugs, 30);
        res.json({
            success: true,
            data: slugs
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Toggle hide movie
// @route   POST /api/movies/hidden/toggle/:slug
// @access  Private/Admin
exports.toggleHiddenMovie = async (req, res) => {
    try {
        const { slug } = req.params;
        const exists = await HiddenMovie.findOne({ slug });
        
        if (exists) {
            await HiddenMovie.findOneAndDelete({ slug });
            cache.del('hidden_movies');
            res.json({
                success: true,
                message: 'Phim đã được hiện lại',
                isHidden: false
            });
        } else {
            await HiddenMovie.create({ slug });
            cache.del('hidden_movies');
            res.json({
                success: true,
                message: 'Phim đã bị ẩn',
                isHidden: true
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
