require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const { apiLimiter } = require('./middleware/rateLimit');
const socketUtil = require('./utils/socket');

// Connect to database
connectDB();

const app = express();

// Trust proxy - Required when deployed behind Railway/Nginx/reverse proxy
// Fixes ERR_ERL_UNEXPECTED_X_FORWARDED_FOR from express-rate-limit
app.set('trust proxy', 1);

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable CORS
const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://aphim.ddns.net',
    'https://aphim.io.vn', // Production domain
    'http://aphim.io.vn',  // HTTP version
    process.env.CLIENT_URL,
    process.env.CORS_ORIGIN
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        // Dynamically allow the requesting origin to fix CORS issues
        callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
// Exempt high-frequency & critical routes from rate limiting
const rateLimitExemptPaths = [
    '/movies/hidden/list',  // polled by all clients
    '/settings/public',     // loaded on every page
    '/settings/payment-public', // loaded on pricing page
    '/health',              // health checks
];
const adminPrefixes = [
    '/dashboard', '/admin', '/users', '/payments', '/settings', '/comments', '/auth'
];

app.use('/api/', (req, res, next) => {
    // Exempt admin & core operational routes from rate limiting entirely
    if (adminPrefixes.some(prefix => req.path.startsWith(prefix))) return next();
    // Exempt specific public high-frequency endpoints
    if (rateLimitExemptPaths.some(p => req.path === p || req.path.startsWith(p))) return next();
    return apiLimiter(req, res, next);
});

// Routes
// API Health Check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date(),
        version: '1.2.1',
        realtime: socketUtil.isInitialized()
    });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/dashboard', require('./routes/dashboard')); // Admin Dashboard stats
app.use('/api/movies', require('./routes/movies')); // Use MongoDB version
app.use('/api/ratings', require('./routes/ratings'));
app.use('/api/comments', require('./routes/comments'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/users', require('./routes/users'));
app.use('/api/supporters', require('./routes/supporters'));
app.use('/api/banners', require('./routes/banners'));
app.use('/api/adult', require('./routes/adultContent')); // Adult content proxy
app.use('/api/phimx-proxy', require('./routes/phimXProxy')); // Phim X Proxy to bypass ISP blocking
app.use('/api/partner', require('./routes/partner')); // Partner DT99 session tracking
app.use('/api/settings', require('./routes/settings')); // System settings
app.use('/api/notifications', require('./routes/notifications')); // Persistent notifications
app.use('/api/chat', require('./routes/chat')); // Chat history & moderation

// Health check
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

// Welcome route
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Welcome to CineStream API',
        version: '1.0.0',
        endpoints: {
            auth: '/api/auth',
            movies: '/api/movies',
            ratings: '/api/ratings',
            comments: '/api/comments',
            payments: '/api/payments',
            users: '/api/users',
            supporters: '/api/supporters',
            adult: '/api/adult'
        }
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || 'Server Error'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

const PORT = process.env.PORT || 5000;
const http = require('http');

const httpServer = http.createServer(app);

// Initialize Socket.io
socketUtil.init(httpServer, {
    origin: allowedOrigins,
    methods: ["GET", "POST"]
});

httpServer.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🎬 CineStream Backend API & Realtime                   ║
║                                                           ║
║   🌐 Server: http://localhost:${PORT}                     ║
║   📊 Realtime: Socket.io Enabled                         ║
║   💾 Database: MongoDB Connected                         ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
    `);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
    console.log(`❌ Error: ${err.message}`);
    if (httpServer) httpServer.close(() => process.exit(1));
    else process.exit(1);
});

module.exports = app;
