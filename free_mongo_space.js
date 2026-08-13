const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });
const MONGO_URI = process.env.MONGO_URI_STANDARD || process.env.MONGO_URI;

async function freeSpace() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB Atlas.');

    try {
      await mongoose.connection.db.collection('activitylogs').drop();
      console.log('✔ Dropped activitylogs collection (freed space).');
    } catch (e) { console.log('activitylogs drop skipped:', e.message); }

    try {
      await mongoose.connection.db.collection('locationlogs').drop();
      console.log('✔ Dropped locationlogs collection (freed space).');
    } catch (e) { console.log('locationlogs drop skipped:', e.message); }

    console.log('🎉 Space freed on MongoDB Atlas cluster!');
    process.exit(0);
  } catch (err) {
    console.error('Error freeing space:', err);
    process.exit(1);
  }
}

freeSpace();
