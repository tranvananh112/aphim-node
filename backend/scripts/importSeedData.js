require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const seedData = {
    users: [
        {
            name: 'Admin CineStream',
            email: 'admin@cinestream.vn',
            password: 'admin123',
            role: 'admin',
            subscription: {
                plan: 'FAMILY',
                startDate: new Date(),
                expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
            }
        },
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
            subscription: {
                plan: 'PREMIUM',
                startDate: new Date(),
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            }
        }
    ]
};

const importData = async () => {
    try {
        // Support both MONGO_URI and MONGODB_URI
        const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

        if (!mongoUri) {
            console.error('❌ MongoDB URI not found in .env file');
            console.log('Please set MONGO_URI or MONGODB_URI in your .env file');
            process.exit(1);
        }

        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');

        // Import users
        console.log('\n📥 Importing users...');
        for (const userData of seedData.users) {
            const exists = await User.findOne({ email: userData.email });
            if (!exists) {
                await User.create(userData);
                console.log(`✅ Created user: ${userData.email} (${userData.name})`);
            } else {
                console.log(`⚠️  User already exists: ${userData.email}`);
            }
        }

        console.log('\n✅ Import completed successfully!');
        console.log('\n📋 Test accounts:');
        console.log('   Admin: admin@cinestream.vn / admin123');
        console.log('   User1: user1@example.com / 123456');
        console.log('   User2: user2@example.com / 123456');

        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Import failed:', error.message);
        process.exit(1);
    }
};

importData();


