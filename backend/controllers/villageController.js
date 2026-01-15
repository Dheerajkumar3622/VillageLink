
import { Location } from '../models.js';
import mongoose from 'mongoose';

// Helper to extract Lat/Lng from complex GeoJSON (Polygon/Point)
const parseCoordinates = (geometry) => {
    let lat = 0, lng = 0;
    
    if (geometry && geometry.coordinates) {
        const coords = geometry.coordinates;
        if (geometry.type === 'Point') {
            lng = coords[0]; lat = coords[1];
        } else if (geometry.type === 'Polygon' && coords[0] && coords[0][0]) {
            // Take the first point of the polygon ring
            lng = coords[0][0][0]; lat = coords[0][0][1];
        } else if (geometry.type === 'MultiPolygon' && coords[0] && coords[0][0] && coords[0][0][0]) {
            lng = coords[0][0][0][0]; lat = coords[0][0][0][1];
        }
    }
    return { lat, lng };
};

// @desc    Search villages by name, block, or district (Smart Search)
// @route   GET /api/locations/search?q=...
export const searchVillages = async (req, res) => {
    try {
        const query = req.query.q;
        
        if (!query || query.length < 2) {
            return res.json([]);
        }

        if (mongoose.connection.readyState !== 1) {
            console.error("❌ Database Disconnected during search.");
            return res.status(503).json({ error: "Database unavailable" });
        }

        // SMART SEARCH LOGIC: 
        // 1. Split query by spaces to allow "VillageName BlockName" refinement
        //    Example: "Rasulpur Sasaram" -> ["Rasulpur", "Sasaram"]
        const terms = query.trim().split(/\s+/);
        
        // 2. Create an AND condition where EACH term must match at least ONE field
        //    This ensures that adding "Sasaram" filters the results to only those related to Sasaram.
        const searchConditions = terms.map(term => {
            // Escape regex special characters
            const safeTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(safeTerm, 'i');
            
            return {
                $or: [
                    { name: { $regex: regex } },
                    { "properties.NAME": { $regex: regex } },
                    // Block Search
                    { "properties.SUB_DIST": { $regex: regex } },
                    { "properties.BLOCK": { $regex: regex } },
                    { "properties.sdtname": { $regex: regex } },
                    { block: { $regex: regex } },
                    // District Search
                    { "properties.DISTRICT": { $regex: regex } },
                    { "properties.dtname": { $regex: regex } },
                    { district: { $regex: regex } }
                ]
            };
        });

        // Use $and to ensure ALL terms matches are present
        const results = await Location.find({ $and: searchConditions }).limit(50).lean();

        const transformed = results.map(doc => {
            const { lat, lng } = parseCoordinates(doc.geometry);
            
            // Handle various naming conventions in GeoJSON
            const block = doc.properties?.SUB_DIST || doc.properties?.BLOCK || doc.block || doc.properties?.sdtname || "Block";
            const district = doc.properties?.DISTRICT || doc.properties?.dtname || doc.district || "Rohtas";
            const villageName = doc.name || doc.properties?.NAME || "Village";

            return {
                name: villageName,
                lat, 
                lng,
                address: `${villageName}, ${block}, ${district}`,
                block: block,
                panchayat: doc.properties?.GP_NAME || "Panchayat",
                district: district,
                villageCode: doc.properties?.VILL_CODE || doc.code || "V-000"
            };
        });

        res.json(transformed);

    } catch (e) {
        console.error("❌ Village Search Error:", e);
        res.status(500).json({ error: "Search failed" });
    }
};

// @desc    Find Nearest Village using Geospatial Data
// @route   GET /api/locations/nearest?lat=...&lng=...
export const getNearestVillage = async (req, res) => {
    try {
        const { lat, lng } = req.query;
        if (!lat || !lng) return res.status(400).json({ error: "Coordinates required" });

        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ error: "Database unavailable" });
        }

        // Use MongoDB $near operator (Requires 2dsphere index on 'geometry')
        const nearest = await Location.findOne({
            geometry: {
                $near: {
                    $geometry: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] },
                    $maxDistance: 5000 // Look within 5km radius
                }
            }
        });

        if (!nearest) {
            return res.status(404).json({ error: "No village found nearby" });
        }

        const { lat: vLat, lng: vLng } = parseCoordinates(nearest.geometry);
        const block = nearest.properties?.SUB_DIST || nearest.properties?.BLOCK || nearest.block || "Block";
        const district = nearest.properties?.DISTRICT || nearest.district || "District";
        const villageName = nearest.name || nearest.properties?.NAME || "Village";

        res.json({
            name: villageName,
            lat: vLat,
            lng: vLng,
            address: `${villageName}, ${block}, ${district}`,
            block,
            district,
            villageCode: nearest.properties?.VILL_CODE || nearest.code || "GPS-MATCH"
        });

    } catch (e) {
        console.error("❌ Geo Error:", e);
        res.status(500).json({ error: "Geolocation failed" });
    }
};

// @desc    Get a few sample locations
// @route   GET /api/locations
export const getSampleLocations = async (req, res) => {
    try {
        const rawLocations = await Location.find({}).limit(10).lean(); 
        const transformed = rawLocations.map(doc => {
            const { lat, lng } = parseCoordinates(doc.geometry);
            return {
                name: doc.name || doc.properties?.NAME,
                lat,
                lng
            };
        });
        res.json(transformed);
    } catch (e) { 
        res.status(500).json({ error: "Failed to fetch locations" }); 
    }
};
