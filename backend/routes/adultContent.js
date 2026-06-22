const express = require('express');
const router = express.Router();
const adultContentController = require('../controllers/adultContentController');

// Search videos (Eporner primary, RedTube fallback)
router.get('/videos', adultContentController.searchVideos);

// Extract video source (MP4 URL)
router.get('/video-source', adultContentController.getVideoSource);

// Proxy video stream
router.get('/proxy-video-stream', adultContentController.proxyVideoStream);

// Proxy embed page
router.get('/proxy-embed', adultContentController.proxyEmbed);

// Proxy image
router.get('/proxy-image', adultContentController.proxyImage);

// Pornhub API proxy
router.all('/ph/:path(*)', adultContentController.pornhubProxy);

module.exports = router;
