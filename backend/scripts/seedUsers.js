require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const seedUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Sample users
        const users = [
            {
                name: 'Nguyễn Văn A',
                email: 'user1@example.com',
                password: '123456',
                subscription: { plan: 'FREE' }
            },
            {
                name: 'Trần Thị B',
                email: 'user2@example.com',
                password: '123456',
                subscription: { plan: 'PREMIUM', startDate: new Date(), expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
            },
            {
                name: 'Lê Văn C',
                email: 'user3@example.com',
                password: '123456',
                subscription: { plan: 'PREMIUM', startDate: new Date(), expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) }
            },
            {
                name: 'Phạm Thị D',
                email: 'user4@example.com',
                password: '123456',
                subscription: { plan: 'FREE' }
            },
            {
                name: 'Hoàng Văn E',
                email: 'user5@example.com',
                password: '123456',
                subscription: { plan: 'FAMILY', startDate: new Date(), expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
            }
        ];

        for (const userData of users) {
            const exists = await User.findOne({ email: userData.email });
            if (!exists) {
                await User.create(userData);
                console.log(`✅ Created user: ${userData.email}`);
            } else {
                console.log(`⚠️  User already exists: ${userData.email}`);
            }
        }

        console.log('\n✅ Seed completed!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

seedUsers();
