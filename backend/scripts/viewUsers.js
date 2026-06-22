const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/cinestream', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const User = require('../models/User');

async function viewUsers() {
    try {
        console.log('📊 Danh sách tất cả users trong MongoDB:\n');

        const users = await User.find().select('-password');

        console.log(`Tổng số users: ${users.length}\n`);

        users.forEach((user, index) => {
            console.log(`${index + 1}. Email: ${user.email}`);
            console.log(`   Tên: ${user.name}`);
            console.log(`   Role: ${user.role}`);
            console.log(`   Ngày tạo: ${user.createdAt}`);
            console.log('---');
        });

        process.exit(0);
    } catch (error) {
        console.error('❌ Lỗi:', error);
        process.exit(1);
    }
}

viewUsers();
