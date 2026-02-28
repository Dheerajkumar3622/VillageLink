import fs from 'fs';
import path from 'path';
import through from 'through2';
import parse from 'osm-pbf-parser';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, 'public', 'data');
const osmDir = path.join(__dirname, 'OSMdata');

const V_FILE = path.join(dataDir, 'villages.json');
const LGD_FILE = path.join(dataDir, 'locations_lgd.json');
const STN_FILE = path.join(dataDir, 'locations_stations.json');

console.log("Loading existing JSONs into memory...");
const villages = JSON.parse(fs.readFileSync(V_FILE, 'utf8'));
const lgd = fs.existsSync(LGD_FILE) ? JSON.parse(fs.readFileSync(LGD_FILE, 'utf8')) : [];
const stations = fs.existsSync(STN_FILE) ? JSON.parse(fs.readFileSync(STN_FILE, 'utf8')) : [];

console.log(`Loaded ${villages.length} Villages, ${lgd.length} LGD, ${stations.length} Stations`);

// Build hash maps for fast lookup
console.log("Building in-memory indices for O(1) matching...");
const villagesByName = {};
const lgdByName = {};
const stationsByName = {};

function safePush(map, key, index) {
    if (!key) return;
    const k = String(key).toLowerCase().trim();
    if (!map[k]) map[k] = [];
    map[k].push(index);
}

for (let i = 0; i < villages.length; i++) safePush(villagesByName, villages[i][0], i);
for (let i = 0; i < lgd.length; i++) safePush(lgdByName, lgd[i][0], i);
for (let i = 0; i < stations.length; i++) {
   safePush(stationsByName, stations[i][0], i);
   // Station code might also be in 'name' from OSM sometimes, or `ref`
   safePush(stationsByName, stations[i][2], i); 
}

let nodesProcessed = 0;
let matchedCount = 0;

async function processFile(filePath) {
    console.log(`\n============================================`);
    console.log(`Starting PBF Extraction: ${path.basename(filePath)}`);
    console.log(`============================================\n`);
    
    return new Promise((resolve, reject) => {
        const osm = parse();
        
        fs.createReadStream(filePath)
          .pipe(osm)
          .pipe(through.obj((items, enc, next) => {
              for (let i = 0; i < items.length; i++) {
                  const item = items[i];
                  
                  // We only care about Nodes that have coords and a name
                  if (item.type === 'node' && item.tags && (item.tags.name || item.tags['name:en'])) {
                      nodesProcessed++;
                      if (nodesProcessed % 100000 === 0) {
                          process.stdout.write(`\rProcessed ${nodesProcessed} named nodes... Matched: ${matchedCount}`);
                      }
                      
                      const name = (item.tags['name:en'] || item.tags.name).toLowerCase().trim();
                      const state = (item.tags['is_in:state'] || item.tags['addr:state'] || '').toLowerCase();
                      
                      // Match Stations
                      if ((item.tags.railway === 'station' || item.tags.train === 'yes') && stationsByName[name]) {
                          stationsByName[name].forEach(idx => {
                             stations[idx][4] = item.lat;
                             stations[idx][5] = item.lon;
                             matchedCount++;
                          });
                      }
                      
                      // Match LGD
                      if (lgdByName[name]) {
                          lgdByName[name].forEach(idx => {
                             if (lgd[idx][4] === null) {
                                lgd[idx][4] = item.lat;
                                lgd[idx][5] = item.lon;
                                matchedCount++;
                             }
                          });
                      }
                      
                      // Match Villages
                      if (villagesByName[name]) {
                          villagesByName[name].forEach(idx => {
                              const vState = (villages[idx][3] || '').toLowerCase();
                              // Simple uniqueness/state matching check
                              if (villagesByName[name].length === 1 || (state && vState.includes(state)) || villages[idx][5] === null) {
                                  if (villages[idx][5] === null) matchedCount++;
                                  villages[idx][5] = item.lat;
                                  villages[idx][6] = item.lon;
                              }
                          });
                      }
                  }
              }
              next();
          }))
          .on('finish', () => {
              console.log(`\nFinished file: ${path.basename(filePath)}`);
              resolve();
          })
          .on('error', (err) => {
              console.error(`\nError in ${filePath}:`, err);
              reject(err);
          });
    });
}

async function startExtraction() {
    try {
        if (!fs.existsSync(osmDir)) {
            console.error("OSMdata directory not found!");
            return;
        }

        const files = fs.readdirSync(osmDir).filter(f => f.endsWith('.osm.pbf')).map(f => path.join(osmDir, f));
        
        console.log(`Found ${files.length} PBF files. Beginning massive pipeline...\n`);
        
        for (const file of files) {
           await processFile(file);
        }
        
        console.log(`\nAll PBF files processed. Total Named Nodes Scanned: ${nodesProcessed}`);
        console.log(`Total Locations Successfully Mapped with Lat/Lng: ${matchedCount}`);
        
        console.log("\nSaving back to JSON cache files...");
        
        fs.writeFileSync(V_FILE, JSON.stringify(villages));
        if (lgd.length > 0) fs.writeFileSync(LGD_FILE, JSON.stringify(lgd));
        if (stations.length > 0) fs.writeFileSync(STN_FILE, JSON.stringify(stations));
        
        console.log("✔ Coordinate Injection Complete! Haversine Engine now fully activated!");
        process.exit(0);
        
    } catch (err) {
        console.error("Extraction failed:", err);
        process.exit(1);
    }
}

startExtraction();
