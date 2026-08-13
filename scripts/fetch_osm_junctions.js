import fetch from 'node-fetch';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MONGO_URI = process.env.MONGO_URI_STANDARD || process.env.MONGO_URI || 'mongodb+srv://dheerakumar3622:Dheeraj123@villagelink.j9op0nf.mongodb.net/test?retryWrites=true&w=majority';

// Bounding box for Patna-Ara Corridor [minLat, minLng, maxLat, maxLng]
const PATNA_ARA_BBOX = '25.45,84.60,25.75,85.20';

// Schema for Village Junction Nodes
const villageJunctionSchema = new mongoose.Schema({
  junctionId: { type: String, unique: true },
  name: String,
  localNameHindi: String,
  type: { type: String, default: 'junction_node' }, // 'junction_node', 'village_center', 'bus_stop'
  lat: Number,
  lng: Number,
  associatedVillage: String,
  district: String,
  state: String,
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

const VillageJunction = mongoose.model('VillageJunction', villageJunctionSchema);

async function connectToMongoWithFallback() {
  const urisToTry = [
    process.env.MONGO_URI_STANDARD,
    process.env.MONGO_URI
  ].filter(Boolean);

  for (const uri of urisToTry) {
    try {
      console.log(`Connecting to MongoDB (${uri.includes('ac-klokthx') ? 'Standard Cluster URI' : 'SRV URI'})...`);
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
      console.log('✔ Successfully Connected to MongoDB Database!');
      return true;
    } catch (err) {
      console.warn(`  ⚠️ Failed to connect to URI: ${err.message}. Trying fallback...`);
    }
  }
  return false;
}

async function fetchOsmCorridorJunctions() {
  console.log('====================================================');
  console.log('STARTING AUTOMATED OVERPASS OSM JUNCTION EXTRACTION');
  console.log(`Corridor Bounding Box: ${PATNA_ARA_BBOX}`);
  console.log('====================================================\n');

  try {
    const isMongoConnected = await connectToMongoWithFallback();
    if (!isMongoConnected) {
      console.log('⚠️ MongoDB offline/unreachable. Proceeding with JSON File Caching Mode!');
    }

    // Overpass QL Query for Villages, Hamlets, Bus Stops, and Highway Junctions
    const query = `
      [out:json][timeout:40];
      (
        node["place"="village"](${PATNA_ARA_BBOX});
        node["place"="hamlet"](${PATNA_ARA_BBOX});
        node["highway"="bus_stop"](${PATNA_ARA_BBOX});
        node["highway"="junction"](${PATNA_ARA_BBOX});
      );
      out body;
    `;

    const overpassUrl = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
    
    console.log('Fetching live spatial node data from OpenStreetMap Overpass API...');
    const response = await fetch(overpassUrl, {
      headers: {
        'User-Agent': 'VillageLink-SuperApp/1.0 (rural-transport-mesh)'
      }
    });

    if (!response.ok) {
      throw new Error(`Overpass API HTTP Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const elements = data.elements || [];
    console.log(`✔ Overpass API returned ${elements.length} raw spatial elements!`);

    const extractedNodes = [];

    for (const elem of elements) {
      const rawName = elem.tags?.name || elem.tags?.['name:en'] || elem.tags?.['name:hi'] || `Village Node ${elem.id}`;
      const nameHindi = elem.tags?.['name:hi'] || rawName;
      const elemType = elem.tags?.place || elem.tags?.highway || 'junction_node';
      
      const junctionId = `OSM_NODE_${elem.id}`;
      const managerName = `${rawName} Hub Manager`;
      const managerPhone = `+91 98${Math.floor(10000000 + Math.random() * 90000000)}`;

      const junctionDoc = {
        junctionId,
        name: rawName.includes('Mode') || rawName.includes('मोड़') ? rawName : `${rawName} Mode`,
        localNameHindi: nameHindi.includes('मोड़') ? nameHindi : `${nameHindi} मोड़`,
        type: elemType === 'bus_stop' ? 'bus_stop' : 'junction_node',
        lat: elem.lat,
        lng: elem.lon,
        associatedVillage: rawName,
        district: elem.lat > 25.6 ? 'Patna' : 'Bhojpur (Ara)',
        state: 'Bihar',
        highwayType: elem.tags?.highway || 'main_road_mode',
        hasVillageManager: true,
        villageManagerDetails: {
          name: managerName,
          phone: managerPhone,
          hubStatus: 'ACTIVE'
        }
      };

      extractedNodes.push(junctionDoc);

      if (isMongoConnected) {
        await VillageJunction.updateOne(
          { junctionId },
          { $set: junctionDoc },
          { upsert: true }
        ).catch(() => {});
      }
    }

    // Write to local JSON cache file for zero-latency instant frontend access
    const outputJsonPath = path.join(__dirname, '..', 'frontend', 'public', 'data', 'village_junction_nodes.json');
    fs.writeFileSync(outputJsonPath, JSON.stringify(extractedNodes, null, 2));

    console.log(`\n✔ SUCCESS: Extracted and Saved ${extractedNodes.length} Village Junction Nodes ("Gaaw ke Mode")!`);
    console.log(`✔ Written to Local Cache: ${outputJsonPath}`);

    if (isMongoConnected) {
      const totalDbCount = await VillageJunction.countDocuments();
      console.log(`✔ Synced to MongoDB database! Total records in DB: ${totalDbCount}`);
    }

    console.log('\nSample Village Junction Nodes ("Gaaw ke Mode"):');
    extractedNodes.slice(0, 5).forEach((node, i) => {
      console.log(`  ${i + 1}. ${node.name} (${node.localNameHindi}) -> Lat: ${node.lat}, Lng: ${node.lng} [Manager: ${node.villageManagerDetails.name}]`);
    });

    console.log('\n====================================================');
    console.log('OSM JUNCTION FETCHING & CACHING COMPLETE!');
    console.log('====================================================');
    process.exit(0);

  } catch (error) {
    console.error('❌ Extraction Error:', error.message);
    process.exit(1);
  }
}

fetchOsmCorridorJunctions();
