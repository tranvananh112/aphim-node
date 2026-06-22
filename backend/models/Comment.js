const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    movie: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Movie',
        required: false
    },
    movieSlug: {
        type: String,
        required: true
    },
    movieName: {
        type: String,
        default: ''
    },
    content: {
        type: String,
        required: [true, 'Vui lòng nhập nội dung bình luận'],
        maxlength: [1000, 'Bình luận không được quá 1000 ký tự']
    },
    rating: {
        type: Number,
        min: 1,
        max: 5
    },
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    replies: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        content: String,
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    isApproved: {
        type: Boolean,
        default: true
    },
    parent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment',
        default: null
    },
    isReported: {
        type: Boolean,
        default: false
    },
    reportCount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Indexes
CommentSchema.index({ movie: 1, createdAt: -1 });
CommentSchema.index({ user: 1 });
CommentSchema.index({ movieSlug: 1 });

module.exports = mongoose.model('Comment', CommentSchema);
