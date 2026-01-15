
import mongoose from 'mongoose';
import { Shop } from './backend/models.js';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://dheerakumar3622:Dheeraj123@villagelink.j9op0nf.mongodb.net/test?appName=Villagelink';

mongoose.connect(MONGO_URI).then(async () => {
    console.log("Connected to DB");
    const shops = await Shop.find({});
    console.log(`Found ${shops.length} Shops:`);
    shops.forEach(s => {
        console.log(`- Name: ${s.name}, Category: ${s.category}, Pincode: '${s.pincode}' (${typeof s.pincode})`);
    });
    process.exit();
}).catch(e => console.error(e));
