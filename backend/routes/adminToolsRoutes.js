import express from 'express';
import mongoose from 'mongoose';

const router = express.Router();

// ━━━━━━━━━━━━━━━━━━ PLACE MAP ━━━━━━━━━━━━━━━━━━
function addPlace(placeMap, name, lat, lng, district, state, type, source) {
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
async function extractTrajectories(db, placeMap, stats) {
    const collection = db.collection('trajectories');
    const count = await collection.countDocuments();
    stats.trajectories = count;
    
    const trajectories = await collection.find({}, { 
        projection: { startNode: 1, endNode: 1, rawPings: { $slice: 1 }, 'rawPings': { $slice: -1 } } 
    }).toArray();
    
    for (const t of trajectories) {
        if (t.startNode && t.rawPings && t.rawPings.length > 0) {
            addPlace(placeMap, t.startNode, t.rawPings[0].lat, t.rawPings[0].lng, null, null, 'Stop', 'Trajectory');
        } else if (t.startNode) {
            addPlace(placeMap, t.startNode, null, null, null, null, 'Stop', 'Trajectory');
        }
        if (t.endNode) {
            addPlace(placeMap, t.endNode, null, null, null, null, 'Stop', 'Trajectory');
        }
    }
    
    const withPings = await collection.find(
        { 'rawPings.0': { $exists: true } },
        { projection: { startNode: 1, endNode: 1, rawPings: 1 } }
    ).limit(500).toArray();
    
    for (const t of withPings) {
        if (t.rawPings && t.rawPings.length > 0) {
            if (t.startNode) addPlace(placeMap, t.startNode, t.rawPings[0].lat, t.rawPings[0].lng, null, null, 'Stop', 'TrajectoryPing');
            if (t.endNode && t.rawPings.length > 1) {
                const last = t.rawPings[t.rawPings.length - 1];
                addPlace(placeMap, t.endNode, last.lat, last.lng, null, null, 'Stop', 'TrajectoryPing');
            }
        }
    }
}

async function extractSupplyListings(db, placeMap, stats) {
    const collection = db.collection('supplylistings');
    stats.supplyListings = await collection.countDocuments();
    
    const listings = await collection.find({}, {
        projection: { 'location.village': 1, 'location.district': 1, 'location.state': 1, 
                       'location.lat': 1, 'location.lng': 1,
                       'trustChain.farmLocation': 1, 'trustChain.sourceFarm': 1 }
    }).toArray();
    
    for (const l of listings) {
        if (l.location) {
            addPlace(placeMap, l.location.village, l.location.lat, l.location.lng, 
                     l.location.district, l.location.state, 'Village', 'SupplyListing');
        }
        if (l.trustChain?.sourceFarm && l.trustChain?.farmLocation) {
            addPlace(placeMap, l.trustChain.sourceFarm, l.trustChain.farmLocation.lat, 
                     l.trustChain.farmLocation.lng, null, null, 'Farm', 'SupplyListingTrust');
        }
    }
}

async function extractDairyFarmers(db, placeMap, stats) {
    const collection = db.collection('dairyfarmers');
    stats.dairyFarmers = await collection.countDocuments();
    
    const farmers = await collection.find({}, {
        projection: { 'location.village': 1, 'location.block': 1, 'location.district': 1, 
                       'location.state': 1, 'location.coordinates': 1 }
    }).toArray();
    
    for (const f of farmers) {
        if (f.location) {
            addPlace(placeMap, f.location.village, f.location.coordinates?.lat, f.location.coordinates?.lng,
                     f.location.district, f.location.state, 'Village', 'DairyFarmer');
            if (f.location.block) {
                addPlace(placeMap, f.location.block, null, null, f.location.district, f.location.state, 'Block', 'DairyFarmer');
            }
        }
    }
}

async function extractCollectionCenters(db, placeMap, stats) {
    const collection = db.collection('collectioncenters');
    stats.collectionCenters = await collection.countDocuments();
    
    const centers = await collection.find({}, {
        projection: { name: 1, village: 1, district: 1, coordinates: 1 }
    }).toArray();
    
    for (const c of centers) {
        if (c.village) addPlace(placeMap, c.village, c.coordinates?.lat, c.coordinates?.lng, c.district, null, 'Collection Center', 'CollectionCenter');
        if (c.name) addPlace(placeMap, c.name, c.coordinates?.lat, c.coordinates?.lng, c.district, null, 'Collection Center', 'CollectionCenter');
    }
}

async function extractColdStorage(db, placeMap, stats) {
    const collection = db.collection('coldstoragefacilities');
    stats.coldStorage = await collection.countDocuments();
    
    const facilities = await collection.find({}, {
        projection: { name: 1, 'location.city': 1, 'location.district': 1, 'location.coordinates': 1, type: 1 }
    }).toArray();
    
    for (const f of facilities) {
        if (f.name) addPlace(placeMap, f.name, f.location?.coordinates?.lat, f.location?.coordinates?.lng, f.location?.district, null, f.type || 'Cold Storage', 'ColdStorage');
        if (f.location?.city) addPlace(placeMap, f.location.city, f.location.coordinates?.lat, f.location.coordinates?.lng, f.location.district, null, 'City', 'ColdStorage');
    }
}

async function extractProduceListings(db, placeMap, stats) {
    const collection = db.collection('producelistings');
    stats.produceListings = await collection.countDocuments();
    
    const listings = await collection.find({}, {
        projection: { 'location.village': 1, 'location.block': 1, 'location.district': 1, 'location.coordinates': 1 }
    }).toArray();
    
    for (const l of listings) {
        if (l.location?.village) addPlace(placeMap, l.location.village, l.location.coordinates?.lat, l.location.coordinates?.lng, l.location.district, null, 'Village', 'ProduceListing');
        if (l.location?.block) addPlace(placeMap, l.location.block, null, null, l.location.district, null, 'Block', 'ProduceListing');
    }
}

async function extractLogisticsTrips(db, placeMap, stats) {
    const collection = db.collection('logisticstrips');
    stats.logisticsTrips = await collection.countDocuments();
    
    const trips = await collection.find({}, {
        projection: { 'pickups.location': 1, 'deliveries.address': 1, 'deliveries.coordinates': 1 }
    }).toArray();
    
    for (const t of trips) {
        if (t.pickups) {
            for (const p of t.pickups) {
                if (p.location?.address) addPlace(placeMap, p.location.address, p.location.coordinates?.lat, p.location.coordinates?.lng, null, null, 'Pickup', 'LogisticsTrip');
            }
        }
        if (t.deliveries) {
            for (const d of t.deliveries) {
                if (d.address) addPlace(placeMap, d.address, d.coordinates?.lat, d.coordinates?.lng, null, null, 'Delivery', 'LogisticsTrip');
            }
        }
    }
}

async function extractRouteCapacity(db, placeMap, stats) {
    const collection = db.collection('routecapacities');
    stats.routeCapacity = await collection.countDocuments();
    
    const routes = await collection.find({}, {
        projection: { 'route.from': 1, 'route.to': 1, 'route.stops': 1 }
    }).toArray();
    
    for (const r of routes) {
        if (r.route?.from?.name) addPlace(placeMap, r.route.from.name, r.route.from.lat, r.route.from.lng, null, null, 'Route Stop', 'RouteCapacity');
        if (r.route?.to?.name) addPlace(placeMap, r.route.to.name, r.route.to.lat, r.route.to.lng, null, null, 'Route Stop', 'RouteCapacity');
        if (r.route?.stops) {
            for (const s of r.route.stops) {
                if (s.name) addPlace(placeMap, s.name, s.lat, s.lng, null, null, 'Route Stop', 'RouteCapacity');
            }
        }
    }
}

async function extractReels(db, placeMap, stats) {
    const collection = db.collection('reels');
    stats.reels = await collection.countDocuments();
    
    const reels = await collection.find(
        { 'locationTag.name': { $exists: true, $ne: null } },
        { projection: { 'locationTag': 1 } }
    ).toArray();
    
    for (const r of reels) {
        if (r.locationTag?.name) addPlace(placeMap, r.locationTag.name, r.locationTag.lat, r.locationTag.lng, null, null, 'Location', 'Reel');
    }
}

async function extractCommutePatterns(db, placeMap, stats) {
    const collection = db.collection('commutepatterns');
    stats.commutePatterns = await collection.countDocuments();
    
    const patterns = await collection.find({}, {
        projection: { fromLocation: 1, toLocation: 1 }
    }).toArray();
    
    for (const p of patterns) {
        if (p.fromLocation) addPlace(placeMap, p.fromLocation, null, null, null, null, 'Commute Stop', 'CommutePattern');
        if (p.toLocation) addPlace(placeMap, p.toLocation, null, null, null, null, 'Commute Stop', 'CommutePattern');
    }
}

async function extractSupplyOrders(db, placeMap, stats) {
    const collection = db.collection('supplyorders');
    stats.supplyOrders = await collection.countDocuments();
    
    const orders = await collection.find({}, {
        projection: { 'pickupLocation': 1, 'deliveryLocation': 1 }
    }).toArray();
    
    for (const o of orders) {
        if (o.pickupLocation?.address) addPlace(placeMap, o.pickupLocation.address, o.pickupLocation.lat, o.pickupLocation.lng, null, null, 'Pickup', 'SupplyOrder');
        if (o.deliveryLocation?.address) addPlace(placeMap, o.deliveryLocation.address, o.deliveryLocation.lat, o.deliveryLocation.lng, null, null, 'Delivery', 'SupplyOrder');
    }
}

async function extractMarketPrices(db, placeMap, stats) {
    const collection = db.collection('marketprices');
    stats.marketPrices = await collection.countDocuments();
    
    const prices = await collection.find({}, {
        projection: { market: 1, state: 1 }
    }).toArray();
    
    const markets = new Set();
    for (const p of prices) {
        if (p.market && !markets.has(p.market)) {
            markets.add(p.market);
            addPlace(placeMap, p.market, null, null, null, p.state, 'Mandi', 'MarketPrice');
        }
    }
}

// ━━━━━━━━━━━━━━━━━━ ROUTE ━━━━━━━━━━━━━━━━━━

router.get('/extract-geo', async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ error: 'Database not connected' });
        }
        
        const db = mongoose.connection.db;
        const placeMap = new Map();
        const stats = {};
        
        await Promise.all([
            extractTrajectories(db, placeMap, stats),
            extractSupplyListings(db, placeMap, stats),
            extractDairyFarmers(db, placeMap, stats),
            extractCollectionCenters(db, placeMap, stats),
            extractColdStorage(db, placeMap, stats),
            extractProduceListings(db, placeMap, stats),
            extractLogisticsTrips(db, placeMap, stats),
            extractRouteCapacity(db, placeMap, stats),
            extractReels(db, placeMap, stats),
            extractCommutePatterns(db, placeMap, stats),
            extractSupplyOrders(db, placeMap, stats),
            extractMarketPrices(db, placeMap, stats)
        ]);
        
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
        
        res.json({
            status: 'success',
            stats: stats,
            totalUniquePlaces: geoOutput.length,
            placesWithCoords: geoOutput.filter(p => p[4]).length,
            data: geoOutput
        });
        
    } catch (error) {
        console.error('Geo Extraction Error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
