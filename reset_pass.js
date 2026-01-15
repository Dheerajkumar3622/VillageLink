
console.log("RESET PASSWORD SCRIPT STARTING...");
import mongoose from 'mongoose';
import { User } from './backend/models.js';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://dheerakumar3622:Dheeraj123@villagelink.j9op0nf.mongodb.net/test?appName=Villagelink';

mongoose.connect(MONGO_URI).then(async () => {
    console.log("Connected.");

    // Find latest Mess Manager
    const manager = await User.findOne({ role: 'MESS_MANAGER' }).sort({ _id: -1 });

    if (!manager) {
        console.log("No Mess Manager found.");
    } else {
        console.log(`Found Manager: ${manager.name} (${manager.id})`);

        // Manually set password (mongoose middleware will hash it if save is called)
        // But wait, if I set it directly, I need to ensure hashing happens.
        // User model usually has pre-save hook.

        manager.password = '123456';
        await manager.save();

        console.log(`PASSWORD RESET SUCCESSFUL for ${manager.name}`);
        console.log(`User ID: ${manager.id}`);
        console.log(`New Password: 123456`);
    }

    process.exit();
}).catch(e => {
    console.error(e);
    process.exit(1);
});
