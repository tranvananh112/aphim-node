const express = require('express');
const router = express.Router();
const {
    getAllBanners,
    getActiveBanner,
    getThumbnailBanners,
    updateThumbnailList,
    loadMoviesFromAPI,
    addBanner,
    updateBanner,
    deleteBanner,
    fetchBannerLogo,
    fetchAllLogos
} = require('../controllers/bannerController');
const { protect, authorize } = require('../middleware/auth');

// Public routes
router.get('/active', getActiveBanner);
router.get('/thumbnails', getThumbnailBanners);

// Protected routes (Admin only)
router.use(protect);
router.use(authorize('admin'));

router.get('/', getAllBanners);
router.post('/load-movies', loadMoviesFromAPI);
router.post('/fetch-all-logos', fetchAllLogos);   // ← Batch backfill logos cho banner cũ
router.post('/', addBanner);
router.put('/thumbnails', updateThumbnailList);
router.post('/:id/fetch-logo', fetchBannerLogo);  // ← Fetch logo cho 1 banner
router.put('/:id', updateBanner);
router.delete('/:id', deleteBanner);

module.exports = router;
