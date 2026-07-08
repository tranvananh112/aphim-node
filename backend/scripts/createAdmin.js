require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const createAdmin = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Check if admin exists
        const adminExists = await User.findOne({ email: process.env.ADMIN_EMAIL });

        if (adminExists) {
            console.log('⚠️  Admin already exists:', adminExists.email);

            // Update to admin role if not already
            if (adminExists.role !== 'admin') {
                adminExists.role = 'admin';
                await adminExists.save();
                console.log('✅ Updated user to admin role');
            }
        } else {
            // Create new admin
            const admin = await User.create({
                name: 'Admin Master',
                email: process.env.ADMIN_EMAIL || 'admin@cinestream.vn',
                password: process.env.ADMIN_PASSWORD || 'admin123',
                role: 'admin',
                subscription: {
                    plan: 'PREMIUM',
                    startDate: new Date(),
                    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
                }
            });

            console.log('✅ Admin created successfully!');
            console.log('📧 Email:', admin.email);
            console.log('🔑 Password:', process.env.ADMIN_PASSWORD || 'admin123');
            console.log('⚠️  Please change the password after first login!');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

createAdmin();


