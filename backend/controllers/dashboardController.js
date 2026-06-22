const User = require('../models/User');
const Movie = require('../models/Movie');
const Payment = require('../models/Payment');
const Comment = require('../models/Comment');
const ViewHistory = require('../models/ViewHistory');
const ophimService = require('../services/ophimService');

// @desc    Get complete dashboard stats
// @route   GET /api/dashboard/stats
// @access  Private/Admin
exports.getDashboardStats = async (req, res) => {
    try {
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const firstDayOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastDayOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

        // 1. Overview Totals
        const totalUsers = await User.countDocuments();
        
        // Count both regular movies and hidden movies
        const regularMoviesCount = await Movie.countDocuments();
        const HiddenMovie = require('../models/HiddenMovie');
        const hiddenMoviesCount = await HiddenMovie.countDocuments();
        const totalMovies = regularMoviesCount + hiddenMoviesCount;
        
        const viewsAgg = await Movie.aggregate([
            { $group: { _id: null, totalViews: { $sum: '$view' } } }
        ]);
        const totalViews = viewsAgg.length > 0 ? viewsAgg[0].totalViews : 0;

        const revenueAgg = await Payment.aggregate([
            { $match: { status: 'completed' } },
            { $group: { _id: null, totalRevenue: { $sum: '$amount' } } }
        ]);
        const totalRevenue = revenueAgg.length > 0 ? revenueAgg[0].totalRevenue : 0;
        
        // 1.0.1 Real-time Membership counts
        const premiumCount = await User.countDocuments({ 'subscription.plan': 'PREMIUM', 'subscription.status': 'active' });
        const familyCount = await User.countDocuments({ 'subscription.plan': 'FAMILY', 'subscription.status': 'active' });
        const freeCount = await User.countDocuments({ $or: [{ 'subscription.plan': 'FREE' }, { 'subscription.plan': { $exists: false } }, { 'subscription.status': 'inactive' }] });
        
        // 1.1 Calculate Total Spent Xu (Coins)
        const spentXuAgg = await User.aggregate([
            { $unwind: '$transactions' },
            { $match: { 'transactions.type': 'spend' } },
            { $group: { _id: null, totalSpent: { $sum: '$transactions.amount' } } }
        ]);
        const totalSpentXu = spentXuAgg.length > 0 ? Math.abs(spentXuAgg[0].totalSpent) : 0;

        // 1.2 Top Spending Categories
        const topSpendingAgg = await User.aggregate([
            { $unwind: '$transactions' },
            { $match: { 'transactions.type': 'spend' } },
            { $group: { 
                _id: '$transactions.title', 
                total: { $sum: '$transactions.amount' },
                count: { $sum: 1 }
            } },
            { $sort: { total: 1 } }, // Spent amount is negative
            { $limit: 5 }
        ]);
        const topSpending = topSpendingAgg.map(x => ({ name: x._id || 'Khác', value: Math.abs(x.total), count: x.count }));

        // 2. Growth Calculations (Current Month vs Previous Month)
        const prevUsers = await User.countDocuments({ createdAt: { $lt: firstDayOfMonth } });
        const currentMonthUsers = totalUsers - prevUsers;
        const lastMonthUsers = await User.countDocuments({ 
            createdAt: { $gte: firstDayOfPrevMonth, $lte: lastDayOfPrevMonth } 
        });
        const usersGrowth = lastMonthUsers === 0 ? 100 : Math.round(((currentMonthUsers - lastMonthUsers) / lastMonthUsers) * 100);

        const currentMonthRevenueAgg = await Payment.aggregate([
            { $match: { status: 'completed', createdAt: { $gte: firstDayOfMonth } } },
            { $group: { _id: null, amount: { $sum: '$amount' } } }
        ]);
        const currentMonthRevenue = currentMonthRevenueAgg[0]?.amount || 0;
        
        const lastMonthRevenueAgg = await Payment.aggregate([
            { $match: { status: 'completed', createdAt: { $gte: firstDayOfPrevMonth, $lte: lastDayOfPrevMonth } } },
            { $group: { _id: null, amount: { $sum: '$amount' } } }
        ]);
        const lastMonthRevenue = lastMonthRevenueAgg[0]?.amount || 0;
        const revenueGrowth = lastMonthRevenue === 0 ? (currentMonthRevenue > 0 ? 100 : 0) : Math.round(((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100);

        // 4. Charts Data (Last 7 Days Views)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const viewsByDayAgg = await ViewHistory.aggregate([
            { $match: { lastWatchedAt: { $gte: sevenDaysAgo } } },
            { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$lastWatchedAt" } }, views: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);

        const last7DaysLabels = [];
        const last7DaysData = [];
        const daysMap = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
        for (let i = 0; i < 7; i++) {
            const d = new Date(sevenDaysAgo);
            d.setDate(d.getDate() + i);
            const dateString = d.toISOString().split('T')[0];
            const foundDay = viewsByDayAgg.find(x => x._id === dateString);
            last7DaysLabels.push(daysMap[d.getDay()]);
            last7DaysData.push(foundDay ? foundDay.views : 0);
        }

        // 5. Recent Activities
        const recentUsers = await User.find().sort({ createdAt: -1 }).limit(8).lean();
        const recentComments = await Comment.find().sort({ createdAt: -1 }).populate('user', 'name profileImage').populate('movie', 'name').limit(8).lean();
        const recentPayments = await Payment.find({ status: 'completed' }).sort({ createdAt: -1 }).populate('user', 'name').limit(5).lean();

        let activities = [];
        recentUsers.forEach(u => activities.push({
            type: 'user', icon: 'user-plus', color: 'info',
            message: `Người dùng mới: <strong>${u.name}</strong> vừa tham gia hệ thống`,
            time: u.createdAt, user: { name: u.name, email: u.email }
        }));
        recentComments.forEach(c => activities.push({
            type: 'comment', icon: 'message-square', color: 'warning',
            message: `Bình luận mới trên <strong>${c.movie?.name || 'Phim'}</strong>: "${c.content}"`,
            time: c.createdAt, user: { name: c.user?.name || 'Khách' }
        }));
        recentPayments.forEach(p => activities.push({
            type: 'payment', icon: 'banknote', color: 'success',
            message: `Thanh toán thành công: +${new Intl.NumberFormat('vi-VN').format(p.amount)}đ từ ${p.user?.name || 'Khách'}`,
            time: p.createdAt
        }));

        activities.sort((a, b) => new Date(b.time) - new Date(a.time));
        activities = activities.slice(0, 15);

        // 3. Global Stats from External APIs
        let globalMovieCount = 0;
        let adultMovieCount = 0;
        
        try {
            console.log(`🌐 Fetching Global Stats from: ${process.env.OPHIM_API_URL || 'https://ophim1.com'}`);
            const ophimData = await ophimService.fetchMovieList(1);
            
            // Comprehensive parsing for different API structures
            globalMovieCount = 
                ophimData?.pagination?.totalItems || 
                ophimData?.data?.params?.pagination?.totalItems || 
                (ophimData?.data?.items?.length ? ophimData.data.items.length * (ophimData.pagination?.totalPages || 1) : 0);
            
            // Optional: Fetch Adult Movie Count (Eporner)
            try {
                const axios = require('axios');
                const epornerResp = await axios.get('https://www.eporner.com/api/v2/video/search/?query=hot&per_page=1&format=json', { timeout: 3000 });
                adultMovieCount = epornerResp.data?.total_count || 0;
            } catch (err) {
                console.warn('⚠️ Could not fetch Adult movie count:', err.message);
            }

            // --- GRAND TOTAL AGGREGATION ---
            // Sum of everything available on the system
            const grandTotalMovies = regularMoviesCount + hiddenMoviesCount + globalMovieCount + adultMovieCount;
            
            console.log(`📊 Dashboard Stats updated: Total: ${grandTotalMovies} (Reg: ${regularMoviesCount}, Hidden: ${hiddenMoviesCount}, Ophim: ${globalMovieCount}, Adult: ${adultMovieCount})`);
            
            // Override totalMovies for the main card ("Phim trên hệ thống")
            const displayTotalMovies = grandTotalMovies;
            
            return res.json({
                success: true,
                data: {
                    overview: {
                        totalUsers,
                        totalMovies: displayTotalMovies, // Aggregate total
                        globalMovieCount, // Still show separate for Ophim card
                        totalViews,
                        totalRevenue,
                        membership: {
                            premium: premiumCount,
                            family: familyCount,
                            free: freeCount
                        },
                        growth: {
                            users: usersGrowth,
                            revenue: revenueGrowth,
                            movies: 0,
                            views: 0,
                            spentXu: totalSpentXu
                        },
                        topSpending
                    },
                    charts: {
                        views: { labels: last7DaysLabels, data: last7DaysData },
                        revenue: { 
                            labels: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'],
                            data: new Array(12).fill(0)
                        }
                    },
                    recentActivities: activities
                }
            });
            
        } catch (e) { 
            console.error('❌ Stats Connectivity Error:', e.message);
            globalMovieCount = 0;
        }
    } catch (error) {
        console.error('getDashboardStats Error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};
