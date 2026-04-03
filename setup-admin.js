import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dns from 'dns';
import dotenv from 'dotenv';
dotenv.config();

// CRITICAL: Force Node.js to use IPv4 first. 
// MongoDB Atlas does NOT support IPv6, and Indian ISPs (Jio/Airtel) prefer IPv6 by default.
dns.setDefaultResultOrder('ipv4first');

// Use standard MongoDB URI formats avoiding SRV for Indian ISPs, and enforce IPv4 to avoid timeouts
const MONGO_URI_STANDARD = 'mongodb://dheerakumar3622:Dheeraj123@ac-klokthx-shard-00-00.j9op0nf.mongodb.net:27017,ac-klokthx-shard-00-01.j9op0nf.mongodb.net:27017,ac-klokthx-shard-00-02.j9op0nf.mongodb.net:27017/test?ssl=true&replicaSet=atlas-2yklok-shard-0&authSource=admin&retryWrites=true&w=majority';

async function setupDefaultAdmin() {
    try {
        console.log('Connecting to database to set up Admin...');
        await mongoose.connect(MONGO_URI_STANDARD, {
            serverSelectionTimeoutMS: 15000,
            family: 4 // Force IPv4 to prevent hanging on dual-stack networks
        });
        const usersCol = mongoose.connection.db.collection('users');
        
        const adminPhone = '9999999999';
        const rawPassword = 'Admin@123';
        const hash = await bcrypt.hash(rawPassword, 10);

        const existing = await usersCol.findOne({ phone: adminPhone });
        
        if (existing) {
            // Force update password and role to be sure
            await usersCol.updateOne(
                { phone: adminPhone }, 
                { $set: { role: 'ADMIN', password: hash } }
            );
            console.log('\n✅ Existing Admin Account Updated!');
        } else {
            await usersCol.insertOne({
                id: 'admin_' + Date.now(),
                name: 'Super Admin',
                phone: adminPhone,
                email: 'admin@villagelink.com',
                password: hash,
                role: 'ADMIN',
                isVerified: true,
                walletBalance: 0
            });
            console.log('\n✅ New Admin Account Created!');
        }

        console.log('====================================');
        console.log('👉 PHONE NUMBER : 9999999999');
        console.log('👉 PASSWORD     : Admin@123');
        console.log('====================================');
        console.log('You can now log in at /admin.html using these credentials.');
        
        process.exit(0);
    } catch(e) {
        console.error('❌ Error connecting to MongoDB:', e.message);
        process.exit(1);
    }
}

setupDefaultAdmin();
