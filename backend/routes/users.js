const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
    getAllUsers,
    getUser,
    updateUser,
    blockUser,
    deleteUser,
    updateSubscription,
    manageUserGamification,
    getUserStats,
    broadcastNotification,
    toggleChatBan,
    updateChatRole
} = require('../controllers/userController');

// Admin only routes
router.use(protect);
router.use(authorize('admin'));

router.post('/broadcast', broadcastNotification);
router.get('/stats', getUserStats);
router.get('/', getAllUsers);
router.get('/:id', getUser);
router.put('/:id', updateUser);
router.put('/:id/block', blockUser);
router.put('/:id/subscription', updateSubscription);
router.put('/:id/gamification', manageUserGamification);
router.put('/:id/chat-ban', toggleChatBan);
router.put('/:id/chat-role', updateChatRole);
router.delete('/:id', deleteUser);

module.exports = router;

