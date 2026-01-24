import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const { MongoClient } = mongoose.mongo;

const uri = process.env.MONGO_URI || 'mongodb+srv://dheerakumar3622:Dheeraj123@villagelink.j9op0nf.mongodb.net/?appName=Villagelink';

async function run() {
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
    try {
        console.log('⏳ Attempting raw connection to:', uri.replace(/:([^:@]+)@/, ':****@'));
        await client.connect();
        console.log('✅ Raw Connection Successful!');
        const db = client.db('test');
        const collections = await db.listCollections().toArray();
        console.log('📋 Collections:', collections.map(c => c.name));
    } catch (err) {
        console.error('❌ Raw Connection Failed:', err.message);
    } finally {
        await client.close();
    }
}

run();
