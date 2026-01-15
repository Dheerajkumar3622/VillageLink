
console.log("RESEED SCRIPT STARTING...");
import mongoose from 'mongoose';
import { Shop } from './backend/models.js';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://dheerakumar3622:Dheeraj123@villagelink.j9op0nf.mongodb.net/test?appName=Villagelink';

console.log("Connecting to:", MONGO_URI.split('@')[1]); // Log partial URI for safety

mongoose.connect(MONGO_URI).then(async () => {
    console.log("CONNECTED. DB:", mongoose.connection.name);

    // Check for existing
    const existing = await Shop.find({ pincode: '800001' });
    console.log(`Found ${existing.length} existing shops with 800001.`);

    if (existing.length === 0) {
        console.log("Creating Test Mess...");
        const testMess = new Shop({
            id: `SHOP-TEST-${Date.now()}`,
            ownerId: 'TEST_USER_2',
            name: 'Maa Ki Rasoi (Test)',
            category: 'MESS',
            location: 'Patna Test Loc',
            rating: 4.8,
            isOpen: true,
            pincode: '800001'
        });
        await testMess.save();
        console.log("CREATED TEST MESS: '800001'");
    } else {
        console.log("Test Mess already exists.");
    }

    process.exit();
}).catch(e => {
    console.error("ERROR:", e);
    process.exit(1);
});
