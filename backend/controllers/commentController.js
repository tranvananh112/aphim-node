const Comment = require('../models/Comment');
const Movie = require('../models/Movie');
const socketUtil = require('../utils/socket');
const User = require('../models/User');

// @desc    Add a comment to a movie
// @route   POST /api/comments
// @access  Private
exports.addComment = async (req, res) => {
    try {
        const { movieId, movieSlug, movieName, content, avatar, parentId } = req.body;

        if (!movieId || !movieSlug || !content) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp đủ thông tin phim và nội dung bình luận'
            });
        }

        // Apply dynamic avatar change directly to User's profile if selected in comment box
        if (avatar) {
            await User.findByIdAndUpdate(req.user.id, { avatar: avatar });
        }

        // Handle case where frontend passes slug instead of ObjectId for movieId
        let validMovieId = null;
        let movie = null;
        const mongoose = require('mongoose');
        if (movieId && mongoose.Types.ObjectId.isValid(movieId) && movieId !== movieSlug) {
             validMovieId = movieId;
             // Optional: still find movie for name
             movie = await Movie.findById(movieId);
        } else {
             movie = await Movie.findOne({ slug: movieSlug });
             if (movie) {
                 validMovieId = movie._id;
             }
        }

        const comment = await Comment.create({
            user: req.user.id,
            movie: validMovieId,
            movieSlug: movieSlug,
            movieName: movieName || '',
            content: content,
            parent: parentId || null,
            isApproved: true // Auto approve comments for now
        });

        // Emit realtime activity
        socketUtil.emitEvent('new_activity', {
            type: 'comment',
            icon: 'message-square',
            color: 'amber',
            message: `Bình luận mới trên <strong>${movie ? movie.name : movieName}</strong>: "${content}"`,
            time: new Date(),
            user: { name: req.user.name }
        });

        // Populate user details so frontend can display immediately
        await comment.populate('user', 'name email avatar avatarUrl equippedFrameClass equippedFrameUrl');

        res.status(201).json({
            success: true,
            data: comment
        });
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// @desc    Get comments for a specific movie (Public API)
// @route   GET /api/comments/movie/:movieSlug
// @access  Public
exports.getMovieComments = async (req, res) => {
    try {
        const { movieSlug } = req.params;
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 20;
        const startIndex = (page - 1) * limit;

        const query = { movieSlug: movieSlug, isApproved: true };

        const total = await Comment.countDocuments(query);
        const comments = await Comment.find(query)
            .populate('user', 'name email avatar avatarUrl equippedFrameClass equippedFrameUrl')
            .sort({ createdAt: -1 })
            .skip(startIndex)
            .limit(limit);

        res.json({
            success: true,
            count: comments.length,
            total,
            pagination: {
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            },
            data: comments
        });
    } catch (error) {
        console.error('Error getting movie comments:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// @desc    Get all comments (Admin API)
// @route   GET /api/comments/admin
// @access  Private/Admin
exports.getAdminComments = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 20;
        const startIndex = (page - 1) * limit;
        const status = req.query.status; // 'approved', 'pending', 'hidden'
        const search = req.query.search;

        let query = {};

        if (status === 'approved') query.isApproved = true;
        if (status === 'hidden') query.isApproved = false;
        // if pending is required we could use another field like isReviewed but let's stick to true/false

        if (search) {
            query.content = { $regex: search, $options: 'i' };
        }

        const totalComments = await Comment.countDocuments();
        const approvedComments = await Comment.countDocuments({ isApproved: true });
        const hiddenComments = await Comment.countDocuments({ isApproved: false });

        const totalFiltered = await Comment.countDocuments(query);
        
        const comments = await Comment.find(query)
            .populate('user', 'name email')
            .populate('movie', 'title name') 
            .sort({ createdAt: -1 })
            .skip(startIndex)
            .limit(limit);

        res.json({
            success: true,
            stats: {
                total: totalComments,
                approved: approvedComments,
                pending: 0, // Mock pending since we auto approve
                hidden: hiddenComments
            },
            total: totalFiltered,
            pagination: {
                page,
                limit,
                totalPages: Math.ceil(totalFiltered / limit)
            },
            data: comments
        });
    } catch (error) {
        console.error('Error getting admin comments:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// @desc    Update comment status
// @route   PUT /api/comments/:id/status
// @access  Private/Admin
exports.updateCommentStatus = async (req, res) => {
    try {
        const { isApproved } = req.body;
        
        const comment = await Comment.findByIdAndUpdate(
            req.params.id, 
            { isApproved }, 
            { new: true, runValidators: true }
        );

        if (!comment) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy bình luận' });
        }

        res.json({ success: true, data: comment });
    } catch (error) {
        console.error('Error updating comment status:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// @desc    Delete comment
// @route   DELETE /api/comments/:id
// @access  Private/Admin
exports.deleteComment = async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.id);

        if (!comment) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy bình luận' });
        }

        await comment.remove();

        res.json({ success: true, message: 'Đã xóa bình luận' });
    } catch (error) {
        console.error('Error deleting comment:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};
