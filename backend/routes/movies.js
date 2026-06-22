const express = require('express');
const router = express.Router();
const {
    getMovies,
    getMovie,
    searchMovies,
    getFeaturedMovies,
    syncMovie,
    syncMoviesFromPage,
    updateMovie,
    deleteMovie,
    getStreamURL,
    getHiddenMovies,
    toggleHiddenMovie
} = require('../controllers/movieController');

const { protect, authorize } = require('../middleware/auth');

// Public routes
router.get('/', getMovies);
router.get('/featured', getFeaturedMovies);
router.get('/search', searchMovies);
router.get('/hidden/list', getHiddenMovies);
router.get('/:slug', getMovie);

// Protected routes (require authentication)
router.get('/:slug/stream/:episode', protect, getStreamURL);

// Admin routes
router.post('/sync/:slug', protect, authorize('admin'), syncMovie);
router.post('/sync-page', protect, authorize('admin'), syncMoviesFromPage);
router.post('/hidden/toggle/:slug', toggleHiddenMovie); // Need robust auth later, or let admin do it
router.put('/:id', protect, authorize('admin'), updateMovie);
router.delete('/:id', protect, authorize('admin'), deleteMovie);

module.exports = router;
