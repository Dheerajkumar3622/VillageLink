const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });
const MONGO_URI = process.env.MONGO_URI_STANDARD || process.env.MONGO_URI;

async function auditDahiyarNodes() {
  try {
    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;
    console.log('✔ Connected to MongoDB Atlas.\n');

    const villageNames = ['Khanda', 'Behrar', 'Semra', 'Dahiyar', 'Rampur', 'Bagen'];
    console.log('📌 Searching for target corridor villages in MongoDB Atlas:');
    console.log('================================================================');

    for (const name of villageNames) {
      const docs = await db.collection('village_junction_nodes').find({
        $or: [
          { name: { $regex: name, $options: 'i' } },
          { localNameHindi: { $regex: name, $options: 'i' } }
        ]
      }).limit(5).toArray();

      console.log(`\n🔍 Search term: "${name}" -> Found ${docs.length} node(s):`);
      docs.forEach(d => {
        const coords = d.loc?.coordinates || [d.lng, d.lat];
        console.log(`  - [ID: ${d.nodeId || d._id}] Name: ${d.name} (${d.localNameHindi || 'N/A'})`);
        console.log(`    Coords: [Lat: ${coords[1]}, Lng: ${coords[0]}] | District: ${d.district} | State: ${d.state}`);
      });
    }

    console.log('\n================================================================');
    process.exit(0);
  } catch (err) {
    console.error('Audit Error:', err);
    process.exit(1);
  }
}

auditDahiyarNodes();
