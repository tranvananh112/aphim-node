const mongoose = require('mongoose');

const ChatMessageSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    user: {
        type: String,
        required: true
    },
    avatar: {
        type: String,
        default: '/apple-touch-icon.png'
    },
    chatRole: {
        type: String,
        default: 'user'
    },
    frame: {
        type: String,
        default: ''
    },
    text: {
        type: String,
        required: true
    },
    tab: {
        type: String,
        enum: ['general', 'movies', 'support'],
        default: 'general'
    },
    firebaseId: {
        type: String,
        required: true
    },
    reactions: {
        type: Map,
        of: {
            uids: [String],
            avatars: [String],
            names: [String]
        },
        default: {}
    },
    isPinned: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('ChatMessage', ChatMessageSchema);

