const Banner = require('../models/Banner');
const Setting = require('../models/Setting');
const axios = require('axios');

// Helper to ensure a single settings document exists
const getOrCreateSettings = async () => {
    let settings = await Setting.findOne();
    if (!settings) {
        settings = await Setting.create({});
    }
    return settings;
};

// @desc    Get all banners (for admin)
// @route   GET /api/banners
// @access  Private (Admin)
exports.getAllBanners = async (req, res) => {
    try {
        const banners = await Banner.find()
            .sort({ priority: -1, createdAt: -1 })
            .populate('addedBy', 'username email');

        res.json({
            success: true,
            count: banners.length,
            data: banners
        });
    } catch (error) {
        console.error('Error getting banners:', error);
        res.status(500).json({
            success: false,
            message: 'Không thể tải danh sách banner'
        });
    }
};

// @desc    Get active banner (for homepage)
// @route   GET /api/banners/active
// @access  Public
exports.getActiveBanner = async (req, res) => {
    try {
        // Get the highest priority active banner
        const banner = await Banner.findOne({ isActive: true })
            .sort({ priority: -1, createdAt: -1 });

        if (!banner) {
            return res.json({
                success: true,
                data: null,
                message: 'Không có banner nào được kích hoạt'
            });
        }

        res.json({
            success: true,
            data: banner
        });
    } catch (error) {
        console.error('Error getting active banner:', error);
        res.status(500).json({
            success: false,
            message: 'Không thể tải banner'
        });
    }
};

// @desc    Get thumbnail strip movies (for homepage - 10 phim nhỏ dưới hero)
// @route   GET /api/banners/thumbnails
// @access  Public
exports.getThumbnailBanners = async (req, res) => {
    try {
        const settings = await getOrCreateSettings();
        if (!settings) {
            return res.json({ success: true, count: 0, data: [] });
        }
        
        const thumbnails = (settings.content && settings.content.heroThumbnails) || [];

        res.json({
            success: true,
            count: thumbnails.length,
            data: thumbnails
        });
    } catch (error) {
        console.error('CRITICAL ERROR: getThumbnailBanners failed:', error);
        res.status(500).json({
            success: false,
            message: 'Không thể tải thumbnail: ' + error.message
        });
    }
};

// @desc    Update thumbnail list (set which movies appear in thumbnail strip & their order)
// @route   PUT /api/banners/thumbnails
// @access  Private (Admin)
// Body: { movies: [{movieSlug, name, thumbUrl, ...}, ...] }  ordered array, max 10
exports.updateThumbnailList = async (req, res) => {
    try {
        const { movies } = req.body;

        if (!Array.isArray(movies)) {
            return res.status(400).json({
                success: false,
                message: 'movies phải là mảng các đối tượng phim'
            });
        }

        if (movies.length > 10) {
            return res.status(400).json({
                success: false,
                message: 'Tối đa 10 thumbnail'
            });
        }

        // Cập nhật mảng vào model Setting
        const settings = await Setting.findOneAndUpdate(
            {},
            { $set: { 'content.heroThumbnails': movies } },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        if (!settings || !settings.content) {
            throw new Error('Không thể cập nhật cấu hình nội dung');
        }

        res.json({
            success: true,
            count: settings.content.heroThumbnails ? settings.content.heroThumbnails.length : 0,
            data: settings.content.heroThumbnails || []
        });
    } catch (error) {
        console.error('CRITICAL ERROR: updateThumbnailList failed:', error);
        res.status(500).json({
            success: false,
            message: 'Không thể cập nhật thumbnail: ' + error.message
        });
    }
};

// @desc    Load movies from Ophim API (multiple pages)
// @route   POST /api/banners/load-movies
// @access  Private (Admin)
exports.loadMoviesFromAPI = async (req, res) => {
    try {
        const { startPage = 1, endPage = 5 } = req.body;

        if (startPage < 1 || endPage < startPage || endPage > 20) {
            return res.status(400).json({
                success: false,
                message: 'Trang không hợp lệ (1-20, startPage <= endPage)'
            });
        }

        const allMovies = [];
        const errors = [];

        // Load movies from multiple pages
        for (let page = startPage; page <= endPage; page++) {
            try {
                const response = await axios.get(
                    `https://ophim1.com/v1/api/danh-sach/phim-moi-cap-nhat?page=${page}`,
                    {
                        headers: { 'accept': 'application/json' },
                        timeout: 10000
                    }
                );

                if (response.data.status === 'success' && response.data.data?.items) {
                    const movies = response.data.data.items.map(movie => ({
                        ...movie,
                        sourcePage: page
                    }));
                    allMovies.push(...movies);
                }
            } catch (error) {
                console.error(`Error loading page ${page}:`, error.message);
                errors.push({ page, error: error.message });
            }
        }

        res.json({
            success: true,
            data: {
                movies: allMovies,
                totalMovies: allMovies.length,
                pagesLoaded: endPage - startPage + 1,
                errors: errors.length > 0 ? errors : undefined
            }
        });
    } catch (error) {
        console.error('Error loading movies from API:', error);
        res.status(500).json({
            success: false,
            message: 'Không thể tải phim từ API'
        });
    }
};

// @desc    Add movie to banner list
// @route   POST /api/banners
// @access  Private (Admin)
exports.addBanner = async (req, res) => {
    try {
        const {
            movieSlug,
            name,
            originName,
            thumbUrl,
            posterUrl,
            content,
            year,
            quality,
            lang,
            episodeCurrent,
            category,
            tmdb,
            imdb,
            sourcePage,
            priority = 0
        } = req.body;

        // Check if banner already exists
        const existingBanner = await Banner.findOne({ movieSlug });
        if (existingBanner) {
            return res.status(400).json({
                success: false,
                message: 'Banner này đã tồn tại'
            });
        }

        const banner = await Banner.create({
            movieSlug,
            name,
            originName,
            thumbUrl,
            posterUrl,
            content,
            year,
            quality,
            lang,
            episodeCurrent,
            category,
            tmdb,
            imdb,
            sourcePage,
            priority,
            isActive: false,
            addedBy: req.user._id
        });

        res.status(201).json({
            success: true,
            data: banner
        });
    } catch (error) {
        console.error('Error adding banner:', error);
        res.status(500).json({
            success: false,
            message: 'Không thể thêm banner'
        });
    }
};

// @desc    Update banner (activate/deactivate, change priority)
// @route   PUT /api/banners/:id
// @access  Private (Admin)
exports.updateBanner = async (req, res) => {
    try {
        const { isActive, priority } = req.body;
        const banner = await Banner.findById(req.params.id);

        if (!banner) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy banner'
            });
        }

        // If activating this banner, deactivate all others
        if (isActive === true) {
            await Banner.updateMany(
                { _id: { $ne: req.params.id } },
                { isActive: false }
            );
        }

        if (isActive !== undefined) banner.isActive = isActive;
        if (priority !== undefined) banner.priority = priority;

        await banner.save();

        res.json({
            success: true,
            data: banner
        });
    } catch (error) {
        console.error('Error updating banner:', error);
        res.status(500).json({
            success: false,
            message: 'Không thể cập nhật banner'
        });
    }
};

// @desc    Delete banner
// @route   DELETE /api/banners/:id
// @access  Private (Admin)
exports.deleteBanner = async (req, res) => {
    try {
        const banner = await Banner.findById(req.params.id);

        if (!banner) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy banner'
            });
        }

        await banner.deleteOne();

        res.json({
            success: true,
            message: 'Đã xóa banner'
        });
    } catch (error) {
        console.error('Error deleting banner:', error);
        res.status(500).json({
            success: false,
            message: 'Không thể xóa banner'
        });
    }
};
