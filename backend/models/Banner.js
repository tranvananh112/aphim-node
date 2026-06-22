const mongoose = require('mongoose');

const BannerSchema = new mongoose.Schema({
    // Movie info from Ophim API
    movieSlug: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    originName: String,
    thumbUrl: String,
    posterUrl: String,
    content: String,
    year: Number,
    quality: String,
    lang: String,
    episodeCurrent: String,

    // Categories
    category: [{
        name: String,
        slug: String
    }],

    // TMDB/IMDB ratings
    tmdb: {
        type: mongoose.Schema.Types.Mixed
    },
    imdb: {
        type: mongoose.Schema.Types.Mixed
    },

    // Banner settings
    isActive: {
        type: Boolean,
        default: false
    },
    priority: {
        type: Number,
        default: 0 // Higher number = higher priority
    },

    // Source info
    sourceApi: {
        type: String,
        default: 'ophim'
    },
    sourcePage: Number, // Which page from API

    // Admin info
    addedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Indexes
BannerSchema.index({ movieSlug: 1 });
BannerSchema.index({ isActive: 1, priority: -1 });
BannerSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Banner', BannerSchema);
