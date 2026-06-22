const mongoose = require('mongoose');
require('dotenv').config();

// Load from environment variables — KHÔNG hardcode credentials vào code
const wrongUri = process.env.MONGODB_URI_WRONG || process.env.MONGODB_URI;
const correctUri = process.env.MONGODB_URI;

async function migrateUsers() {
    try {
        console.log("Connecting to WRONG database...");
        const wrongConn = await mongoose.createConnection(wrongUri).asPromise();
        
        console.log("Connecting to CORRECT database...");
        const correctConn = await mongoose.createConnection(correctUri).asPromise();

        // Assuming user collection is 'users'
        const WrongUser = wrongConn.model('User', new mongoose.Schema({}, { strict: false }), 'users');
        const CorrectUser = correctConn.model('User', new mongoose.Schema({}, { strict: false }), 'users');

        const wrongUsers = await WrongUser.find({});
        console.log(`Found ${wrongUsers.length} users in the WRONG database.`);

        if (wrongUsers.length === 0) {
            console.log("No users to migrate. You are completely safe to switch back!");
        } else {
            console.log("Migrating users to the correct database...");
            let migratedCount = 0;
            for (let user of wrongUsers) {
                const userObj = user.toObject();
                // Check if user already exists in correct db by email
                const exists = await CorrectUser.findOne({ email: userObj.email });
                if (!exists) {
                    await CorrectUser.create(userObj);
                    migratedCount++;
                    console.log(`Migrated user: ${userObj.email}`);
                } else {
                    console.log(`Skipped existing user: ${userObj.email}`);
                }
            }
            console.log(`Migration complete! Successfully copied ${migratedCount} new users.`);
        }

        await wrongConn.close();
        await correctConn.close();
    } catch (error) {
        console.error("Migration error:", error);
    }
}

migrateUsers();
