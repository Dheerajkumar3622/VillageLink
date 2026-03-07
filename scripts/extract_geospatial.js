#!/usr/bin/env node
/**
 * 🌍 VillageLink Geospatial Data Extractor
 * 
 * Connects to MongoDB Atlas and extracts all geospatial coordinates
 * from every collection, then merges them into a unified JSON file
 * that can be used for offline routing & search.
 * 
 * Usage: node scripts/extract_geospatial.js
 * Output: frontend/public/data/locations_geo.json
 */

import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ━━━━━━━━━━━━━━━━━━ CONFIG ━━━━━━━━━━━━━━━━━━
const MONGO_URI = process.env.MONGO_URI || 
    'mongodb+srv://dheerakumar3622:Dheeraj123@villagelink.j9op0nf.mongodb.net/?appName=Villagelink';

const OUTPUT_DIR = path.resolve(__dirname, '..', 'frontend', 'public', 'data');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'locations_geo.json');
const REPORT_FILE = path.join(OUTPUT_DIR, 'extraction_report.json');

// ━━━━━━━━━━━━━━━━━━ PLACE MAP ━━━━━━━━━━━━━━━━━━
// Maps place names → { lat, lng, district, state, type, sources }
const placeMap = new Map();

function addPlace(name, lat, lng, district, state, type, source) {
    if (!name || typeof name !== 'string') return;
    name = name.trim();
    if (name.length < 2) return;
    
    // Normalize the key
    const key = name.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
    if (!key) return;
    
    const hasCoords = lat && lng && !isNaN(lat) && !isNaN(lng) && 
                      lat !== 0 && lng !== 0 &&
                      lat >= 5 && lat <= 40 && lng >= 60 && lng <= 100; // India bounds
    
    if (placeMap.has(key)) {
        const existing = placeMap.get(key);
        // Only overwrite coords if we have valid ones and existing doesn't
        if (hasCoords && (!existing.lat || !existing.lng)) {
            existing.lat = lat;
            existing.lng = lng;
        }
        // Fill in missing metadata
        if (district && !existing.district) existing.district = district;
        if (state && !existing.state) existing.state = state;
        if (type && !existing.type) existing.type = type;
        existing.sources.add(source);
    } else {
        placeMap.set(key, {
            name: name, // Keep original casing
            lat: hasCoords ? lat : null,
            lng: hasCoords ? lng : null,
            district: district || null,
            state: state || 'Bihar',
            type: type || 'Village',
            sources: new Set([source])
        });
    }
}

// ━━━━━━━━━━━━━━━━━━ EXTRACTORS ━━━━━━━━━━━━━━━━━━

async function extractTrajectories(db) {
    console.log('  📡 Extracting Trajectories...');
    const collection = db.collection('trajectories');
    const count = await collection.countDocuments();
    console.log(`     Found ${count} trajectory records`);
    
    const trajectories = await collection.find({}, { 
        projection: { startNode: 1, endNode: 1, rawPings: { $slice: 1 }, 'rawPings': { $slice: -1 } } 
    }).toArray();
    
    let coordsFound = 0;
    for (const t of trajectories) {
        // Extract start node with first ping's coordinates
        if (t.startNode && t.rawPings && t.rawPings.length > 0) {
            addPlace(t.startNode, t.rawPings[0].lat, t.rawPings[0].lng, null, null, 'Stop', 'Trajectory');
            coordsFound++;
        } else if (t.startNode) {
            addPlace(t.startNode, null, null, null, null, 'Stop', 'Trajectory');
        }
        
        // Extract end node
        if (t.endNode) {
            addPlace(t.endNode, null, null, null, null, 'Stop', 'Trajectory');
        }
    }
    
    // Also get first and last pings properly
    const withPings = await collection.find(
        { 'rawPings.0': { $exists: true } },
        { projection: { startNode: 1, endNode: 1, rawPings: 1 } }
    ).limit(500).toArray();
    
    for (const t of withPings) {
        if (t.rawPings && t.rawPings.length > 0) {
            // First ping = start location
            if (t.startNode) {
                const first = t.rawPings[0];
                addPlace(t.startNode, first.lat, first.lng, null, null, 'Stop', 'TrajectoryPing');
            }
            // Last ping = end location
            if (t.endNode && t.rawPings.length > 1) {
                const last = t.rawPings[t.rawPings.length - 1];
                addPlace(t.endNode, last.lat, last.lng, null, null, 'Stop', 'TrajectoryPing');
            }
        }
    }
    
    console.log(`     ✅ Extracted ${coordsFound} places with GPS from trajectories`);
    return count;
}

async function extractSupplyListings(db) {
    console.log('  📦 Extracting Supply Listings...');
    const collection = db.collection('supplylistings');
    const count = await collection.countDocuments();
    console.log(`     Found ${count} supply listing records`);
    
    const listings = await collection.find({}, {
        projection: { 'location.village': 1, 'location.district': 1, 'location.state': 1, 
                       'location.lat': 1, 'location.lng': 1, 'location.pincode': 1,
                       'trustChain.farmLocation': 1, 'trustChain.sourceFarm': 1 }
    }).toArray();
    
    for (const l of listings) {
        if (l.location) {
            addPlace(l.location.village, l.location.lat, l.location.lng, 
                     l.location.district, l.location.state, 'Village', 'SupplyListing');
        }
        // Also extract trust chain farm locations
        if (l.trustChain?.sourceFarm && l.trustChain?.farmLocation) {
            addPlace(l.trustChain.sourceFarm, l.trustChain.farmLocation.lat, 
                     l.trustChain.farmLocation.lng, null, null, 'Farm', 'SupplyListingTrust');
        }
    }
    
    console.log(`     ✅ Extracted from ${listings.length} supply listings`);
    return count;
}

async function extractDairyFarmers(db) {
    console.log('  🐄 Extracting Dairy Farmers...');
    const collection = db.collection('dairyfarmers');
    const count = await collection.countDocuments();
    console.log(`     Found ${count} dairy farmer records`);
    
    const farmers = await collection.find({}, {
        projection: { 'location.village': 1, 'location.block': 1, 'location.district': 1, 
                       'location.state': 1, 'location.coordinates': 1, 'location.pincode': 1 }
    }).toArray();
    
    for (const f of farmers) {
        if (f.location) {
            addPlace(f.location.village, 
                     f.location.coordinates?.lat, f.location.coordinates?.lng,
                     f.location.district, f.location.state, 'Village', 'DairyFarmer');
            // Also add block as a separate place
            if (f.location.block) {
                addPlace(f.location.block, null, null, f.location.district, f.location.state, 'Block', 'DairyFarmer');
            }
        }
    }
    
    console.log(`     ✅ Extracted from ${farmers.length} dairy farmers`);
    return count;
}

async function extractCollectionCenters(db) {
    console.log('  🏭 Extracting Collection Centers...');
    const collection = db.collection('collectioncenters');
    const count = await collection.countDocuments();
    console.log(`     Found ${count} collection center records`);
    
    const centers = await collection.find({}, {
        projection: { name: 1, village: 1, block: 1, district: 1, coordinates: 1 }
    }).toArray();
    
    for (const c of centers) {
        if (c.village) {
            addPlace(c.village, c.coordinates?.lat, c.coordinates?.lng, 
                     c.district, null, 'Collection Center', 'CollectionCenter');
        }
        if (c.name) {
            addPlace(c.name, c.coordinates?.lat, c.coordinates?.lng,
                     c.district, null, 'Collection Center', 'CollectionCenter');
        }
    }
    
    console.log(`     ✅ Extracted from ${centers.length} collection centers`);
    return count;
}

async function extractColdStorage(db) {
    console.log('  ❄️ Extracting Cold Storage Facilities...');
    const collection = db.collection('coldstoragefacilities');
    const count = await collection.countDocuments();
    console.log(`     Found ${count} cold storage records`);
    
    const facilities = await collection.find({}, {
        projection: { name: 1, 'location.city': 1, 'location.district': 1, 
                       'location.coordinates': 1, 'location.pincode': 1, type: 1 }
    }).toArray();
    
    for (const f of facilities) {
        if (f.name) {
            addPlace(f.name, f.location?.coordinates?.lat, f.location?.coordinates?.lng,
                     f.location?.district, null, f.type || 'Cold Storage', 'ColdStorage');
        }
        if (f.location?.city) {
            addPlace(f.location.city, f.location.coordinates?.lat, f.location.coordinates?.lng,
                     f.location.district, null, 'City', 'ColdStorage');
        }
    }
    
    console.log(`     ✅ Extracted from ${facilities.length} cold storage facilities`);
    return count;
}

async function extractProduceListings(db) {
    console.log('  🥬 Extracting Produce Listings...');
    const collection = db.collection('producelistings');
    const count = await collection.countDocuments();
    console.log(`     Found ${count} produce listing records`);
    
    const listings = await collection.find({}, {
        projection: { 'location.village': 1, 'location.block': 1, 'location.district': 1,
                       'location.coordinates': 1, 'location.pincode': 1 }
    }).toArray();
    
    for (const l of listings) {
        if (l.location?.village) {
            addPlace(l.location.village, l.location.coordinates?.lat, l.location.coordinates?.lng,
                     l.location.district, null, 'Village', 'ProduceListing');
        }
        if (l.location?.block) {
            addPlace(l.location.block, null, null, l.location.district, null, 'Block', 'ProduceListing');
        }
    }
    
    console.log(`     ✅ Extracted from ${listings.length} produce listings`);
    return count;
}

async function extractLogisticsTrips(db) {
    console.log('  🚚 Extracting Logistics Trips...');
    const collection = db.collection('logisticstrips');
    const count = await collection.countDocuments();
    console.log(`     Found ${count} logistics trip records`);
    
    const trips = await collection.find({}, {
        projection: { 'pickups.location': 1, 'pickups.farmerName': 1,
                       'deliveries.address': 1, 'deliveries.coordinates': 1,
                       'deliveries.buyerName': 1, route: 1, currentLocation: 1 }
    }).toArray();
    
    for (const t of trips) {
        // Extract pickup locations
        if (t.pickups) {
            for (const p of t.pickups) {
                if (p.location?.address) {
                    addPlace(p.location.address, p.location.coordinates?.lat, p.location.coordinates?.lng,
                             null, null, 'Pickup', 'LogisticsTrip');
                }
            }
        }
        // Extract delivery locations
        if (t.deliveries) {
            for (const d of t.deliveries) {
                if (d.address) {
                    addPlace(d.address, d.coordinates?.lat, d.coordinates?.lng,
                             null, null, 'Delivery', 'LogisticsTrip');
                }
            }
        }
    }
    
    console.log(`     ✅ Extracted from ${trips.length} logistics trips`);
    return count;
}

async function extractRouteCapacity(db) {
    console.log('  🗺️ Extracting Route Capacity...');
    const collection = db.collection('routecapacities');
    const count = await collection.countDocuments();
    console.log(`     Found ${count} route capacity records`);
    
    const routes = await collection.find({}, {
        projection: { 'route.from': 1, 'route.to': 1, 'route.stops': 1 }
    }).toArray();
    
    for (const r of routes) {
        if (r.route?.from?.name) {
            addPlace(r.route.from.name, r.route.from.lat, r.route.from.lng,
                     null, null, 'Route Stop', 'RouteCapacity');
        }
        if (r.route?.to?.name) {
            addPlace(r.route.to.name, r.route.to.lat, r.route.to.lng,
                     null, null, 'Route Stop', 'RouteCapacity');
        }
        if (r.route?.stops) {
            for (const s of r.route.stops) {
                if (s.name) {
                    addPlace(s.name, s.lat, s.lng, null, null, 'Route Stop', 'RouteCapacity');
                }
            }
        }
    }
    
    console.log(`     ✅ Extracted from ${routes.length} route capacities`);
    return count;
}

async function extractReels(db) {
    console.log('  🎬 Extracting Reel Location Tags...');
    const collection = db.collection('reels');
    const count = await collection.countDocuments();
    console.log(`     Found ${count} reel records`);
    
    const reels = await collection.find(
        { 'locationTag.name': { $exists: true, $ne: null } },
        { projection: { 'locationTag': 1 } }
    ).toArray();
    
    for (const r of reels) {
        if (r.locationTag?.name) {
            addPlace(r.locationTag.name, r.locationTag.lat, r.locationTag.lng,
                     null, null, 'Location', 'Reel');
        }
    }
    
    console.log(`     ✅ Extracted from ${reels.length} reels with location tags`);
    return count;
}

async function extractCommutePatterns(db) {
    console.log('  🔄 Extracting Commute Patterns...');
    const collection = db.collection('commutepatterns');
    const count = await collection.countDocuments();
    console.log(`     Found ${count} commute pattern records`);
    
    const patterns = await collection.find({}, {
        projection: { fromLocation: 1, toLocation: 1 }
    }).toArray();
    
    for (const p of patterns) {
        if (p.fromLocation) addPlace(p.fromLocation, null, null, null, null, 'Commute Stop', 'CommutePattern');
        if (p.toLocation) addPlace(p.toLocation, null, null, null, null, 'Commute Stop', 'CommutePattern');
    }
    
    console.log(`     ✅ Extracted from ${patterns.length} commute patterns`);
    return count;
}

async function extractSupplyOrders(db) {
    console.log('  📋 Extracting Supply Orders...');
    const collection = db.collection('supplyorders');
    const count = await collection.countDocuments();
    console.log(`     Found ${count} supply order records`);
    
    const orders = await collection.find({}, {
        projection: { 'pickupLocation': 1, 'deliveryLocation': 1 }
    }).toArray();
    
    for (const o of orders) {
        if (o.pickupLocation?.address) {
            addPlace(o.pickupLocation.address, o.pickupLocation.lat, o.pickupLocation.lng,
                     null, null, 'Pickup', 'SupplyOrder');
        }
        if (o.deliveryLocation?.address) {
            addPlace(o.deliveryLocation.address, o.deliveryLocation.lat, o.deliveryLocation.lng,
                     null, null, 'Delivery', 'SupplyOrder');
        }
    }
    
    console.log(`     ✅ Extracted from ${orders.length} supply orders`);
    return count;
}

async function extractJobOpportunities(db) {
    console.log('  💼 Extracting Job Locations...');
    const collection = db.collection('jobopportunities');
    const count = await collection.countDocuments();
    console.log(`     Found ${count} job records`);
    
    const jobs = await collection.find({}, {
        projection: { location: 1 }
    }).toArray();
    
    for (const j of jobs) {
        if (j.location && typeof j.location === 'string') {
            addPlace(j.location, null, null, null, null, 'Job Location', 'JobOpportunity');
        }
    }
    
    console.log(`     ✅ Extracted from ${jobs.length} job opportunities`);
    return count;
}

async function extractMarketPrices(db) {
    console.log('  📊 Extracting Market/Mandi Names...');
    const collection = db.collection('marketprices');
    const count = await collection.countDocuments();
    console.log(`     Found ${count} market price records`);
    
    const prices = await collection.find({}, {
        projection: { market: 1, state: 1 }
    }).toArray();
    
    const markets = new Set();
    for (const p of prices) {
        if (p.market && !markets.has(p.market)) {
            markets.add(p.market);
            addPlace(p.market, null, null, null, p.state, 'Mandi', 'MarketPrice');
        }
    }
    
    console.log(`     ✅ Extracted ${markets.size} unique mandi names`);
    return count;
}

// ━━━━━━━━━━━━━━━━━━ MERGE WITH LGD ━━━━━━━━━━━━━━━━━━

function mergeWithLGD() {
    console.log('\n🔗 Merging with existing LGD data...');
    const lgdPath = path.join(OUTPUT_DIR, 'locations_lgd.json');
    
    if (!fs.existsSync(lgdPath)) {
        console.log('  ⚠️ locations_lgd.json not found, skipping merge');
        return;
    }
    
    const lgdData = JSON.parse(fs.readFileSync(lgdPath, 'utf-8'));
    console.log(`  📂 Loaded ${lgdData.length} LGD entries`);
    
    let enriched = 0;
    let newFromDB = 0;
    
    // Enrich existing LGD entries with coordinates from DB
    for (const entry of lgdData) {
        // Format: [Name, Type, District, State, Lat, Lng]
        const name = entry[0];
        if (!name) continue;
        
        const key = name.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
        const dbPlace = placeMap.get(key);
        
        if (dbPlace) {
            // Add coords to LGD entry if it doesn't have them
            if (dbPlace.lat && dbPlace.lng && (!entry[4] || !entry[5])) {
                entry[4] = Math.round(dbPlace.lat * 1000000) / 1000000;
                entry[5] = Math.round(dbPlace.lng * 1000000) / 1000000;
                enriched++;
            }
            // Mark as already in LGD
            dbPlace._inLGD = true;
        }
    }
    
    // Add places from DB that aren't in LGD
    for (const [key, place] of placeMap) {
        if (!place._inLGD && place.lat && place.lng) {
            lgdData.push([
                place.name,
                place.type || 'Village',
                place.district || '',
                place.state || 'Bihar',
                Math.round(place.lat * 1000000) / 1000000,
                Math.round(place.lng * 1000000) / 1000000
            ]);
            newFromDB++;
        }
    }
    
    // Write back enriched LGD
    fs.writeFileSync(lgdPath, JSON.stringify(lgdData));
    console.log(`  ✅ Enriched ${enriched} LGD entries with coordinates`);
    console.log(`  ✅ Added ${newFromDB} new places from DB to LGD`);
    console.log(`  📊 Total LGD entries: ${lgdData.length}`);
}

// ━━━━━━━━━━━━━━━━━━ MAIN ━━━━━━━━━━━━━━━━━━

async function main() {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🌍 VillageLink Geospatial Data Extractor');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Connect to MongoDB
    console.log('\n⏳ Connecting to MongoDB Atlas...');
    try {
        await mongoose.connect(MONGO_URI, {
            serverSelectionTimeoutMS: 15000,
            socketTimeoutMS: 30000,
            family: 4 // Force IPv4
        });
        console.log('✅ Connected to MongoDB!\n');
    } catch (err) {
        console.error('❌ MongoDB connection failed:', err.message);
        
        // Try standard URI
        const STANDARD_URI = 'mongodb://dheerakumar3622:Dheeraj%40123@ac-klokthx-shard-00-00.j9op0nf.mongodb.net:27017,ac-klokthx-shard-00-01.j9op0nf.mongodb.net:27017,ac-klokthx-shard-00-02.j9op0nf.mongodb.net:27017/test?ssl=true&replicaSet=atlas-2yklok-shard-0&authSource=admin&retryWrites=true&w=majority';
        
        console.log('⏳ Trying standard connection string...');
        try {
            await mongoose.connect(STANDARD_URI, {
                serverSelectionTimeoutMS: 15000,
                socketTimeoutMS: 30000,
                family: 4 // Force IPv4
            });
            console.log('✅ Connected via standard URI!\n');
        } catch (err2) {
            console.error('❌ Both connection attempts failed:', err2.message);
            process.exit(1);
        }
    }
    
    const db = mongoose.connection.db;
    
    // List all collections for reference
    const collections = await db.listCollections().toArray();
    console.log('📂 Available collections:', collections.map(c => c.name).join(', '));
    console.log('');
    
    // Run all extractors
    console.log('🔍 Starting extraction from all collections...\n');
    
    const stats = {};
    stats.trajectories = await extractTrajectories(db);
    stats.supplyListings = await extractSupplyListings(db);
    stats.dairyFarmers = await extractDairyFarmers(db);
    stats.collectionCenters = await extractCollectionCenters(db);
    stats.coldStorage = await extractColdStorage(db);
    stats.produceListings = await extractProduceListings(db);
    stats.logisticsTrips = await extractLogisticsTrips(db);
    stats.routeCapacity = await extractRouteCapacity(db);
    stats.reels = await extractReels(db);
    stats.commutePatterns = await extractCommutePatterns(db);
    stats.supplyOrders = await extractSupplyOrders(db);
    stats.jobOpportunities = await extractJobOpportunities(db);
    stats.marketPrices = await extractMarketPrices(db);
    
    // ━━━ Output Summary ━━━
    const totalPlaces = placeMap.size;
    let withCoords = 0;
    let withoutCoords = 0;
    
    for (const [_, place] of placeMap) {
        if (place.lat && place.lng) withCoords++;
        else withoutCoords++;
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 EXTRACTION SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`  Total unique places: ${totalPlaces}`);
    console.log(`  With coordinates:    ${withCoords}`);
    console.log(`  Without coordinates: ${withoutCoords}`);
    console.log('');
    
    // ━━━ Write standalone geo JSON ━━━
    const geoOutput = [];
    for (const [_, place] of placeMap) {
        geoOutput.push([
            place.name,
            place.type || 'Village',
            place.district || '',
            place.state || 'Bihar',
            place.lat ? Math.round(place.lat * 1000000) / 1000000 : null,
            place.lng ? Math.round(place.lng * 1000000) / 1000000 : null,
            Array.from(place.sources).join(',')
        ]);
    }
    
    // Sort: places with coordinates first, then alphabetically
    geoOutput.sort((a, b) => {
        if (a[4] && !b[4]) return -1;
        if (!a[4] && b[4]) return 1;
        return (a[0] || '').localeCompare(b[0] || '');
    });
    
    // Ensure output directory exists
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(geoOutput));
    console.log(`📁 Wrote ${geoOutput.length} places to ${OUTPUT_FILE}`);
    console.log(`   File size: ${(fs.statSync(OUTPUT_FILE).size / 1024).toFixed(1)} KB`);
    
    // ━━━ Merge with existing LGD data ━━━
    mergeWithLGD();
    
    // ━━━ Write extraction report ━━━
    const report = {
        extractedAt: new Date().toISOString(),
        totalUniquePlaces: totalPlaces,
        withCoordinates: withCoords,
        withoutCoordinates: withoutCoords,
        collectionStats: stats,
        samplePlacesWithCoords: geoOutput.filter(p => p[4]).slice(0, 20),
        samplePlacesWithoutCoords: geoOutput.filter(p => !p[4]).slice(0, 20)
    };
    
    fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
    console.log(`📁 Wrote extraction report to ${REPORT_FILE}`);
    
    // Disconnect
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    console.log('✅ Extraction complete!\n');
}

main().catch(err => {
    console.error('💥 Fatal error:', err);
    mongoose.disconnect();
    process.exit(1);
});
