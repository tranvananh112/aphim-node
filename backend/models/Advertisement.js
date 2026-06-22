const mongoose = require('mongoose');

const AdvertisementSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['pre-roll', 'mid-roll', 'post-roll', 'banner', 'popup'],
        required: true
    },
    videoUrl: String,
    imageUrl: String,
    clickUrl: String,
    duration: {
        type: Number,
        default: 0
    },
    skipAfter: {
        type: Number,
        default: 5
    },
    targetAudience: {
        subscriptionTypes: [{
            type: String,
            enum: ['FREE', 'PREMIUM', 'FAMILY']
        }],
        countries: [String]
    },
    isActive: {
        type: Boolean,
        default: true
    },
    startDate: Date,
    endDate: Date,
    impressions: {
        type: Number,
        default: 0
    },
    clicks: {
        type: Number,
        default: 0
    },
    budget: {
        total: Number,
        spent: {
            type: Number,
            default: 0
        }
    }
}, {
    timestamps: true
});

// Calculate CTR (Click Through Rate)
AdvertisementSchema.methods.getCTR = function () {
    if (this.impressions === 0) return 0;
    return ((this.clicks / this.impressions) * 100).toFixed(2);
};

module.exports = mongoose.model('Advertisement', AdvertisementSchema);
