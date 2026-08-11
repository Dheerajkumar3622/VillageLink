/**
 * VillageLink All-India Bulk Village Seeding Engine (Phase 2)
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: './.env' });

const MONGO_URI = process.env.MONGO_URI_STANDARD || process.env.MONGO_URI || 'mongodb://localhost:27017/villagelink';

const VNISNodeSchema = new mongoose.Schema({
  nodeId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true, index: true },
  localNameHindi: { type: String, index: true },
  nodeType: { type: String, default: 'VILLAGE_JUNCTION' },
  district: { type: String, index: true },
  state: { type: String, index: true },
  loc: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true } // [lng, lat]
  },
  h3_r7: { type: String, index: true },
  h3_r9: { type: String, index: true },
  isJunction: { type: Boolean, default: true }
}, { timestamps: true });

VNISNodeSchema.index({ loc: '2dsphere' });

const VNISNodeModel = mongoose.models.VNISNode || mongoose.model('VNISNode', VNISNodeSchema, 'village_junction_nodes');

const STATE_BOUNDS = [
  // South India
  { state: 'Tamil Nadu', district: 'Madurai', latMin: 8.5, latMax: 13.5, lngMin: 76.2, lngMax: 80.3, count: 12000 },
  { state: 'Karnataka', district: 'Mysuru', latMin: 11.5, latMax: 18.4, lngMin: 74.1, lngMax: 78.5, count: 15000 },
  { state: 'Kerala', district: 'Wayanad', latMin: 8.2, latMax: 12.8, lngMin: 74.8, lngMax: 77.5, count: 8000 },
  { state: 'Andhra Pradesh', district: 'Guntur', latMin: 12.6, latMax: 19.1, lngMin: 76.8, lngMax: 84.7, count: 14000 },
  { state: 'Telangana', district: 'Warangal', latMin: 15.8, latMax: 19.9, lngMin: 77.2, lngMax: 81.8, count: 11000 },
  // North & North-East India
  { state: 'Punjab', district: 'Ludhiana', latMin: 29.5, latMax: 32.5, lngMin: 73.9, lngMax: 76.9, count: 12500 },
  { state: 'Haryana', district: 'Hisar', latMin: 27.6, latMax: 30.9, lngMin: 74.5, lngMax: 77.6, count: 7000 },
  { state: 'Himachal Pradesh', district: 'Mandi', latMin: 30.4, latMax: 33.2, lngMin: 75.6, lngMax: 79.0, count: 10000 },
  { state: 'Jammu & Kashmir', district: 'Anantnag', latMin: 32.3, latMax: 35.5, lngMin: 73.5, lngMax: 77.8, count: 6500 },
  { state: 'Assam', district: 'Jorhat', latMin: 24.1, latMax: 28.0, lngMin: 89.7, lngMax: 96.0, count: 13000 },
  { state: 'Meghalaya', district: 'Shillong', latMin: 25.0, latMax: 26.1, lngMin: 89.8, lngMax: 92.8, count: 6000 },
  { state: 'Tripura', district: 'Agartala', latMin: 22.9, latMax: 24.5, lngMin: 91.1, lngMax: 92.4, count: 4000 },
  { state: 'Uttarakhand', district: 'Almora', latMin: 28.7, latMax: 31.4, lngMin: 77.6, lngMax: 81.0, count: 15000 },
  { state: 'Chhattisgarh', district: 'Bastar', latMin: 17.8, latMax: 24.1, lngMin: 80.2, lngMax: 84.4, count: 16000 },
  { state: 'Gujarat', district: 'Rajkot', latMin: 20.1, latMax: 24.7, lngMin: 68.1, lngMax: 74.4, count: 18000 }
];

async function seedPhase2AllIndia() {
  console.log('🚀 Starting All-India Phase 2 Village Seeding Engine...');
  console.log(`📡 Connecting to MongoDB Atlas: ${MONGO_URI.substring(0, 30)}...`);

  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB Atlas.');

  const existingCount = await VNISNodeModel.countDocuments();
  console.log(`📊 Current Indexed Nodes in Database: ${existingCount.toLocaleString()}`);

  let totalNewInserted = 0;
  const batchSize = 1000;

  for (const config of STATE_BOUNDS) {
    console.log(`📌 Generating ${config.count.toLocaleString()} Gram Panchayat Nodes for ${config.state}...`);
    let batch = [];

    for (let i = 0; i < config.count; i++) {
      const lat = config.latMin + Math.random() * (config.latMax - config.latMin);
      const lng = config.lngMin + Math.random() * (config.lngMax - config.lngMin);

      const nodeId = `P2-${config.state.substring(0, 3).toUpperCase()}-${String(i + 1).padStart(6, '0')}`;
      const name = `${config.state} Gaaw Junction ${i + 1}`;
      const h3_r7 = `87${Math.floor(Math.random() * 1000000000).toString(16)}`;
      const h3_r9 = `89${Math.floor(Math.random() * 1000000000).toString(16)}`;

      batch.push({
        nodeId,
        name,
        localNameHindi: `${config.state} मोड ${i + 1}`,
        nodeType: 'VILLAGE_JUNCTION',
        district: config.district,
        state: config.state,
        loc: { type: 'Point', coordinates: [lng, lat] },
        h3_r7,
        h3_r9,
        isJunction: true
      });

      if (batch.length >= batchSize) {
        try {
          await VNISNodeModel.insertMany(batch, { ordered: false });
          totalNewInserted += batch.length;
        } catch (e) {
          // Ignore duplicate key errors on insertMany
        }
        batch = [];
      }
    }

    if (batch.length > 0) {
      try {
        await VNISNodeModel.insertMany(batch, { ordered: false });
        totalNewInserted += batch.length;
      } catch (e) {}
    }
  }

  const finalCount = await VNISNodeModel.countDocuments();
  console.log(`🎉 Phase 2 Complete! Total Indexed Village Nodes in Atlas DB: ${finalCount.toLocaleString()}`);
  await mongoose.disconnect();
}

seedPhase2AllIndia().catch(err => {
  console.error('❌ Phase 2 Seeding Error:', err);
  mongoose.disconnect();
});
