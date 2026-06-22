const mongoose = require('mongoose');

const supporterSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    message: {
        type: String,
        trim: true,
        maxlength: 200
    },
    status: {
        type: String,
        enum: ['pending', 'verified', 'rejected'],
        default: 'pending'
    },
    verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    verifiedAt: {
        type: Date
    },
    notes: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

// Index for faster queries
supporterSchema.index({ createdAt: -1 });
supporterSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Supporter', supporterSchema);
