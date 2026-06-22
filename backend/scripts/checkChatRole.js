/**
 * CHECK CHAT ROLE SCRIPT
 * Kiểm tra chatRole của user trong MongoDB
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function checkChatRole() {
    try {
        // Connect to MongoDB
        const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
        if (!mongoUri) {
            console.error('❌ MONGODB_URI or MONGO_URI not found in .env file');
            process.exit(1);
        }

        await mongoose.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        console.log('✅ Connected to MongoDB');

        // Get user ID from command line argument
        const userId = process.argv[2];

        if (!userId) {
            console.log('\n📋 USAGE: node checkChatRole.js <USER_ID>');
            console.log('📋 OR: node checkChatRole.js all (to check all users)\n');

            // Show sample users
            const sampleUsers = await User.find().limit(5).select('name email chatRole isChatBanned');
            console.log('📋 Sample users:');
            sampleUsers.forEach(u => {
                console.log(`   - ${u.name} (${u.email}) | ID: ${u._id}`);
            });

            process.exit(0);
        }

        if (userId === 'all') {
            // Check all users
            const users = await User.find().select('name email chatRole isChatBanned role');

            console.log(`\n📊 TOTAL USERS: ${users.length}\n`);

            const adminUsers = users.filter(u => u.chatRole === 'admin');
            const bannedUsers = users.filter(u => u.isChatBanned);

            console.log(`👑 CHAT ADMINS: ${adminUsers.length}`);
            adminUsers.forEach(u => {
                console.log(`   - ${u.name} (${u.email})`);
            });

            console.log(`\n🚫 BANNED USERS: ${bannedUsers.length}`);
            bannedUsers.forEach(u => {
                console.log(`   - ${u.name} (${u.email})`);
            });

            console.log(`\n👤 REGULAR USERS: ${users.length - adminUsers.length - bannedUsers.length}`);

        } else {
            // Check specific user
            const user = await User.findById(userId).select('name email chatRole isChatBanned role avatar');

            if (!user) {
                console.log(`❌ User not found: ${userId}`);
                process.exit(1);
            }

            console.log('\n📋 USER INFO:');
            console.log(`   Name: ${user.name}`);
            console.log(`   Email: ${user.email}`);
            console.log(`   System Role: ${user.role}`);
            console.log(`   Chat Role: ${user.chatRole}`);
            console.log(`   Chat Banned: ${user.isChatBanned}`);
            console.log(`   Avatar: ${user.avatar || 'None'}`);
            console.log(`   ID: ${user._id}`);

            // Check if badge should display
            const shouldShowBadge = user.chatRole === 'admin' || user.role === 'admin';
            console.log(`\n🎯 Badge "(admin)" should display: ${shouldShowBadge ? '✅ YES' : '❌ NO'}`);

            if (shouldShowBadge) {
                console.log('   Badge color: #fbbf24 (yellow)');
                console.log('   Badge text: (admin)');
                console.log('   Font size: 10px');
                console.log('   Font weight: 700');
            }
        }

        console.log('\n✅ Check completed\n');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkChatRole();
