/**
 * Script: Add chatRole and isChatBanned fields to all users
 * Run: node backend/scripts/addChatFields.js
 */

require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const User = require('../models/User');

const addChatFields = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        console.log('✅ MongoDB Connected');

        // Update all users: add chatRole and isChatBanned if not exists
        const result = await User.updateMany(
            {}, // All users
            {
                $set: {
                    chatRole: 'user',
                    isChatBanned: false
                }
            },
            {
                upsert: false,
                strict: false // Allow fields not in schema (in case schema not updated yet)
            }
        );

        console.log(`✅ Updated ${result.modifiedCount} users`);
        console.log(`   Total users: ${result.matchedCount}`);

        // Verify: Show sample users
        const sampleUsers = await User.find().limit(5).select('name email chatRole isChatBanned');
        console.log('\n📋 Sample users after update:');
        sampleUsers.forEach(u => {
            console.log(`   - ${u.name}: chatRole=${u.chatRole || 'undefined'}, isChatBanned=${u.isChatBanned || 'undefined'}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

addChatFields();
