const express = require('express');
const router = express.Router();
const { getSettings, updateSettings, getPublicSettings, getPaymentPublic } = require('../controllers/settingController');

const { protect, authorize } = require('../middleware/auth');

// Public route for frontend fetching configurations dynamically
router.get('/public', getPublicSettings);

// Public route for pricing page (prices + bank info, no sensitive keys)
router.get('/payment-public', getPaymentPublic);

// Protected routes for Admin Dashboard
router.route('/')
    .get(protect, authorize('admin'), getSettings)
    .put(protect, authorize('admin'), updateSettings);

module.exports = router;
