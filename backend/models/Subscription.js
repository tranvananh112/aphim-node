const mongoose = require('mongoose');

const SubscriptionSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    slug: {
        type: String,
        required: true,
        unique: true
    },
    description: String,
    price: {
        type: Number,
        required: true
    },
    duration: {
        value: {
            type: Number,
            required: true
        },
        unit: {
            type: String,
            enum: ['day', 'month', 'year'],
            default: 'month'
        }
    },
    features: [{
        name: String,
        enabled: {
            type: Boolean,
            default: true
        }
    }],
    limits: {
        maxDevices: {
            type: Number,
            default: 1
        },
        maxQuality: {
            type: String,
            enum: ['SD', 'HD', 'FHD', '4K'],
            default: 'HD'
        },
        downloadAllowed: {
            type: Boolean,
            default: false
        },
        adsEnabled: {
            type: Boolean,
            default: true
        }
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isPopular: {
        type: Boolean,
        default: false
    },
    displayOrder: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Subscription', SubscriptionSchema);
