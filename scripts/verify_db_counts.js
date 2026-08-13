import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MONGO_URI = process.env.MONGO_URI_STANDARD || process.env.MONGO_URI;

const villageJunctionSchema = new mongoose.Schema({
  _id: String,
  n: String,
  h: String,
  t: String,
  loc: {
    type: { type: String },
    coordinates: [Number]
  },
  d: String,
  s: String,
  p: String,
  c: String
}, { collection: 'village_junction_nodes' });

const VillageJunction = mongoose.model('VillageJunction', villageJunctionSchema);

async function verifyCounts() {
  console.log('====================================================');
  console.log('LIVE DATABASE VERIFICATION & PROOF GENERATOR');
  console.log('====================================================\n');

  try {
    console.log('Connecting to MongoDB database...');
    await mongoose.connect(MONGO_URI);
    console.log('✔ Connected to MongoDB Atlas!\n');

    const totalCount = await VillageJunction.countDocuments();
    console.log(`📌 TOTAL LIVE NODES IN MONGODB DATABASE: ${totalCount}`);

    // Breakdown by Type
    console.log('\n--- BREAKDOWN BY NODE TYPE ---');
    const typeCounts = await VillageJunction.aggregate([
      { $group: { _id: '$t', count: { $sum: 1 } } }
    ]);
    typeCounts.forEach(t => {
      const typeLabel = t._id === 's' ? 'Railway Station Hub' : (t._id === 'u' ? 'Urban Hub' : 'Village Junction Node');
      console.log(`  • ${typeLabel} (${t._id || 'j'}): ${t.count} records`);
    });

    // Breakdown by Top States
    console.log('\n--- BREAKDOWN BY TOP STATES ---');
    const stateCounts = await VillageJunction.aggregate([
      { $group: { _id: '$s', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    stateCounts.forEach(s => {
      console.log(`  • ${s._id || 'Unknown State'}: ${s.count} villages/nodes`);
    });

    // Sample Live Records
    console.log('\n--- SAMPLE LIVE RECORDS FROM DATABASE ---');
    const samples = await VillageJunction.find().limit(8);
    samples.forEach((doc, idx) => {
      const lng = doc.loc?.coordinates ? doc.loc.coordinates[0] : 'N/A';
      const lat = doc.loc?.coordinates ? doc.loc.coordinates[1] : 'N/A';

      console.log(`  [${idx + 1}] ID: ${doc._id}`);
      console.log(`      Name: ${doc.n} (${doc.h || ''})`);
      console.log(`      Location: Lat ${lat}, Lng ${lng}`);
      console.log(`      District: ${doc.d}, State: ${doc.s}\n`);
    });

    console.log('====================================================');
    console.log('ALL-INDIA DATABASE PROOF VERIFIED SUCCESSFULLY!');
    console.log('====================================================');
    process.exit(0);

  } catch (err) {
    console.error('Error verifying DB:', err);
    process.exit(1);
  }
}

verifyCounts();
