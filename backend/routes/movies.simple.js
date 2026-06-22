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
    getStreamURL
} = require('../controllers/movieController.simple');

// Public routes - no auth required for demo
router.get('/', getMovies);
router.get('/featured', getFeaturedMovies);
router.get('/search', searchMovies);
router.get('/:slug', getMovie);
router.get('/:slug/stream/:episode', getStreamURL);

// Admin routes (placeholders)
router.post('/sync/:slug', syncMovie);
router.post('/sync-page', syncMoviesFromPage);
router.put('/:id', updateMovie);
router.delete('/:id', deleteMovie);

module.exports = router;
