
import mongoose from 'mongoose';
import { Shop } from './backend/models.js';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://dheerakumar3622:Dheeraj123@villagelink.j9op0nf.mongodb.net/test?appName=Villagelink';

mongoose.connect(MONGO_URI).then(async () => {
    console.log("Connected. Creating Test Mess...");

    // Create Test Mess
    const testMess = new Shop({
        id: `SHOP-TEST-${Date.now()}`,
        ownerId: 'TEST_USER',
        name: 'Test Mess (Automatic)',
        category: 'MESS',
        location: 'Test Location',
        rating: 4.5,
        isOpen: true,
        pincode: '800001'
    });

    await testMess.save();
    console.log("CREATED TEST MESS: '800001'");
    process.exit();
}).catch(e => {
    console.error(e);
    process.exit(1);
});
