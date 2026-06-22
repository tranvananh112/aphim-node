const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Vui lòng nhập tên'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Vui lòng nhập email'],
        unique: true,
        lowercase: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Email không hợp lệ']
    },
    phone: {
        type: String,
        default: ''
    },
    password: {
        type: String,
        required: [true, 'Vui lòng nhập mật khẩu'],
        minlength: 6,
        select: false
    },
    avatar: {
        type: String,
        default: ''
    },
    equippedFrame: {
        type: String,
        default: 'none'
    },
    equippedFrameUrl: {
        type: String,
        default: ''
    },
    equippedFrameClass: {
        type: String,
        default: ''
    },
    profileCover: {
        type: String,
        default: ''
    },
    coins: {
        type: Number,
        default: 0
    },
    xu: {
        type: Number,
        default: 0
    },
    xp: {
        type: Number,
        default: 0
    },
    transactions: [{
        title: String,
        amount: Number,
        type: { type: String, enum: ['spend', 'earn', 'admin', 'recharge', 'bonus'] },
        date: { type: Date, default: Date.now }
    }],
    inventory: {
        frames: {
            type: [String],
            default: []
        },
        banners: {
            type: [String],
            default: []
        }
    },
    ownedFrames: {
        type: [String],
        default: []
    },
    ownedBanners: {
        type: [String],
        default: []
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    chatRole: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    isChatBanned: {
        type: Boolean,
        default: false
    },
    subscription: {
        plan: {
            type: String,
            enum: ['FREE', 'PREMIUM', 'FAMILY'],
            default: 'FREE'
        },
        startDate: Date,
        endDate: Date,       // primary field used by frontend
        expiresAt: Date,     // legacy alias kept for backward compat
        status: {
            type: String,
            enum: ['active', 'inactive', 'expired'],
            default: 'inactive'
        },
        autoRenew: {
            type: Boolean,
            default: false
        }
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    lastLogin: Date,
    devices: [{
        deviceId: String,
        deviceName: String,
        lastActive: Date
    }],
    favorites: [{
        slug: String,
        name: String,
        thumb_url: String,
        year: Number,
        addedAt: Date
    }],
    watchHistory: [{
        slug: String,
        name: String,
        thumb_url: String,
        year: Number,
        episode: String,
        watchedAt: Date
    }],
    watchProgress: {
        type: Object,
        default: {}
    },
    playlists: [{
        id: String,
        name: String,
        description: String,
        movies: [{
            slug: String,
            name: String,
            thumb_url: String,
            year: Number,
            addedAt: Date
        }],
        createdAt: Date
    }]
}, {
    timestamps: true
});

// Encrypt password before saving
UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Match password
UserSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Generate JWT Token
UserSchema.methods.getSignedJwtToken = function (rememberMe = false) {
    const expiresIn = rememberMe
        ? (process.env.JWT_EXPIRE_REMEMBER_ME || '90d')
        : (process.env.JWT_EXPIRE || '30d');

    return jwt.sign(
        { id: this._id, role: this.role },
        process.env.JWT_SECRET,
        { expiresIn }
    );
};

// Check if subscription is active
UserSchema.methods.hasActiveSubscription = function () {
    if (this.subscription.plan === 'FREE') return true;
    if (!this.subscription.expiresAt) return false;
    return new Date() < new Date(this.subscription.expiresAt);
};

module.exports = mongoose.model('User', UserSchema);
