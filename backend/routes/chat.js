const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { saveMessage, getHistory, toggleReaction, getReactionsMap, deleteMessage, togglePin, getPinned } = require('../controllers/chatController');

router.post('/message', protect, saveMessage);
router.post('/reaction', protect, toggleReaction);
router.get('/history/:tab', getHistory);
router.get('/pinned/:tab', getPinned);
router.get('/reactions-map/:tab', getReactionsMap);
router.delete('/:id', protect, deleteMessage);
router.put('/pin/:id', protect, togglePin);

module.exports = router;
