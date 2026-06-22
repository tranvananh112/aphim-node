// Simple Auth Controller - No MongoDB, using in-memory storage
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// In-memory user storage (for demo)
let users = [];

// Helper to generate JWT
const generateToken = (user) => {
    return jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET || 'demo-secret-key',
        { expiresIn: '7d' }
    );
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;

        // Check if user exists
        const userExists = users.find(u => u.email === email);
        if (userExists) {
            return res.status(400).json({
                success: false,
                message: 'Email đã được sử dụng'
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const user = {
            id: Date.now().toString(),
            name,
            email,
            password: hashedPassword,
            phone: phone || '',
            role: 'user',
            subscription: {
                plan: 'FREE'
            },
            createdAt: new Date().toISOString()
        };

        users.push(user);

        // Generate token
        const token = generateToken(user);

        res.status(201).json({
            success: true,
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                subscription: user.subscription
            }
        });
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
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập email và mật khẩu'
            });
        }

        // Find user
        const user = users.find(u => u.email === email);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Email hoặc mật khẩu không đúng'
            });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Email hoặc mật khẩu không đúng'
            });
        }

        // Generate token
        const token = generateToken(user);

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                subscription: user.subscription
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
    try {
        const user = users.find(u => u.id === req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Người dùng không tồn tại'
            });
        }

        res.json({
            success: true,
            data: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                subscription: user.subscription
            }
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
        const userIndex = users.findIndex(u => u.id === req.user.id);

        if (userIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Người dùng không tồn tại'
            });
        }

        // Update fields
        if (req.body.name !== undefined) users[userIndex].name = req.body.name;
        if (req.body.phone !== undefined) users[userIndex].phone = req.body.phone;
        if (req.body.avatar !== undefined) users[userIndex].avatar = req.body.avatar;
        if (req.body.coins !== undefined) users[userIndex].coins = req.body.coins;
        if (req.body.xu !== undefined) users[userIndex].xu = req.body.xu;
        if (req.body.xp !== undefined) users[userIndex].xp = req.body.xp;
        if (req.body.inventory !== undefined) users[userIndex].inventory = req.body.inventory;
        if (req.body.ownedFrames !== undefined) users[userIndex].ownedFrames = req.body.ownedFrames;
        if (req.body.ownedBanners !== undefined) users[userIndex].ownedBanners = req.body.ownedBanners;
        if (req.body.equippedFrame !== undefined) users[userIndex].equippedFrame = req.body.equippedFrame;
        if (req.body.equippedFrameUrl !== undefined) users[userIndex].equippedFrameUrl = req.body.equippedFrameUrl;
        if (req.body.equippedFrameClass !== undefined) users[userIndex].equippedFrameClass = req.body.equippedFrameClass;
        
        const updatedUser = users[userIndex];

        res.json({
            success: true,
            data: {
                id: users[userIndex].id,
                name: users[userIndex].name,
                email: users[userIndex].email,
                phone: users[userIndex].phone,
                role: users[userIndex].role,
                subscription: users[userIndex].subscription
            }
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
        const userIndex = users.findIndex(u => u.id === req.user.id);

        if (userIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Người dùng không tồn tại'
            });
        }

        // Check current password
        const isMatch = await bcrypt.compare(req.body.currentPassword, users[userIndex].password);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Mật khẩu hiện tại không đúng'
            });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        users[userIndex].password = await bcrypt.hash(req.body.newPassword, salt);

        // Generate new token
        const token = generateToken(users[userIndex]);

        res.json({
            success: true,
            token
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Placeholder functions
exports.forgotPassword = (req, res) => {
    res.json({
        success: true,
        message: 'Password reset email sent (demo mode)'
    });
};

exports.resetPassword = (req, res) => {
    res.json({
        success: true,
        message: 'Password reset successful (demo mode)'
    });
};

exports.logout = (req, res) => {
    res.json({
        success: true,
        message: 'Đăng xuất thành công'
    });
};
