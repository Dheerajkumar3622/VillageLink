import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

async function getAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');
    
    // We don't have the mongoose model defined here easily, so we will use the native driver
    const db = mongoose.connection.db;
    const users = await db.collection('users').find({ role: 'ADMIN' }).toArray();
    
    if (users.length === 0) {
      console.log('No admin users found.');
    } else {
      console.log(`Found ${users.length} admin(s):`);
      users.forEach(u => {
        console.log(`- ID: ${u.id || u._id}`);
        console.log(`  Name: ${u.name}`);
        console.log(`  Phone: ${u.phone}`);
        console.log(`  Email: ${u.email}`);
        console.log(`  Role: ${u.role}`);
      });
    }
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

getAdmin();
