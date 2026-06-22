const User = require('../models/User');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const socketUtil = require('../utils/socket');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;

        // Check if user exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({
                success: false,
                message: 'Email đã được sử dụng'
            });
        }

        // Create user
        const user = await User.create({
            name,
            email,
            password,
            phone
        });

        // Emit realtime event
        socketUtil.emitEvent('new_activity', {
            type: 'user',
            icon: 'user-plus',
            color: 'info',
            message: `Người dùng mới: <strong>${user.name}</strong> vừa tham gia hệ thống`,
            time: new Date(),
            user: { name: user.name, email: user.email }
        });

        sendTokenResponse(user, 201, res);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
    try {
        const { email, password, rememberMe } = req.body;

        console.log('Login attempt:', { email, passwordLength: password?.length, rememberMe });

        // Validate email & password
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập email và mật khẩu'
            });
        }

        // Check for user
        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            console.log('User not found:', email);
            return res.status(401).json({
                success: false,
                message: 'Email hoặc mật khẩu không đúng'
            });
        }

        console.log('User found:', { email: user.email, role: user.role });

        // Check if user is blocked
        if (user.isBlocked) {
            return res.status(403).json({
                success: false,
                message: 'Tài khoản của bạn đã bị khóa'
            });
        }

        // Check if password matches
        const isMatch = await user.matchPassword(password);

        console.log('Password match:', isMatch);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Email hoặc mật khẩu không đúng'
            });
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        sendTokenResponse(user, 200, res, rememberMe);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

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

// @desc    Update user details
// @route   PUT /api/auth/updatedetails
// @access  Private
exports.updateDetails = async (req, res) => {
    try {
        const fieldsToUpdate = {};
        if (req.body.name !== undefined) fieldsToUpdate.name = req.body.name;
        if (req.body.phone !== undefined) fieldsToUpdate.phone = req.body.phone;
        if (req.body.avatar !== undefined) fieldsToUpdate.avatar = req.body.avatar;
        if (req.body.equippedFrame !== undefined) fieldsToUpdate.equippedFrame = req.body.equippedFrame;
        if (req.body.equippedFrameUrl !== undefined) fieldsToUpdate.equippedFrameUrl = req.body.equippedFrameUrl;
        if (req.body.equippedFrameClass !== undefined) fieldsToUpdate.equippedFrameClass = req.body.equippedFrameClass;
        if (req.body.profileCover !== undefined) fieldsToUpdate.profileCover = req.body.profileCover;
        if (req.body.favorites !== undefined) fieldsToUpdate.favorites = req.body.favorites;
        if (req.body.watchHistory !== undefined) fieldsToUpdate.watchHistory = req.body.watchHistory;
        if (req.body.watchProgress !== undefined) fieldsToUpdate.watchProgress = req.body.watchProgress;
        if (req.body.playlists !== undefined) fieldsToUpdate.playlists = req.body.playlists;

        // Bổ sung Whitelist cho Gamification / Shop
        if (req.body.coins !== undefined) fieldsToUpdate.coins = req.body.coins;
        if (req.body.xu !== undefined) fieldsToUpdate.xu = req.body.xu; // Fallback tương thích
        if (req.body.xp !== undefined) fieldsToUpdate.xp = req.body.xp;
        if (req.body.inventory !== undefined) fieldsToUpdate.inventory = req.body.inventory;
        if (req.body.ownedFrames !== undefined) fieldsToUpdate.ownedFrames = req.body.ownedFrames;
        if (req.body.ownedBanners !== undefined) fieldsToUpdate.ownedBanners = req.body.ownedBanners;

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Apply updates manually
        Object.keys(fieldsToUpdate).forEach(key => {
            user[key] = fieldsToUpdate[key];
        });

        // Handle transaction log push
        if (req.body.transactionLog) {
            if (!user.transactions) user.transactions = [];
            user.transactions.push(req.body.transactionLog);
        }

        // Mark modified for mixed types to ensure save triggers properly
        if (req.body.watchProgress !== undefined) {
            user.markModified('watchProgress');
        }

        await user.save();

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

// @desc    Update password
// @route   PUT /api/auth/updatepassword
// @access  Private
exports.updatePassword = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('+password');

        // Check current password
        if (!(await user.matchPassword(req.body.currentPassword))) {
            return res.status(401).json({
                success: false,
                message: 'Mật khẩu hiện tại không đúng'
            });
        }

        user.password = req.body.newPassword;
        await user.save();

        sendTokenResponse(user, 200, res);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Forgot password
// @route   POST /api/auth/forgotpassword
// @access  Public
exports.forgotPassword = async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Email không tồn tại'
            });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(20).toString('hex');

        // Hash token and set to resetPasswordToken field
        user.resetPasswordToken = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');

        // Set expire (10 minutes)
        user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

        await user.save({ validateBeforeSave: false });

        // Create reset url
        const resetUrl = `${req.protocol}://${req.get('host')}/reset-password/${resetToken}`;

        // TODO: Send email with resetUrl
        // For now, just return the token (in production, send via email)

        res.json({
            success: true,
            message: 'Email đặt lại mật khẩu đã được gửi',
            resetToken // Remove this in production
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Reset password
// @route   PUT /api/auth/resetpassword/:resettoken
// @access  Public
exports.resetPassword = async (req, res) => {
    try {
        // Get hashed token
        const resetPasswordToken = crypto
            .createHash('sha256')
            .update(req.params.resettoken)
            .digest('hex');

        const user = await User.findOne({
            resetPasswordToken,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Token không hợp lệ hoặc đã hết hạn'
            });
        }

        // Set new password
        user.password = req.body.password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();

        sendTokenResponse(user, 200, res);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Logout user / clear cookie
// @route   GET /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
    res.json({
        success: true,
        message: 'Đăng xuất thành công'
    });
};

// @desc    Refresh token
// @route   POST /api/auth/refresh
// @access  Private
exports.refreshToken = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Người dùng không tồn tại'
            });
        }

        if (user.isBlocked) {
            return res.status(403).json({
                success: false,
                message: 'Tài khoản của bạn đã bị khóa'
            });
        }

        // Check if rememberMe was used (from request body)
        const rememberMe = req.body.rememberMe || false;

        sendTokenResponse(user, 200, res, rememberMe);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Helper function to get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res, rememberMe = false) => {
    // Create token with rememberMe option
    const token = user.getSignedJwtToken(rememberMe);

    const cookieExpireDays = rememberMe
        ? 90
        : (process.env.JWT_COOKIE_EXPIRE || 30);

    const options = {
        expires: new Date(
            Date.now() + cookieExpireDays * 24 * 60 * 60 * 1000
        ),
        httpOnly: true
    };

    if (process.env.NODE_ENV === 'production') {
        options.secure = true;
    }

    // 🚀 FIX: Actually send the token in the response cookie so that browsers cache it
    res.cookie('token', token, options);

    res.status(statusCode).json({
        success: true,
        token,
        expiresIn: rememberMe ? '90d' : '30d',
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            avatar: user.avatar,
            equippedFrame: user.equippedFrame,
            equippedFrameUrl: user.equippedFrameUrl,
            equippedFrameClass: user.equippedFrameClass,
            profileCover: user.profileCover,
            coins: user.coins || 0,
            xu: user.xu || 0,
            xp: user.xp || 0,
            inventory: user.inventory || { frames: [], banners: [] },
            ownedFrames: user.ownedFrames || [],
            ownedBanners: user.ownedBanners || [],
            transactions: user.transactions || [],
            subscription: user.subscription,
            favorites: user.favorites,
            watchHistory: user.watchHistory,
            watchProgress: user.watchProgress || {},
            playlists: user.playlists
        }
    });
};
