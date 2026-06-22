/**
 * ADD MESSAGE MANUALLY TO MONGODB
 * Script này thêm tin nhắn thủ công vào MongoDB để test chức năng pin
 */

require('dotenv').config();
const mongoose = require('mongoose');
const ChatMessage = require('../models/ChatMessage');
const User = require('../models/User');

async function addMessage() {
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

        // Get command line arguments
        const firebaseId = process.argv[2];
        const text = process.argv[3] || 'Test message for pinning';
        const tab = process.argv[4] || 'general';

        if (!firebaseId) {
            console.log('\n📋 USAGE: node addMessageManually.js <FIREBASE_ID> [TEXT] [TAB]');
            console.log('📋 Example: node addMessageManually.js 97ol3w4U1bmPHwgUcX4D "Hello World" general\n');

            // Show existing messages
            const messages = await ChatMessage.find().limit(5).sort('-createdAt');
            console.log('📋 Recent messages in MongoDB:');
            messages.forEach(m => {
                console.log(`   - ${m.text.substring(0, 50)} | Firebase ID: ${m.firebaseId} | Tab: ${m.tab}`);
            });

            process.exit(0);
        }

        // Check if message already exists
        const existing = await ChatMessage.findOne({ firebaseId });
        if (existing) {
            console.log('⚠️  Message already exists in MongoDB:');
            console.log(`   Text: ${existing.text}`);
            console.log(`   User: ${existing.user}`);
            console.log(`   Tab: ${existing.tab}`);
            console.log(`   Firebase ID: ${existing.firebaseId}`);
            console.log(`   MongoDB ID: ${existing._id}`);
            console.log(`   isPinned: ${existing.isPinned}`);
            process.exit(0);
        }

        // Get first admin user
        const admin = await User.findOne({ $or: [{ role: 'admin' }, { chatRole: 'admin' }] });

        if (!admin) {
            console.log('❌ No admin user found. Please create an admin first.');
            process.exit(1);
        }

        // Create message
        const message = await ChatMessage.create({
            firebaseId,
            userId: admin._id,
            user: admin.name,
            avatar: admin.avatar || '/apple-touch-icon.png',
            chatRole: admin.chatRole || 'user',
            frame: admin.equippedFrameClass || '',
            text,
            tab,
            reactions: {},
            isPinned: false
        });

        console.log('\n✅ Message added successfully!');
        console.log(`   Text: ${message.text}`);
        console.log(`   User: ${message.user}`);
        console.log(`   Tab: ${message.tab}`);
        console.log(`   Firebase ID: ${message.firebaseId}`);
        console.log(`   MongoDB ID: ${message._id}`);
        console.log('\n📌 You can now pin this message using:');
        console.log(`   PUT http://localhost:5000/api/chat/pin/${message.firebaseId}`);
        console.log(`   OR`);
        console.log(`   PUT http://localhost:5000/api/chat/pin/${message._id}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

addMessage();

