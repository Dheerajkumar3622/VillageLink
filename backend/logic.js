
import crypto from 'crypto';
import Models from './models.js';
const { Block, User, SystemSetting, TripLog, Location } = Models;
import https from 'https';

// --- SERVER-SIDE ML PRICING ENGINE ---
export const calculateFare = async (distanceKm, hour) => {
  let baseRate = 6;
  let baseFixed = 10;

  try {
    const setting = await SystemSetting.findOne({ key: 'PRICING_CONFIG' });
    if (setting && setting.value) {
      baseRate = Number(setting.value.perKmRate) || 6;
      baseFixed = Number(setting.value.baseFare) || 10;
    }
  } catch (e) {
    console.warn("Pricing Config Fetch Failed, using defaults");
  }

  let rawBaseFare = baseFixed + (distanceKm * baseRate);

  let finalFare = rawBaseFare;
  let surgeMultiplier = 1.0;
  let message = '';

  // Rush Hour (Server Logic)
  if ((hour >= 8 && hour <= 10) || (hour >= 17 && hour <= 19)) {
    surgeMultiplier = 1.2;
    finalFare *= surgeMultiplier;
    message = 'Rush Hour';
  } else if (hour >= 13 && hour <= 15) {
    surgeMultiplier = 0.85;
    finalFare *= surgeMultiplier;
    message = 'Happy Hour';
  }

  finalFare = Math.ceil(finalFare / 5) * 5;
  if (finalFare < baseFixed) finalFare = baseFixed;

  return {
    totalFare: finalFare,
    baseFare: rawBaseFare,
    surge: surgeMultiplier,
    message,
    rateUsed: baseRate
  };
};

// --- REAL ROUTING ENGINE (OSRM) ---
// Fetches actual road geometry instead of straight lines
export const getRealRoadPath = (startLat, startLng, endLat, endLng) => {
  return new Promise((resolve, reject) => {
    // Using OSRM Public Demo API
    const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.code !== 'Ok' || !json.routes || json.routes.length === 0) {
            resolve(null); // Fallback
            return;
          }

          const route = json.routes[0];
          const coordinates = route.geometry.coordinates.map(coord => ({
            lng: coord[0],
            lat: coord[1] // OSRM returns [lng, lat]
          }));

          resolve({
            pathDetails: coordinates,
            distance: route.distance / 1000, // Convert meters to km
            duration: route.duration / 60 // Convert seconds to minutes
          });
        } catch (e) {
          console.error("OSRM Parse Error", e);
          resolve(null);
        }
      });
    }).on('error', (err) => {
      console.error("OSRM Network Error", err);
      resolve(null);
    });
  });
};

// --- ROUTE WITH VILLAGES/POIs ---
// Combines OSRM route with village and POI mapping

// Helper function to query OSM Overpass API
const queryOSMPOIsForPoint = async (lat, lng) => {
  const query = `
        [out:json][timeout:10];
        (
            node["railway"="station"](around:1000,${lat},${lng});
            node["amenity"="bus_station"](around:1000,${lat},${lng});
            node["amenity"="hospital"](around:1000,${lat},${lng});
        );
        out body;
    `;

  try {
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    if (!response.ok) return null;
    const data = await response.json();
    const element = data.elements?.[0];
    if (element?.tags?.name) {
      return {
        name: element.tags.name,
        type: element.tags.railway ? 'railway_station' :
          element.tags.amenity === 'bus_station' ? 'bus_station' :
            element.tags.amenity === 'hospital' ? 'hospital' : 'poi',
        lat: element.lat,
        lng: element.lon
      };
    }
    return null;
  } catch (e) {
    return null;
  }
};

// Main function to get route with mapped places
export const getRouteWithPlaces = async (startLat, startLng, endLat, endLng) => {
  // 1. Get OSRM route
  const route = await getRealRoadPath(startLat, startLng, endLat, endLng);
  if (!route) return null;

  const places = [];
  const coords = route.pathDetails;

  // 2. Sample every 1km (approx 10-15 points for typical route)
  const sampleInterval = Math.max(1, Math.floor(coords.length / 12));

  for (let i = 0; i < coords.length; i += sampleInterval) {
    const point = coords[i];

    // Try local DB first
    try {
      const localVillage = await Location.findOne({
        location: {
          $near: {
            $geometry: { type: "Point", coordinates: [point.lng, point.lat] },
            $maxDistance: 2000
          }
        }
      }).lean();

      if (localVillage) {
        const exists = places.find(p => p.name === localVillage.name);
        if (!exists) {
          places.push({
            name: localVillage.name,
            type: 'village',
            lat: localVillage.location?.coordinates?.[1] || point.lat,
            lng: localVillage.location?.coordinates?.[0] || point.lng,
            source: 'LOCAL_DB'
          });
        }
        continue;
      }
    } catch (e) { /* geospatial index might not exist */ }

    // Fallback to OSM
    const osmPlace = await queryOSMPOIsForPoint(point.lat, point.lng);
    if (osmPlace) {
      const exists = places.find(p => p.name === osmPlace.name);
      if (!exists) {
        places.push({ ...osmPlace, source: 'OSM' });
      }
    }

    // Rate limit
    await new Promise(r => setTimeout(r, 50));
  }

  return {
    pathDetails: route.pathDetails,
    distance: route.distance,
    duration: route.duration,
    places: places
  };
};

// --- SERVER-SIDE BLOCKCHAIN LEDGER ---
const calculateHash = (index, prevHash, timestamp, data) => {
  return crypto.createHash('sha256').update(index + prevHash + timestamp + JSON.stringify(data)).digest('hex');
};

export const addToChain = async (data) => {
  const lastBlock = await Block.findOne().sort({ index: -1 });
  const index = lastBlock ? lastBlock.index + 1 : 0;
  const prevHash = lastBlock ? lastBlock.hash : "0";
  const timestamp = Date.now();
  const hash = calculateHash(index, prevHash, timestamp, data);

  const newBlock = new Block({ index, timestamp, data, previousHash: prevHash, hash, validator: 'VL-SERVER' });
  await newBlock.save();
  return newBlock;
};

// --- GRAMCOIN LOGIC ---
export const transferTokens = async (fromId, toId, amount, reason) => {
  const sender = await User.findOne({ id: fromId });
  if (sender.walletBalance < amount) return false;

  const receiver = await User.findOne({ id: toId });

  sender.walletBalance -= amount;
  receiver.walletBalance += amount;

  await sender.save();
  await receiver.save();

  await addToChain({ type: 'TOKEN_TRANSFER', from: fromId, to: toId, amount, reason });
  return true;
};

// Default export for CJS compatibility
export default {
  calculateFare,
  getRealRoadPath,
  getRouteWithPlaces,
  addToChain,
  transferTokens
};
