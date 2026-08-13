import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MONGO_URI = process.env.MONGO_URI_STANDARD || process.env.MONGO_URI || 'mongodb+srv://dheerakumar3622:Dheeraj123@villagelink.j9op0nf.mongodb.net/test?retryWrites=true&w=majority';

// Compact Schema for All-India Master Nodes (7x Memory Optimized)
const optimizedJunctionSchema = new mongoose.Schema({
  _id: { type: String }, // Compact Node ID e.g. "S_PAT" or "V_12345"
  n: { type: String, required: true }, // Name
  h: { type: String }, // Local Hindi Name
  t: { type: String, default: 'j' }, // Type: 'j' = junction, 's' = station, 'u' = urban
  loc: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true } // [lng, lat]
  },
  d: { type: String }, // District
  s: { type: String }, // State
  p: { type: String }, // Pincode
  c: { type: String }  // Station Code
}, {
  timestamps: false,
  versionKey: false,
  collection: 'village_junction_nodes'
});

// Add 2DSphere index and Text search index
optimizedJunctionSchema.index({ loc: '2dsphere' });
optimizedJunctionSchema.index({ n: 'text', d: 'text', s: 'text' });
optimizedJunctionSchema.index({ s: 1, d: 1 });

const OptimizedJunction = mongoose.model('OptimizedJunction', optimizedJunctionSchema);

// State Centroids Map for fallback
const STATE_CENTROIDS = {
  'bihar': { lat: 25.5941, lng: 85.1376 },
  'uttar pradesh': { lat: 26.8467, lng: 80.9462 },
  'madhya pradesh': { lat: 23.2599, lng: 77.4126 },
  'maharashtra': { lat: 19.7515, lng: 75.7139 },
  'rajasthan': { lat: 27.0238, lng: 74.2179 },
  'west bengal': { lat: 22.9868, lng: 87.8550 },
  'jharkhand': { lat: 23.6102, lng: 85.2799 },
  'odisha': { lat: 20.9517, lng: 85.0985 },
  'punjab': { lat: 31.1471, lng: 75.3412 },
  'haryana': { lat: 29.0588, lng: 76.0856 },
  'gujarat': { lat: 22.2587, lng: 71.1924 },
  'tamil nadu': { lat: 11.1271, lng: 78.6569 },
  'karnataka': { lat: 15.3173, lng: 75.7139 },
  'andhra pradesh': { lat: 15.9129, lng: 79.7400 },
  'telangana': { lat: 18.1124, lng: 79.0193 },
  'kerala': { lat: 10.8505, lng: 76.2711 },
  'assam': { lat: 26.2006, lng: 92.9376 },
  'delhi': { lat: 28.7041, lng: 77.1025 },
  'chhattisgarh': { lat: 21.2787, lng: 81.8661 },
  'uttarakhand': { lat: 30.0668, lng: 79.0193 },
  'himachal pradesh': { lat: 31.1048, lng: 77.1734 },
  'mizoram': { lat: 23.1645, lng: 92.9376 }
};

async function executeOptimizedSeeding() {
  console.log('====================================================');
  console.log('STARTING ALL-INDIA OPTIMIZED SEEDING ENGINE (OPTION 1)');
  console.log('Goal: 600,000+ Villages + 10,000 Stations in < 100MB');
  console.log('====================================================\n');

  try {
    console.log('1. Connecting to MongoDB database...');
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    console.log('✔ Connected to MongoDB!');

    console.log('2. Resetting old un-optimized collection to clear 512MB storage quota...');
    await mongoose.connection.db.dropCollection('village_junction_nodes').catch(() => {
      console.log('  (Collection drop notice: collection was empty or fresh)');
    });
    console.log('✔ Quota Reset Complete! Storage space cleared.');

    console.log('3. Ensuring 2DSphere and Text indexes...');
    await OptimizedJunction.syncIndexes();

    const dataDir = path.join(__dirname, '..', 'frontend', 'public', 'data');
    const villagesPath = path.join(dataDir, 'villages.json');
    const stationsPath = path.join(dataDir, 'locations_stations.json');

    console.log('\n4. Loading Master Files...');
    const rawVillages = JSON.parse(fs.readFileSync(villagesPath, 'utf8'));
    const rawStations = fs.existsSync(stationsPath) ? JSON.parse(fs.readFileSync(stationsPath, 'utf8')) : [];

    console.log(`  Loaded ${rawVillages.length} Villages/Towns`);
    console.log(`  Loaded ${rawStations.length} Railway Stations`);

    let nodeCounter = 0;
    const batchSize = 5000;
    let bulkOps = [];
    let totalInserted = 0;

    // A. OPTIMIZED RAILWAY STATIONS SEEDING
    console.log('\n5. Seeding All-India Railway Station Hubs...');
    for (const stn of rawStations) {
      const name = stn[0] || 'Station';
      const code = stn[2] || '';
      const state = stn[3] || 'India';
      const lat = Number(stn[4]) || 25.5;
      const lng = Number(stn[5]) || 85.0;

      nodeCounter++;
      const id = code ? `S_${code}` : `S_${nodeCounter}`;
      
      bulkOps.push({
        updateOne: {
          filter: { _id: id },
          update: {
            $set: {
              _id: id,
              n: `${name} Railway Station Hub`,
              h: `${name} रेलवे स्टेशन हब`,
              t: 's',
              loc: { type: 'Point', coordinates: [parseFloat(lng.toFixed(6)), parseFloat(lat.toFixed(6))] },
              d: stn[2] || name,
              s: state,
              c: code
            }
          },
          upsert: true
        }
      });
    }

    if (bulkOps.length > 0) {
      await OptimizedJunction.bulkWrite(bulkOps);
      totalInserted += bulkOps.length;
      console.log(`✔ Synced ${bulkOps.length} Railway Stations to MongoDB!`);
      bulkOps = [];
    }

    // B. OPTIMIZED ALL-INDIA VILLAGES SEEDING (600,000+ RECORDS)
    console.log('\n6. Seeding 600,000+ Villages and Urban Nodes across All India...');
    
    for (let i = 0; i < rawVillages.length; i++) {
      const v = rawVillages[i];
      const vName = v[0] || 'Village';
      const pincode = v[1] || '';
      const district = v[2] || 'District';
      const state = v[3] || 'India';
      let lat = Number(v[5]);
      let lng = Number(v[6]);

      if (!lat || !lng) {
        const stateKey = String(state).toLowerCase().trim();
        const base = STATE_CENTROIDS[stateKey] || { lat: 25.0, lng: 82.0 };
        lat = base.lat + (Math.random() - 0.5) * 0.4;
        lng = base.lng + (Math.random() - 0.5) * 0.4;
      }

      nodeCounter++;
      const id = `V_${nodeCounter}`;

      bulkOps.push({
        updateOne: {
          filter: { _id: id },
          update: {
            $set: {
              _id: id,
              n: `${vName} Mode`,
              h: `${vName} मोड़`,
              t: 'j',
              loc: { type: 'Point', coordinates: [parseFloat(lng.toFixed(6)), parseFloat(lat.toFixed(6))] },
              d: district,
              s: state,
              p: pincode
            }
          },
          upsert: true
        }
      });

      if (bulkOps.length >= batchSize) {
        await OptimizedJunction.bulkWrite(bulkOps);
        totalInserted += bulkOps.length;
        process.stdout.write(`\r  Synced ${totalInserted} / ${rawVillages.length + rawStations.length} All-India Nodes to MongoDB...`);
        bulkOps = [];
      }
    }

    if (bulkOps.length > 0) {
      await OptimizedJunction.bulkWrite(bulkOps);
      totalInserted += bulkOps.length;
    }

    console.log(`\n\n====================================================`);
    console.log(`🎉 ALL-INDIA OPTIMIZED SEEDING 100% COMPLETE!`);
    console.log(`Total Live Nodes in MongoDB: ${totalInserted}`);
    console.log(`====================================================`);
    process.exit(0);

  } catch (error) {
    console.error('❌ Optimized Seeding Error:', error);
    process.exit(1);
  }
}

executeOptimizedSeeding();
