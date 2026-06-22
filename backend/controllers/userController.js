const User = require('../models/User');
const Notification = require('../models/Notification');

// @desc    Get all users (Admin only)
// @route   GET /api/users
// @access  Private/Admin
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password').sort('-createdAt');

        res.json({
            success: true,
            count: users.length,
            data: users
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get single user (Admin only)
// @route   GET /api/users/:id
// @access  Private/Admin
exports.getUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy người dùng'
            });
        }

        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Update user (Admin only)
// @route   PUT /api/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true
            }
        ).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy người dùng'
            });
        }

        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Block/Unblock user (Admin only)
// @route   PUT /api/users/:id/block
// @access  Private/Admin
exports.blockUser = async (req, res) => {
    try {
        const { isBlocked } = req.body;

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { isBlocked },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy người dùng'
            });
        }

        res.json({
            success: true,
            message: isBlocked ? 'Đã khóa tài khoản' : 'Đã mở khóa tài khoản',
            data: user
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Delete user (Admin only)
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy người dùng'
            });
        }

        res.json({
            success: true,
            message: 'Đã xóa người dùng'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Update user subscription (Admin only)
// @route   PUT /api/users/:id/subscription
// @access  Private/Admin
exports.updateSubscription = async (req, res) => {
    try {
        const { plan, expiresAt, autoRenew } = req.body;

        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy người dùng'
            });
        }

        user.subscription = {
            plan,
            startDate: new Date(),
            expiresAt: expiresAt ? new Date(expiresAt) : undefined,
            autoRenew: autoRenew || false
        };

        await user.save();

        res.json({
            success: true,
            message: 'Đã cập nhật gói dịch vụ',
            data: user
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Update user gamification details (Admin only)
// @route   PUT /api/users/:id/gamification
// @access  Private/Admin
exports.manageUserGamification = async (req, res) => {
    try {
        const { coins, xp, frameToAdd, bannerToAdd, frameToRemove, bannerToRemove, subscription } = req.body;
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
        }

        // Ensure inventory object exists
        if (!user.inventory) {
            user.inventory = { frames: [], banners: [] };
        }
        if (!user.transactions) {
            user.transactions = [];
        }

        // --- DETECT CHANGES FOR NOTIFICATION ---
        const isCoinUpdate = typeof coins === 'number' && coins !== user.coins;
        const isPlanUpdate = subscription && subscription.plan && subscription.plan.toUpperCase() !== (user.subscription?.plan || 'FREE');

        let notificationMsg = req.body.message || 'Hệ thống vừa cập nhật tài khoản của bạn';
        let coinDiffCalculated = 0; // HOISTED for Socket event

        // DYNAMIC QUANTIFICATION: Append precise delta for transparency if applicable
        if (isCoinUpdate) {
            coinDiffCalculated = coins - user.coins;
            const direction = coinDiffCalculated > 0 ? 'nhận' : 'bị trừ';
            const formattedDiff = coinDiffCalculated > 0 ? `+${coinDiffCalculated.toLocaleString('vi-VN')}` : coinDiffCalculated.toLocaleString('vi-VN');
            notificationMsg = `[${formattedDiff} Xu] Bạn vừa ${direction} ${formattedDiff} Xu vào tài khoản. \nNội dung: ${notificationMsg}`;
        }

        // ✅ Handle subscription plan update
        if (subscription && subscription.plan) {
            const prevPlan = user.subscription?.plan || 'FREE';
            const newPlan = subscription.plan.toUpperCase();
            const newEndDate = subscription.endDate ? new Date(subscription.endDate) : (user.subscription?.endDate || null);

            user.subscription = {
                plan: newPlan,
                startDate: subscription.startDate ? new Date(subscription.startDate) : new Date(),
                endDate: newEndDate,
                expiresAt: newEndDate,   // keep legacy alias in sync
                status: newPlan !== 'FREE' ? 'active' : 'inactive',
                autoRenew: user.subscription?.autoRenew || false
            };

            // Log plan change as transaction
            if (prevPlan !== newPlan) {
                const planLabel = newPlan === 'PREMIUM' ? 'CAO CẤP (Premium)' : newPlan === 'FAMILY' ? 'GIA ĐÌNH (Family)' : 'FREE';
                user.transactions.push({
                    title: `Admin kích hoạt gói ${planLabel}`,
                    amount: 0,
                    type: 'admin',
                    date: new Date()
                });
            }
        }

        // Handle inventory additions
        if (frameToAdd && !user.inventory.frames.includes(frameToAdd)) {
            user.inventory.frames.push(frameToAdd);
            user.transactions.push({ title: `Admin cấp thẻ Khung: ${frameToAdd}`, amount: 0, type: 'admin', date: new Date() });
        }
        if (bannerToAdd && !user.inventory.banners.includes(bannerToAdd)) {
            user.inventory.banners.push(bannerToAdd);
            user.transactions.push({ title: `Admin cấp thẻ Ảnh bìa: ${bannerToAdd}`, amount: 0, type: 'admin', date: new Date() });
        }

        // Handle removals
        if (frameToRemove) {
            user.inventory.frames = user.inventory.frames.filter(f => f !== frameToRemove);
        }
        if (bannerToRemove) {
            user.inventory.banners = user.inventory.banners.filter(b => b !== bannerToRemove);
        }

        // Log coin changes if it was a modification
        if (isCoinUpdate) {
            const diff = coins - user.coins;
            user.transactions.push({
                title: 'Admin điều chỉnh số dư Xu',
                amount: diff,
                type: 'recharge',
                date: new Date()
            });
            user.coins = coins;
            user.xu = coins; // SYNC BOTH FIELDS
        }
        if (typeof xp === 'number') user.xp = xp;

        // --- PERSISTENT NOTIFICATION ---
        try {
            await Notification.create({
                user: user._id,
                title: isCoinUpdate ? 'Biến động số dư' : (isPlanUpdate ? 'Nâng cấp gói thành viên' : 'Cập nhật tài khoản'),
                message: notificationMsg,
                type: isCoinUpdate ? 'success' : (isPlanUpdate ? 'promotion' : 'info'),
                category: isPlanUpdate ? 'subscription' : (isCoinUpdate ? 'payment' : 'account')
            });
        } catch (notifErr) {
            console.error('❌ [Notification] Persistent save failed:', notifErr);
        }

        await user.save();

        // REALTIME SYNC via Socket.IO
        const socketUtil = require('../utils/socket');
        if (socketUtil.isInitialized()) {
            console.log(`📡 [Socket] Emitting USER_UPDATE_${user._id} | coins: ${user.coins}, xp: ${user.xp}, plan: ${user.subscription?.plan}`);
            socketUtil.emitEvent(`USER_UPDATE_${user._id}`, {
                userId: user._id,
                coins: user.coins,
                coinDiff: coinDiffCalculated, // EXPLICIT FOR FRONTEND
                xp: user.xp,
                inventory: user.inventory,
                equippedFrame: user.equippedFrame,
                subscription: user.subscription,
                message: notificationMsg || 'Hệ thống vừa cập nhật tài khoản của bạn'
            });
        } else {
            console.warn('⚠️ [Socket] Socket.io not initialized, cannot emit realtime update');
        }

        res.json({
            success: true,
            message: 'Đã đồng bộ thông tin tài khoản thành công',
            data: {
                coins: user.coins,
                xp: user.xp,
                inventory: user.inventory,
                subscription: user.subscription
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Broadcast notification to all users (Admin only)
// @route   POST /api/users/broadcast
// @access  Private/Admin
exports.broadcastNotification = async (req, res) => {
    try {
        const { title, message, type } = req.body;

        // Emit to all users via Socket.IO
        const socketUtil = require('../utils/socket');
        if (socketUtil.isInitialized()) {
            socketUtil.emitEvent('SYSTEM_NOTIFICATION', {
                title: title || 'Thông báo hệ thống',
                message: message,
                type: type || 'admin'
            });
        }

        // --- PERSISTENT BROADCAST SAVE ---
        // Save as a broadcast notification for all users to see when they login
        const Notification = require('../models/Notification');
        await Notification.create({
            title: title || 'Thông báo hệ thống',
            message: message,
            type: type || 'info',
            isBroadcast: true,
            category: 'system'
        });

        res.json({
            success: true,
            message: 'Đã gửi thông báo cho toàn bộ hệ thống'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get user statistics (Admin only)
// @route   GET /api/users/stats
// @access  Private/Admin
exports.getUserStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const activeUsers = await User.countDocuments({ isActive: true, isBlocked: false });
        const blockedUsers = await User.countDocuments({ isBlocked: true });
        const premiumUsers = await User.countDocuments({ 'subscription.plan': { $in: ['PREMIUM', 'FAMILY'] } });

        res.json({
            success: true,
            data: {
                totalUsers,
                activeUsers,
                blockedUsers,
                premiumUsers,
                freeUsers: totalUsers - premiumUsers
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Toggle chat ban for user (Admin only)
// @route   PUT /api/users/:id/chat-ban
// @access  Private/Admin
exports.toggleChatBan = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy người dùng'
            });
        }

        // Toggle ban status
        user.isChatBanned = !user.isChatBanned;
        await user.save();

        // Broadcast realtime update via Socket.io
        const socketUtil = require('../utils/socket');
        if (socketUtil.isInitialized()) {
            console.log(`📡 [Socket] Emitting CHAT_BAN_UPDATE for user ${user._id}`);
            socketUtil.emitEvent(`USER_UPDATE_${user._id}`, {
                userId: user._id,
                isChatBanned: user.isChatBanned,
                message: user.isChatBanned ? 'Bạn đã bị cấm chat' : 'Bạn đã được gỡ cấm chat'
            });
        }

        res.json({
            success: true,
            message: user.isChatBanned ? 'Đã cấm chat người dùng' : 'Đã gỡ cấm chat người dùng',
            data: {
                isChatBanned: user.isChatBanned
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Update chat role for user (Admin only)
// @route   PUT /api/users/:id/chat-role
// @access  Private/Admin
exports.updateChatRole = async (req, res) => {
    try {
        const { role } = req.body;

        if (!role || !['admin', 'user'].includes(role)) {
            return res.status(400).json({
                success: false,
                message: 'Role phải là "admin" hoặc "user"'
            });
        }

        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy người dùng'
            });
        }

        user.chatRole = role;
        await user.save();

        // Broadcast realtime update via Socket.io
        const socketUtil = require('../utils/socket');
        if (socketUtil.isInitialized()) {
            console.log(`📡 [Socket] Emitting CHAT_ROLE_UPDATE for user ${user._id} | role: ${role}`);
            socketUtil.emitEvent(`USER_UPDATE_${user._id}`, {
                userId: user._id,
                chatRole: role,
                message: role === 'admin' ? 'Bạn đã được cấp quyền Admin chat' : 'Quyền Admin chat đã bị thu hồi'
            });
        }

        res.json({
            success: true,
            message: `Đã cập nhật quyền chat thành ${role}`,
            data: {
                chatRole: user.chatRole
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
