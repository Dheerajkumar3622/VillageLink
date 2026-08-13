import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MONGO_URI = process.env.MONGO_URI_STANDARD || process.env.MONGO_URI || 'mongodb+srv://dheerakumar3622:Dheeraj123@villagelink.j9op0nf.mongodb.net/test?retryWrites=true&w=majority';

// Schema for Village Junction Nodes
const villageJunctionSchema = new mongoose.Schema({
  junctionId: { type: String, unique: true },
  name: String,
  localNameHindi: String,
  type: { type: String, default: 'junction_node' },
  lat: Number,
  lng: Number,
  associatedVillage: String,
  district: String,
  state: String,
  pincode: String,
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
villageJunctionSchema.index({ district: 1 });
villageJunctionSchema.index({ name: 'text', localNameHindi: 'text', district: 'text' });

const VillageJunction = mongoose.model('VillageJunction', villageJunctionSchema);

async function startBiharBulkSeeding() {
  console.log('====================================================');
  console.log('STARTING BIHAR STATE BULK JUNCTION NODE SEEDING ENGINE');
  console.log('====================================================\n');

  try {
    console.log('1. Connecting to MongoDB...');
    let isMongoConnected = false;
    try {
      await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
      console.log('✔ Connected to MongoDB!');
      isMongoConnected = true;
    } catch (err) {
      console.warn('⚠️ MongoDB connection failed, running in File Generator Mode:', err.message);
    }

    const villagesFilePath = path.join(__dirname, '..', 'frontend', 'public', 'data', 'villages.json');
    console.log(`2. Reading master village dataset: ${villagesFilePath}`);
    
    const rawVillages = JSON.parse(fs.readFileSync(villagesFilePath, 'utf8'));
    console.log(`Loaded total ${rawVillages.length} entries from villages.json`);

    // Filter only Bihar villages
    const biharVillages = rawVillages.filter(v => v[3] && String(v[3]).toLowerCase().includes('bihar'));
    console.log(`✔ Found ${biharVillages.length} Villages in BIHAR!`);

    const bulkJunctionDocs = [];
    let count = 0;

    for (const v of biharVillages) {
      const vName = v[0];
      const pincode = v[1] || '';
      const district = v[2] || 'Bihar';
      const state = 'Bihar';
      let lat = v[5];
      let lng = v[6];

      // If lat/lng is missing in dataset, approximate based on district centroids
      if (!lat || !lng) {
        // District centroid offset calculation
        const distLower = district.toLowerCase();
        let baseLat = 25.55;
        let baseLng = 84.85;

        if (distLower.includes('patna')) { baseLat = 25.59; baseLng = 85.13; }
        else if (distLower.includes('bhojpur') || distLower.includes('ara')) { baseLat = 25.55; baseLng = 84.66; }
        else if (distLower.includes('buxar')) { baseLat = 25.56; baseLng = 83.97; }
        else if (distLower.includes('rohtas') || distLower.includes('sasaram')) { baseLat = 24.95; baseLng = 84.01; }
        else if (distLower.includes('gaya')) { baseLat = 24.79; baseLng = 85.00; }
        else if (distLower.includes('muzaffarpur')) { baseLat = 26.12; baseLng = 85.36; }
        else if (distLower.includes('darbhanga')) { baseLat = 26.15; baseLng = 85.89; }
        else if (distLower.includes('bhagalpur')) { baseLat = 25.24; baseLng = 87.00; }

        lat = baseLat + (Math.random() - 0.5) * 0.15;
        lng = baseLng + (Math.random() - 0.5) * 0.15;
      }

      count++;
      const junctionId = `BIHAR_VILLAGE_NODE_${count}`;
      const managerName = `${vName} Hub Manager`;
      const managerPhone = `+91 98${Math.floor(10000000 + Math.random() * 90000000)}`;

      const junctionDoc = {
        junctionId,
        name: `${vName} Mode`,
        localNameHindi: `${vName} मोड़`,
        type: 'junction_node',
        lat: parseFloat(lat.toFixed(6)),
        lng: parseFloat(lng.toFixed(6)),
        associatedVillage: vName,
        district,
        state,
        pincode,
        highwayType: 'main_road_mode',
        hasVillageManager: true,
        villageManagerDetails: {
          name: managerName,
          phone: managerPhone,
          hubStatus: 'ACTIVE'
        }
      };

      bulkJunctionDocs.push(junctionDoc);
    }

    console.log(`3. Generated ${bulkJunctionDocs.length} Junction Nodes ("Gaaw ke Mode") for Bihar!`);

    // Write Bihar Chunked Cache File for Frontend & Offline Access
    const biharCachePath = path.join(__dirname, '..', 'frontend', 'public', 'data', 'bihar_junction_nodes.json');
    fs.writeFileSync(biharCachePath, JSON.stringify(bulkJunctionDocs, null, 2));
    console.log(`✔ Written Bihar Junction Nodes Cache to: ${biharCachePath}`);

    // Bulk Insert into MongoDB in batches of 2000
    if (isMongoConnected) {
      console.log('4. Syncing Bihar Junction Nodes to MongoDB Database...');
      const BATCH_SIZE = 2000;
      for (let i = 0; i < bulkJunctionDocs.length; i += BATCH_SIZE) {
        const batch = bulkJunctionDocs.slice(i, i + BATCH_SIZE);
        const bulkOps = batch.map(doc => ({
          updateOne: {
            filter: { junctionId: doc.junctionId },
            update: { $set: doc },
            upsert: true
          }
        }));
        await VillageJunction.bulkWrite(bulkOps);
        process.stdout.write(`\r  Processed ${Math.min(i + BATCH_SIZE, bulkJunctionDocs.length)} / ${bulkJunctionDocs.length} MongoDB records...`);
      }
      console.log('\n✔ All Bihar Junction Nodes Synced to MongoDB Database!');
      const totalDbCount = await VillageJunction.countDocuments();
      console.log(`Total Junction Nodes currently active in DB: ${totalDbCount}`);
    }

    console.log('\n====================================================');
    console.log('BIHAR BULK JUNCTION SEEDING COMPLETE!');
    console.log('====================================================');
    process.exit(0);

  } catch (error) {
    console.error('❌ Bulk Seeding Error:', error);
    process.exit(1);
  }
}

startBiharBulkSeeding();
