const Notification = require('../models/Notification');

// @desc    Get all notifications for a user
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = async (req, res) => {
    try {
        // Find personal notifications AND broadcast notifications
        const notifications = await Notification.find({
            $or: [
                { user: req.user.id },
                { isBroadcast: true }
            ]
        }).sort('-createdAt').limit(50);

        res.json({
            success: true,
            count: notifications.length,
            data: notifications
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res) => {
    try {
        let notification = await Notification.findById(req.params.id);

        if (!notification) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy thông báo' });
        }

        // Broadast notifications don't need to be "marked as read" per user in this simple implementation
        // unless we track it per user. For now, we only mark personal ones.
        if (notification.user && notification.user.toString() !== req.user.id) {
            return res.status(401).json({ success: false, message: 'Không có quyền' });
        }

        notification.isRead = true;
        notification.readAt = Date.now();
        await notification.save();

        res.json({
            success: true,
            data: notification
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
exports.markAllAsRead = async (req, res) => {
    try {
        await Notification.updateMany(
            { user: req.user.id, isRead: false },
            { isRead: true, readAt: Date.now() }
        );

        res.json({
            success: true,
            message: 'Đã đánh dấu tất cả là đã đọc'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
exports.deleteNotification = async (req, res) => {
    try {
        let notification = await Notification.findById(req.params.id);

        if (!notification) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy thông báo' });
        }

        if (notification.user && notification.user.toString() !== req.user.id) {
            return res.status(401).json({ success: false, message: 'Không có quyền' });
        }

        await notification.remove();

        res.json({
            success: true,
            message: 'Đã xóa thông báo'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
