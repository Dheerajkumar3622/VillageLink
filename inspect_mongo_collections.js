const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });
const MONGO_URI = process.env.MONGO_URI_STANDARD || process.env.MONGO_URI;

async function inspectCollections() {
  try {
    await mongoose.connect(MONGO_URI);
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('MongoDB Atlas Collections:');
    for (const c of collections) {
      const count = await mongoose.connection.db.collection(c.name).countDocuments();
      console.log(`  - ${c.name}: ${count} docs`);
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

inspectCollections();
