const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    subscription: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subscription',
        required: true
    },
    transactionId: {
        type: String,
        unique: true,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'VND'
    },
    paymentMethod: {
        type: String,
        enum: ['momo', 'vnpay', 'zalopay', 'banking', 'card', 'paypal'],
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refunded', 'cancelled'],
        default: 'pending'
    },
    paymentGatewayResponse: {
        type: mongoose.Schema.Types.Mixed
    },
    description: String,
    paidAt: Date,
    refundedAt: Date,
    refundReason: String
}, {
    timestamps: true
});

// Indexes
PaymentSchema.index({ user: 1, createdAt: -1 });
PaymentSchema.index({ transactionId: 1 });
PaymentSchema.index({ status: 1 });

module.exports = mongoose.model('Payment', PaymentSchema);
