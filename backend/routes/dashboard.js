const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { getDashboardStats } = require('../controllers/dashboardController');

// All dashboard routes are restricted to admin
router.use(protect);
router.use(authorize('admin'));

router.get('/stats', getDashboardStats);

module.exports = router;
