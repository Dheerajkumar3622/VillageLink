
import mongoose from 'mongoose';
import { User, Shop } from './backend/models.js';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://dheerakumar3622:Dheeraj123@villagelink.j9op0nf.mongodb.net/test?appName=Villagelink';

mongoose.connect(MONGO_URI).then(async () => {
    console.log("Connected. Checking Managers...");

    const managers = await User.find({ role: 'MESS_MANAGER' });
    console.log(`Found ${managers.length} Managers.`);

    for (const m of managers) {
        const shop = await Shop.findOne({ ownerId: m.id });
        if (shop) {
            console.log(`[OK] User: ${m.name} (${m.id}) -> Shop: ${shop.name} (${shop.id})`);
        } else {
            console.log(`[ERROR] User: ${m.name} (${m.id}) -> NO SHOP LINKED!`);
        }
    }

    process.exit();
}).catch(e => {
    console.error(e);
    process.exit(1);
});
