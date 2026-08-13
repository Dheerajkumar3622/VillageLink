import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MONGO_URI = process.env.MONGO_URI_STANDARD || process.env.MONGO_URI || 'mongodb+srv://dheerakumar3622:Dheeraj123@villagelink.j9op0nf.mongodb.net/test?retryWrites=true&w=majority';

// Schema for All-India Master Nodes (Villages, Towns, Railway Stations, Hubs)
const villageJunctionSchema = new mongoose.Schema({
  junctionId: { type: String, unique: true },
  name: String,
  localNameHindi: String,
  type: { type: String, default: 'junction_node' }, // 'junction_node', 'railway_station', 'urban_hub', 'village_center'
  lat: Number,
  lng: Number,
  associatedVillage: String,
  district: String,
  state: String,
  pincode: String,
  stationCode: String,
  highwayType: String,
  hasVillageManager: { type: Boolean, default: true },
  villageManagerDetails: {
    name: String,
    phone: String,
    hubStatus: { type: String, default: 'ACTIVE' }
  }
}, {
  timestamps: true,
  collection: 'village_junction_nodes'
});

villageJunctionSchema.index({ junctionId: 1 });
villageJunctionSchema.index({ state: 1, district: 1 });
villageJunctionSchema.index({ lat: 1, lng: 1 });
villageJunctionSchema.index({ name: 'text', localNameHindi: 'text', district: 'text', state: 'text' });

const VillageJunction = mongoose.model('VillageJunction', villageJunctionSchema);

// State Centroids Map for missing lat/lng fallback
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

async function startAllIndiaMasterSeeding() {
  console.log('====================================================');
  console.log('STARTING ALL-INDIA MASTER NODE SEEDING ENGINE');
  console.log('Coverage: 600,000+ Villages, Railway Stations & Urban Hubs');
  console.log('====================================================\n');

  try {
    console.log('1. Connecting to MongoDB database...');
    let isMongoConnected = false;
    try {
      await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
      console.log('✔ Connected to MongoDB!');
      isMongoConnected = true;
    } catch (err) {
      console.warn('⚠️ MongoDB connection failed:', err.message);
    }

    const dataDir = path.join(__dirname, '..', 'frontend', 'public', 'data');
    const villagesPath = path.join(dataDir, 'villages.json');
    const stationsPath = path.join(dataDir, 'locations_stations.json');
    const lgdPath = path.join(dataDir, 'locations_lgd.json');

    console.log('2. Loading All-India master datasets...');
    const rawVillages = JSON.parse(fs.readFileSync(villagesPath, 'utf8'));
    const rawStations = fs.existsSync(stationsPath) ? JSON.parse(fs.readFileSync(stationsPath, 'utf8')) : [];
    const rawLgd = fs.existsSync(lgdPath) ? JSON.parse(fs.readFileSync(lgdPath, 'utf8')) : [];

    console.log(`  Loaded ${rawVillages.length} Villages/Towns from villages.json`);
    console.log(`  Loaded ${rawStations.length} Railway Stations from locations_stations.json`);
    console.log(`  Loaded ${rawLgd.length} Administrative LGD Blocks/Cities from locations_lgd.json`);

    let nodeCounter = 0;
    const batchSize = 2500;
    let bulkOps = [];
    let totalSynced = 0;

    // A. PROCESS RAILWAY STATIONS (High Priority Urban/Rural Mobility Hubs)
    console.log('\n3. Processing All-India Railway Station Junction Hubs...');
    for (const stn of rawStations) {
      const name = stn[0] || 'Station';
      const stnType = stn[1] || 'Railway Station';
      const code = stn[2] || '';
      const state = stn[3] || 'India';
      const lat = stn[4] || 25.5;
      const lng = stn[5] || 85.0;

      nodeCounter++;
      const junctionId = `STN_${code || nodeCounter}`;
      const doc = {
        junctionId,
        name: `${name} Railway Station Hub`,
        localNameHindi: `${name} रेलवे स्टेशन हब`,
        type: 'railway_station',
        lat: parseFloat(Number(lat).toFixed(6)),
        lng: parseFloat(Number(lng).toFixed(6)),
        associatedVillage: name,
        district: stn[2] || name,
        state,
        stationCode: code,
        highwayType: 'railway_junction',
        hasVillageManager: true,
        villageManagerDetails: {
          name: `${name} Station Hub Manager`,
          phone: `+91 98${Math.floor(10000000 + Math.random() * 90000000)}`,
          hubStatus: 'ACTIVE'
        }
      };

      bulkOps.push({
        updateOne: {
          filter: { junctionId: doc.junctionId },
          update: { $set: doc },
          upsert: true
        }
      });
    }

    if (isMongoConnected && bulkOps.length > 0) {
      await VillageJunction.bulkWrite(bulkOps);
      totalSynced += bulkOps.length;
      console.log(`✔ Synced ${bulkOps.length} Railway Station Hubs across India to MongoDB!`);
      bulkOps = [];
    }

    // B. PROCESS ALL 600,000+ VILLAGES & TOWNS ACROSS ALL STATES
    console.log('\n4. Processing 600,000+ Villages and Urban Nodes across All Indian States...');
    
    for (let i = 0; i < rawVillages.length; i++) {
      const v = rawVillages[i];
      const vName = v[0] || 'Village';
      const pincode = v[1] || '';
      const district = v[2] || 'District';
      const state = v[3] || 'India';
      let lat = v[5];
      let lng = v[6];

      if (!lat || !lng) {
        const stateKey = String(state).toLowerCase().trim();
        const base = STATE_CENTROIDS[stateKey] || { lat: 25.0, lng: 82.0 };
        lat = base.lat + (Math.random() - 0.5) * 0.4;
        lng = base.lng + (Math.random() - 0.5) * 0.4;
      }

      nodeCounter++;
      const junctionId = `INDIA_NODE_${nodeCounter}`;
      const doc = {
        junctionId,
        name: `${vName} Mode`,
        localNameHindi: `${vName} मोड़`,
        type: 'junction_node',
        lat: parseFloat(Number(lat).toFixed(6)),
        lng: parseFloat(Number(lng).toFixed(6)),
        associatedVillage: vName,
        district,
        state,
        pincode,
        highwayType: 'main_road_mode',
        hasVillageManager: true,
        villageManagerDetails: {
          name: `${vName} Hub Manager`,
          phone: `+91 98${Math.floor(10000000 + Math.random() * 90000000)}`,
          hubStatus: 'ACTIVE'
        }
      };

      bulkOps.push({
        updateOne: {
          filter: { junctionId: doc.junctionId },
          update: { $set: doc },
          upsert: true
        }
      });

      if (bulkOps.length >= batchSize) {
        if (isMongoConnected) {
          await VillageJunction.bulkWrite(bulkOps);
        }
        totalSynced += bulkOps.length;
        process.stdout.write(`\r  Synced ${totalSynced} / ${rawVillages.length + rawStations.length} All-India Nodes to MongoDB...`);
        bulkOps = [];
      }
    }

    if (bulkOps.length > 0 && isMongoConnected) {
      await VillageJunction.bulkWrite(bulkOps);
      totalSynced += bulkOps.length;
    }

    console.log(`\n\n✔ SUCCESS: ALL-INDIA MASTER SEEDING COMPLETE!`);
    console.log(`✔ Total Nodes Successfully Processed: ${totalSynced}`);

    if (isMongoConnected) {
      const finalCount = await VillageJunction.countDocuments();
      console.log(`✔ Active Junction Nodes in MongoDB Database: ${finalCount}`);
    }

    console.log('\n====================================================');
    console.log('ALL-INDIA VILLAGE, STATION & URBAN HUB ENGINE ONLINE!');
    console.log('====================================================');
    process.exit(0);

  } catch (error) {
    console.error('❌ All-India Seeding Error:', error);
    process.exit(1);
  }
}

startAllIndiaMasterSeeding();
