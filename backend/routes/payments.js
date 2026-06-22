const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

// Placeholder for payment routes
router.post('/create', protect, (req, res) => {
    res.json({ success: true, message: 'Payment created' });
});

router.get('/history', protect, (req, res) => {
    res.json({ success: true, data: [] });
});

module.exports = router;
