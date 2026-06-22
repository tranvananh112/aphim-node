const mongoose = require('mongoose');

const MovieSchema = new mongoose.Schema({
    // From Ophim API
    ophimId: {
        type: String,
        unique: true,
        sparse: true
    },
    slug: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    originName: String,
    content: String,
    type: {
        type: String,
        enum: ['single', 'series', 'hoathinh', 'tvshows'],
        default: 'single'
    },
    status: {
        type: String,
        enum: ['completed', 'ongoing', 'trailer'],
        default: 'ongoing'
    },
    thumbUrl: String,
    posterUrl: String,
    trailerUrl: String,
    time: String,
    episodeCurrent: String,
    episodeTotal: String,
    quality: String,
    lang: String,
    year: Number,
    view: {
        type: Number,
        default: 0
    },

    // Categories and Countries
    category: [{
        id: String,
        name: String,
        slug: String
    }],
    country: [{
        id: String,
        name: String,
        slug: String
    }],

    // Cast and Crew
    actor: [String],
    director: [String],

    // Episodes
    episodes: [{
        serverName: String,
        serverData: [{
            name: String,
            slug: String,
            filename: String,
            linkEmbed: String,
            linkM3u8: String
        }]
    }],

    // Ratings
    ratings: {
        average: {
            type: Number,
            default: 0
        },
        count: {
            type: Number,
            default: 0
        },
        tmdb: {
            voteAverage: Number,
            voteCount: Number
        },
        imdb: {
            voteAverage: Number,
            voteCount: Number
        }
    },

    // SEO
    seo: {
        title: String,
        description: String,
        keywords: [String]
    },

    // Admin fields
    isFeatured: {
        type: Boolean,
        default: false
    },
    isPublished: {
        type: Boolean,
        default: true
    },
    publishedAt: Date,

    // Sync info
    lastSyncedAt: Date,
    syncSource: {
        type: String,
        default: 'ophim'
    }
}, {
    timestamps: true
});

// Indexes for better query performance
MovieSchema.index({ slug: 1 });
MovieSchema.index({ name: 'text', originName: 'text' });
MovieSchema.index({ year: -1 });
MovieSchema.index({ 'ratings.average': -1 });
MovieSchema.index({ view: -1 });
MovieSchema.index({ createdAt: -1 });

// Increment view count
MovieSchema.methods.incrementView = async function () {
    this.view += 1;
    await this.save();
};

module.exports = mongoose.model('Movie', MovieSchema);
