const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['info', 'success', 'warning', 'error', 'promotion', 'system'],
        default: 'info'
    },
    category: {
        type: String,
        enum: ['movie', 'subscription', 'payment', 'account', 'system'],
        default: 'system'
    },
    relatedMovie: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Movie'
    },
    actionUrl: String,
    isRead: {
        type: Boolean,
        default: false
    },
    isBroadcast: {
        type: Boolean,
        default: false
    },
    readAt: Date
}, {
    timestamps: true
});

// Indexes
NotificationSchema.index({ user: 1, createdAt: -1 });
NotificationSchema.index({ isRead: 1 });

module.exports = mongoose.model('Notification', NotificationSchema);
