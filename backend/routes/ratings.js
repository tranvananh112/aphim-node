const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

// Placeholder for ratings routes
router.get('/:movieId', (req, res) => {
    res.json({ success: true, data: [] });
});

router.post('/:movieId', protect, (req, res) => {
    res.json({ success: true, message: 'Rating added' });
});

module.exports = router;
