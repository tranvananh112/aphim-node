const Supporter = require('../models/Supporter');

// Get recent supporters (public - for support page)
exports.getRecentSupporters = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;

        const supporters = await Supporter.find({ status: 'verified' })
            .sort({ createdAt: -1 })
            .limit(limit)
            .select('name amount message createdAt')
            .lean();

        res.json({
            success: true,
            supporters
        });
    } catch (error) {
        console.error('Error fetching recent supporters:', error);
        res.status(500).json({
            success: false,
            message: 'Không thể tải danh sách ủng hộ'
        });
    }
};

// Get all supporters (admin only)
exports.getAllSupporters = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const status = req.query.status;

        const query = {};
        if (status && ['pending', 'verified', 'rejected'].includes(status)) {
            query.status = status;
        }

        const skip = (page - 1) * limit;

        const [supporters, total] = await Promise.all([
            Supporter.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('verifiedBy', 'username email')
                .lean(),
            Supporter.countDocuments(query)
        ]);

        // Get statistics
        const stats = await Supporter.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$amount' }
                }
            }
        ]);

        const statistics = {
            total: 0,
            pending: 0,
            verified: 0,
            rejected: 0,
            totalAmount: 0
        };

        stats.forEach(stat => {
            statistics[stat._id] = stat.count;
            statistics.total += stat.count;
            if (stat._id === 'verified') {
                statistics.totalAmount = stat.totalAmount;
            }
        });

        res.json({
            success: true,
            supporters,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            },
            statistics
        });
    } catch (error) {
        console.error('Error fetching all supporters:', error);
        res.status(500).json({
            success: false,
            message: 'Không thể tải danh sách ủng hộ'
        });
    }
};

// Create new supporter (admin only)
exports.createSupporter = async (req, res) => {
    try {
        const { name, amount, message, status } = req.body;

        if (!name || !amount) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập đầy đủ thông tin'
            });
        }

        if (amount < 0) {
            return res.status(400).json({
                success: false,
                message: 'Số tiền không hợp lệ'
            });
        }

        const supporter = new Supporter({
            name,
            amount,
            message: message || '',
            status: status || 'verified',
            verifiedBy: req.user._id,
            verifiedAt: new Date()
        });

        await supporter.save();

        res.status(201).json({
            success: true,
            message: 'Đã thêm người ủng hộ',
            supporter
        });
    } catch (error) {
        console.error('Error creating supporter:', error);
        res.status(500).json({
            success: false,
            message: 'Không thể thêm người ủng hộ'
        });
    }
};

// Update supporter (admin only)
exports.updateSupporter = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, amount, message, status, notes } = req.body;

        const supporter = await Supporter.findById(id);

        if (!supporter) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy người ủng hộ'
            });
        }

        if (name) supporter.name = name;
        if (amount !== undefined) supporter.amount = amount;
        if (message !== undefined) supporter.message = message;
        if (notes !== undefined) supporter.notes = notes;

        if (status && ['pending', 'verified', 'rejected'].includes(status)) {
            supporter.status = status;
            if (status === 'verified' && !supporter.verifiedAt) {
                supporter.verifiedBy = req.user._id;
                supporter.verifiedAt = new Date();
            }
        }

        await supporter.save();

        res.json({
            success: true,
            message: 'Đã cập nhật thông tin',
            supporter
        });
    } catch (error) {
        console.error('Error updating supporter:', error);
        res.status(500).json({
            success: false,
            message: 'Không thể cập nhật thông tin'
        });
    }
};

// Delete supporter (admin only)
exports.deleteSupporter = async (req, res) => {
    try {
        const { id } = req.params;

        const supporter = await Supporter.findByIdAndDelete(id);

        if (!supporter) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy người ủng hộ'
            });
        }

        res.json({
            success: true,
            message: 'Đã xóa người ủng hộ'
        });
    } catch (error) {
        console.error('Error deleting supporter:', error);
        res.status(500).json({
            success: false,
            message: 'Không thể xóa người ủng hộ'
        });
    }
};

// Get supporter statistics (admin only)
exports.getStatistics = async (req, res) => {
    try {
        const stats = await Supporter.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$amount' }
                }
            }
        ]);

        const monthlyStats = await Supporter.aggregate([
            {
                $match: {
                    status: 'verified',
                    createdAt: {
                        $gte: new Date(new Date().setMonth(new Date().getMonth() - 6))
                    }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' }
                    },
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$amount' }
                }
            },
            {
                $sort: { '_id.year': 1, '_id.month': 1 }
            }
        ]);

        const statistics = {
            total: 0,
            pending: 0,
            verified: 0,
            rejected: 0,
            totalAmount: 0,
            verifiedAmount: 0
        };

        stats.forEach(stat => {
            statistics[stat._id] = stat.count;
            statistics.total += stat.count;
            statistics.totalAmount += stat.totalAmount;
            if (stat._id === 'verified') {
                statistics.verifiedAmount = stat.totalAmount;
            }
        });

        res.json({
            success: true,
            statistics,
            monthlyStats
        });
    } catch (error) {
        console.error('Error fetching statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Không thể tải thống kê'
        });
    }
};
