require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const resetAdminPassword = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Find admin
        const admin = await User.findOne({ email: process.env.ADMIN_EMAIL || 'admin@cinestream.vn' });

        if (!admin) {
            console.log('❌ Admin not found!');
            process.exit(1);
        }

        // Reset password
        admin.password = process.env.ADMIN_PASSWORD || 'admin123';
        admin.role = 'admin'; // Ensure admin role
        await admin.save();

        console.log('✅ Admin password reset successfully!');
        console.log('📧 Email:', admin.email);
        console.log('🔑 New Password:', process.env.ADMIN_PASSWORD || 'admin123');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

resetAdminPassword();
