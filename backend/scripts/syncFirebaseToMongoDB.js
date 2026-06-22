/**
 * SYNC FIREBASE MESSAGES TO MONGODB
 * Script này đồng bộ tất cả tin nhắn từ Firebase Firestore vào MongoDB
 * để đảm bảo chức năng pin/delete hoạt động
 */

require('dotenv').config();
const mongoose = require('mongoose');
const admin = require('firebase-admin');
const ChatMessage = require('../models/ChatMessage');

// Initialize Firebase Admin
const serviceAccount = require('../firebase-service-account.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function syncMessages() {
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

        const tabs = ['general', 'movies', 'support'];
        let totalSynced = 0;
        let totalSkipped = 0;

        for (const tab of tabs) {
            console.log(`\n📋 Syncing tab: ${tab}`);

            // Get all messages from Firebase
            const snapshot = await db.collection('chat').doc(tab).collection('messages').get();
            console.log(`   Found ${snapshot.size} messages in Firebase`);

            for (const doc of snapshot.docs) {
                const data = doc.data();
                const firebaseId = doc.id;

                // Check if message already exists in MongoDB
                const existing = await ChatMessage.findOne({ firebaseId });

                if (existing) {
                    totalSkipped++;
                    continue;
                }

                // Create new message in MongoDB
                try {
                    await ChatMessage.create({
                        firebaseId,
                        userId: data.userId || '000000000000000000000000', // Placeholder if missing
                        user: data.user || 'Khách',
                        avatar: data.avatar || '/apple-touch-icon.png',
                        chatRole: data.chatRole || 'user',
                        frame: data.frame || '',
                        text: data.text || '',
                        tab: tab,
                        reactions: data.reactions || {},
                        isPinned: data.isPinned || false,
                        createdAt: data.timestamp ? data.timestamp.toDate() : new Date()
                    });
                    totalSynced++;
                    process.stdout.write('.');
                } catch (err) {
                    console.error(`\n   ❌ Error syncing message ${firebaseId}:`, err.message);
                }
            }
        }

        console.log(`\n\n✅ Sync completed!`);
        console.log(`   Synced: ${totalSynced} messages`);
        console.log(`   Skipped: ${totalSkipped} messages (already exist)`);
        console.log(`   Total in MongoDB: ${await ChatMessage.countDocuments()}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

syncMessages();

