const mongoose = require('mongoose');

const mongoUri = 'mongodb+srv://cinestream_admin:lqYMJPad7Rqhg8Vk@cluster0.cc4bua2.mongodb.net/cinestream?retryWrites=true&w=majority';

async function run() {
    try {
        console.log('Connecting to MongoDB Atlas...');
        await mongoose.connect(mongoUri);
        console.log('Connected!');

        const db = mongoose.connection.db;
        const collection = db.collection('chatmessages');

        const keywords = ['spam', 'xâm nhập', 'bot@', 'bot đang spam', 'cảnh báo bảo mật', 'Test spam', 'console'];
        const regexes = keywords.map(k => new RegExp(k, 'i'));

        const query = {
            $or: [
                { text: { $in: regexes } },
                { user: { $in: regexes } },
                { firebaseId: { $regex: /spam/i } }
            ]
        };

        const countBefore = await collection.countDocuments(query);
        console.log(`Found ${countBefore} spam messages in MongoDB.`);

        const res = await collection.deleteMany(query);
        console.log(`Successfully deleted ${res.deletedCount} spam messages!`);

        await mongoose.connection.close();
        console.log('Done!');
    } catch (err) {
        console.error('Error:', err);
    }
}

run();
