const mongoose = require('mongoose');

const HiddenMovieSchema = new mongoose.Schema({
    slug: {
        type: String,
        required: true,
        unique: true
    },
    hiddenBy: {
        type: String,
        default: 'admin'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('HiddenMovie', HiddenMovieSchema);
