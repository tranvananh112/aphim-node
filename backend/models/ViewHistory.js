const mongoose = require('mongoose');

const ViewHistorySchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    movie: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Movie',
        required: true
    },
    movieSlug: {
        type: String,
        required: true
    },
    episode: {
        name: String,
        slug: String
    },
    watchedDuration: {
        type: Number,
        default: 0
    },
    totalDuration: {
        type: Number,
        default: 0
    },
    progress: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    completed: {
        type: Boolean,
        default: false
    },
    lastWatchedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Indexes
ViewHistorySchema.index({ user: 1, lastWatchedAt: -1 });
ViewHistorySchema.index({ user: 1, movie: 1 }, { unique: true });

// Update progress percentage
ViewHistorySchema.methods.updateProgress = function () {
    if (this.totalDuration > 0) {
        this.progress = Math.round((this.watchedDuration / this.totalDuration) * 100);
        this.completed = this.progress >= 90;
    }
};

module.exports = mongoose.model('ViewHistory', ViewHistorySchema);
