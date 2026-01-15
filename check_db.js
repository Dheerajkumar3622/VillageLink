
console.log("SCRIPT STARTING...");
import mongoose from 'mongoose';
import { Shop } from './backend/models.js';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://dheerakumar3622:Dheeraj123@villagelink.j9op0nf.mongodb.net/test?appName=Villagelink';

console.log("Connecting...");
mongoose.connect(MONGO_URI).then(async () => {
    console.log("CONNECTED.");
    const count = await Shop.countDocuments();
    console.log(`Total Shops: ${count}`);
    const shops = await Shop.find({});
    shops.forEach(s => console.log(`SHOP: ${s.name} | PIN: '${s.pincode}'`));
    console.log("DONE");
    process.exit();
}).catch(e => {
    console.error("ERROR:", e);
    process.exit(1);
});
