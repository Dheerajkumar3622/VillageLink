/**
 * Direct MongoDB extraction of ALL villages with GeoJSON coordinates.
 * Extracts from 'villages' collection, calculates centroids, merges into locations_lgd.json
 */
import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MONGO_URI = 'mongodb+srv://dheerakumar3622:Dheeraj123@villagelink.j9op0nf.mongodb.net/?appName=Villagelink';
const LGD_PATH = path.join(__dirname, '..', 'frontend', 'public', 'data', 'locations_lgd.json');

async function main() {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  VillageLink — Direct MongoDB Villages Extraction');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // 1. Connect to MongoDB
    console.log('\n⏳ Connecting to MongoDB Atlas...');
    const client = new MongoClient(MONGO_URI, {
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 60000,
        family: 4
    });

    try {
        await client.connect();
        console.log('✅ Connected to MongoDB!');

        const db = client.db(); // uses default db from URI

        // 2. List all collections to see what's available
        const collections = await db.listCollections().toArray();
        console.log(`\n📂 Database has ${collections.length} collections:`);
        for (const col of collections) {
            const count = await db.collection(col.name).countDocuments();
            console.log(`   ${col.name}: ${count} docs`);
        }

        // 3. Extract from 'villages' collection
        const villagesCol = db.collection('villages');
        const totalVillages = await villagesCol.countDocuments();
        console.log(`\n📍 Extracting ${totalVillages} village documents...`);

        const placeMap = new Map();
        let withCoords = 0;
        let noCoords = 0;
        let processed = 0;

        const cursor = villagesCol.find({}).batchSize(5000);

        while (await cursor.hasNext()) {
            const v = await cursor.next();
            let lat = null, lng = null;

            // Extract centroid from GeoJSON geometry
            if (v.geometry && v.geometry.coordinates) {
                if (v.geometry.type === 'Point') {
                    lng = v.geometry.coordinates[0];
                    lat = v.geometry.coordinates[1];
                } else if (v.geometry.type === 'Polygon' && v.geometry.coordinates[0]) {
                    const ring = v.geometry.coordinates[0];
                    let sLat = 0, sLng = 0;
                    for (const c of ring) { sLng += c[0]; sLat += c[1]; }
                    lng = sLng / ring.length;
                    lat = sLat / ring.length;
                } else if (v.geometry.type === 'MultiPolygon' && v.geometry.coordinates[0]) {
                    const ring = v.geometry.coordinates[0][0];
                    if (ring) {
                        let sLat = 0, sLng = 0;
                        for (const c of ring) { sLng += c[0]; sLat += c[1]; }
                        lng = sLng / ring.length;
                        lat = sLat / ring.length;
                    }
                }
            }

            const name = v.name || v.properties?.name || '';
            const district = v.district || v.properties?.district || '';
            const state = v.properties?.state || 'Bihar';
            const code = v.code || v.properties?.code || '';

            if (!name) { processed++; continue; }

            const isValid = lat && lng && !isNaN(lat) && !isNaN(lng) &&
                            lat >= 5 && lat <= 40 && lng >= 60 && lng <= 100;

            const key = name.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
            if (!key) { processed++; continue; }

            if (placeMap.has(key)) {
                const existing = placeMap.get(key);
                if (isValid && !existing.lat) {
                    existing.lat = lat;
                    existing.lng = lng;
                }
                if (district && !existing.district) existing.district = district;
            } else {
                placeMap.set(key, {
                    name,
                    lat: isValid ? Math.round(lat * 1000000) / 1000000 : null,
                    lng: isValid ? Math.round(lng * 1000000) / 1000000 : null,
                    district,
                    state,
                    code
                });
            }

            if (isValid) withCoords++; else noCoords++;
            processed++;

            if (processed % 5000 === 0) {
                console.log(`   Processed ${processed}/${totalVillages}...`);
            }
        }

        console.log(`\n📊 Extraction Results:`);
        console.log(`   Total documents: ${processed}`);
        console.log(`   Unique places: ${placeMap.size}`);
        console.log(`   With coordinates: ${withCoords}`);
        console.log(`   Without coordinates: ${noCoords}`);

        // 4. Save raw extracted data
        const extractedData = [];
        for (const [_, p] of placeMap) {
            extractedData.push([p.name, 'Village', p.district, p.state, p.lat, p.lng]);
        }
        fs.writeFileSync(path.join(__dirname, '..', 'extracted_villages.json'), JSON.stringify({
            totalUniquePlaces: placeMap.size,
            placesWithCoords: extractedData.filter(p => p[4]).length,
            data: extractedData
        }));
        console.log(`\n💾 Saved raw extraction to extracted_villages.json`);

        // 5. Merge into locations_lgd.json
        console.log('\n🔀 Merging into locations_lgd.json...');
        const lgdRaw = JSON.parse(fs.readFileSync(LGD_PATH, 'utf-8'));
        console.log(`   LGD has ${lgdRaw.length} entries`);

        let updated = 0, added = 0;
        const lgdKeys = new Set();

        for (const entry of lgdRaw) {
            const key = String(entry[0]).toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
            lgdKeys.add(key);

            if (entry[4] && entry[5] && entry[4] !== 0 && entry[5] !== 0) continue;

            if (placeMap.has(key)) {
                const geo = placeMap.get(key);
                if (geo.lat && geo.lng) {
                    entry[4] = geo.lat;
                    entry[5] = geo.lng;
                    updated++;
                }
            }
        }

        // Add places from DB not in LGD
        for (const [key, geo] of placeMap) {
            if (!lgdKeys.has(key) && geo.lat && geo.lng) {
                lgdRaw.push([geo.name, 'Village', geo.district, geo.state, geo.lat, geo.lng]);
                added++;
            }
        }

        fs.writeFileSync(LGD_PATH, JSON.stringify(lgdRaw));

        console.log(`\n━━━━━━━━━━━━━━━ FINAL RESULTS ━━━━━━━━━━━━━━━`);
        console.log(`  DB villages extracted: ${placeMap.size}`);
        console.log(`  LGD entries updated with coords: ${updated}`);
        console.log(`  New entries added to LGD: ${added}`);
        console.log(`  Total LGD entries now: ${lgdRaw.length}`);
        console.log(`  LGD entries WITH coords: ${lgdRaw.filter(e => e[4] && e[5]).length}`);
        console.log(`  Saved to: ${LGD_PATH}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await client.close();
        console.log('\n🔌 MongoDB connection closed.');
    }
}

main();
