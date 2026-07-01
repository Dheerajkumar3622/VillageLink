import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' }); // load from root

async function queryBugs() {
  try {
    const uri = process.env.MONGO_URI_STANDARD || process.env.MONGO_URI || '';
    console.log('Connecting to Standard URI:', uri.substring(0, 30) + '...');
    await mongoose.connect(uri);
    console.log('Connected to DB successfully!');
    
    const db = mongoose.connection.db;
    
    const bugReportColl = await db.collection('bugreports');
    if (bugReportColl) {
      const latestBugs = await bugReportColl
        .find({})
        .sort({ _id: -1 }) // Sort by ObjectId which embeds timestamp
        .limit(10)
        .toArray();
      
      console.log('Latest 10 reports in bugreports (sorted by ID):');
      latestBugs.forEach((b, i) => {
        const dateFromId = new Date(parseInt(b._id.toString().substring(0, 8), 16) * 1000);
        console.log(`\n--- [${i+1}] ---`);
        console.log(`ID: ${b._id} (Created At: ${dateFromId.toISOString()})`);
        console.log(`Message: ${b.message || b.error || b.msg}`);
        console.log(`Stack: ${b.stackTrace || b.stack || b.stack_trace}`);
        console.log(`User ID: ${b.userId || b.user}`);
      });
    } else {
      console.log('No bugreports collection found.');
    }
  } catch (err) {
    console.error('Error querying bugs:', err);
  } finally {
    await mongoose.disconnect();
  }
}

queryBugs();
