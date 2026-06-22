const express = require('express');
const router = express.Router();
const {
    getRecentSupporters,
    getAllSupporters,
    createSupporter,
    updateSupporter,
    deleteSupporter,
    getStatistics
} = require('../controllers/supporterController');
const { protect, adminOnly } = require('../middleware/auth');

// Public routes
router.get('/recent', getRecentSupporters);
router.get('/statistics', getStatistics); // Public statistics

// Admin routes
router.get('/', protect, adminOnly, getAllSupporters);
router.post('/', protect, adminOnly, createSupporter);
router.put('/:id', protect, adminOnly, updateSupporter);
router.delete('/:id', protect, adminOnly, deleteSupporter);

module.exports = router;
