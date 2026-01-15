
console.log("FIX SCRIPT STARTING...");
import mongoose from 'mongoose';
import { User, Shop } from './backend/models.js';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://dheerakumar3622:Dheeraj123@villagelink.j9op0nf.mongodb.net/test?appName=Villagelink';

mongoose.connect(MONGO_URI).then(async () => {
    console.log("Connected.");

    const managers = await User.find({ role: 'MESS_MANAGER' });
    console.log(`Found ${managers.length} Managers.`);

    let fixedCount = 0;

    for (const m of managers) {
        const shop = await Shop.findOne({ ownerId: m.id });
        if (!shop) {
            console.log(`[FIXING] Creating Shop for User: ${m.name} (${m.id})`);
            const newShop = new Shop({
                id: `SHP-FIX-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                ownerId: m.id,
                name: `${m.name}'s Mess`,
                category: 'MESS',
                location: 'Not Provided (Auto-Fixed)',
                pincode: '000000',
                rating: 4.0,
                isOpen: true,
                themeColor: 'purple'
            });
            await newShop.save();
            fixedCount++;
        } else {
            // console.log(`[OK] ${m.name}`);
        }
    }

    console.log(`DONE. Fixed ${fixedCount} accounts.`);
    process.exit();
}).catch(e => {
    console.error(e);
    process.exit(1);
});
