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
    deleteBanner
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
router.post('/', addBanner);
router.put('/thumbnails', updateThumbnailList);
router.put('/:id', updateBanner);
router.delete('/:id', deleteBanner);

module.exports = router;
