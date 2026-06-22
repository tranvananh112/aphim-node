require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const checkAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const admin = await User.findOne({ email: 'admin@cinestream.vn' }).select('+password');

        if (!admin) {
            console.log('❌ Admin not found!');
        } else {
            console.log('✅ Admin found:');
            console.log('  Email:', admin.email);
            console.log('  Role:', admin.role);
            console.log('  Password hash:', admin.password.substring(0, 20) + '...');
            console.log('  Is Blocked:', admin.isBlocked);

            // Test password
            const testPassword = 'admin123';
            const isMatch = await admin.matchPassword(testPassword);
            console.log(`  Password "${testPassword}" matches:`, isMatch);
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

checkAdmin();
