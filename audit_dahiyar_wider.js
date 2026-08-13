const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });
const MONGO_URI = process.env.MONGO_URI_STANDARD || process.env.MONGO_URI;

async function auditDahiyarWider() {
  try {
    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;

    console.log('📌 Searching in "villages" collection:');
    const villagesTarget = ['Dahiyar', 'Bagen', 'Khanda', 'Behrar', 'Semra', 'Rampur', 'Bahrar'];

    for (const name of villagesTarget) {
      const vDocs = await db.collection('villages').find({
        name: { $regex: name, $options: 'i' }
      }).limit(5).toArray();

      console.log(`\n🔍 "villages" -> "${name}": Found ${vDocs.length} record(s):`);
      vDocs.forEach(d => {
        console.log(`  - [ID: ${d._id}] ${d.name} (${d.state || 'Bihar'}) | District: ${d.district || d.d} | Coords: ${JSON.stringify(d.loc || d.coordinates || [d.lng, d.lat])}`);
      });
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

auditDahiyarWider();
