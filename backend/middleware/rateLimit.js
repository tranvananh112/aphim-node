const rateLimit = require('express-rate-limit');

// General API rate limiter
exports.apiLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000, // Increased to 1000 for Admin Dashboard support
    message: {
        success: false,
        message: 'Quá nhiều yêu cầu từ IP này, vui lòng thử lại sau'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Strict rate limiter for auth routes (DISABLED FOR TESTING)
exports.authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Increased to 1000 for testing
    message: {
        success: false,
        message: 'Quá nhiều lần đăng nhập thất bại, vui lòng thử lại sau 15 phút'
    },
    skipSuccessfulRequests: true
});

// Payment rate limiter
exports.paymentLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // limit each IP to 10 payment requests per hour
    message: {
        success: false,
        message: 'Quá nhiều yêu cầu thanh toán, vui lòng thử lại sau'
    }
});
