/**
 * AISmartRoutingService.js
 * Phase 5: Deep Learning & HMM Map Matching Engine
 * 
 * Replaces the basic "RoadSnapping" service by ingesting live 
 * telemetry arrays, running Hidden Markov Models (HMM) over an 
 * OSRM base, and silently logging permutations to MongoDB 
 * for the "Self-Healing Route Engine".
 */

import fetch from 'node-fetch';
import { Trajectory } from '../models/trajectoryModels.js';

// Currently points to public demo server, will be replaced by VITE_OSRM_URL in production
const OSRM_API = process.env.VITE_OSRM_URL || 'https://router.project-osrm.org';

/**
 * 1. THE HMM MAP MATCHING LAYER
 * Snaps a RAW array of GPS coordinates exactly to the physical 
 * road network graph using OSRM's Match API.
 * 
 * @param {Array} coords - [{lat, lng, timestamp}] sequence of driver pings
 */
export const performMapMatching = async (coords) => {
    if (!coords || coords.length < 2) return null;

    try {
        // Format for OSRM: lng,lat;lng,lat
        const coordString = coords.map(c => `${c.lng},${c.lat}`).join(';');
        const timestamps = coords.map(c => c.timestamp).join(';');
        // Standard accuracy of ordinary smartphones is ~10-15 meters
        const radiuses = coords.map(c => c.accuracy || 15).join(';');

        const url = `${OSRM_API}/match/v1/driving/${coordString}?timestamps=${timestamps}&radiuses=${radiuses}&geometries=polyline&overview=full`;

        const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (!response.ok) return null;

        const data = await response.json();
        if (data.code !== 'Ok' || !data.matchings || data.matchings.length === 0) {
            return null;
        }

        // The mathematically most probable path (HMM viterbi output)
        const bestMatch = data.matchings[0];
        
        return {
            snappedPolyline: bestMatch.geometry,
            distanceMeters: bestMatch.distance || 0,
            confidence: bestMatch.confidence || 0,
            durationSeconds: bestMatch.duration || 0,
            tracepoints: data.tracepoints
        };

    } catch (error) {
        console.error("AI Routing HMM Match failed:", error);
        return null;
    }
};

/**
 * 2. SHADOW ROUTING LOGGER
 * Silently saves the completed path payload to the DB for the ML AI.
 * This runs asynchronously so it doesn't block the socket loop.
 */
export const harvestTrajectoryData = async (tripData) => {
    const { driverId, vehicleType, startNode, endNode, rawPings } = tripData;
    
    if (!rawPings || rawPings.length < 5) return; // Ignore very short/erratic trips
    
    try {
        // Generate a unique trip hash based on time and nodes
        const tripHash = `TRJ_${Date.now()}_${startNode.replace(/\s/g,'').substring(0,3)}_${endNode.replace(/\s/g,'').substring(0,3)}`;
        
        // Use OSRM HMM to find the mathematical ground truth
        const matchResult = await performMapMatching(rawPings);
        
        if (!matchResult) return;

        const startTime = rawPings[0].timestamp;
        const endTime = rawPings[rawPings.length - 1].timestamp;

        // Save into MongoDB for the ML engine to learn from
        const newTrajectory = new Trajectory({
            id: tripHash,
            driverId,
            vehicleType: vehicleType || 'BUS',
            startNode,
            endNode,
            startTime,
            endTime,
            durationSeconds: matchResult.durationSeconds || Math.floor((endTime - startTime) / 1000),
            rawPings,
            snappedPolyline: matchResult.snappedPolyline,
            distanceMeters: matchResult.distanceMeters,
            confidenceScore: matchResult.confidence,
            isAnomaly: matchResult.confidence < 0.6 // Flag weird routes
        });

        await newTrajectory.save();
        console.log(`🧠 AI Routing: Harvested & Saved ${matchResult.distanceMeters}m trajectory for ${startNode} -> ${endNode}`);
        
    } catch (err) {
         console.error("AI Routing Telemetry Harvest Error:", err.message);
    }
};

/**
 * 3. DYNAMIC ROUTE OPTIMIZATION (Future ML Node)
 * Later, this will fetch from MongoDB Graph instead of OSRM.
 */
export const getOptimalRoute = async (startLoc, endLoc) => {
    // Phase 1: Call Google Maps / OSRM API directly
    // Phase 2: Check MongoDB Trajectories for physical overlap "crowdsourced" shortcuts
    // For now, return OSRM direct polyline:
    
    const url = `${OSRM_API}/route/v1/driving/${startLoc.lng},${startLoc.lat};${endLoc.lng},${endLoc.lat}?overview=full&geometries=geojson`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.code === 'Ok' && data.routes.length > 0) {
            return {
                points: data.routes[0].geometry.coordinates.map(c => ({ lat: c[1], lng: c[0] })),
                distanceKm: (data.routes[0].distance / 1000).toFixed(1),
                durationMins: Math.ceil(data.routes[0].duration / 60)
            }
        }
        return null;
    } catch (e) {
        console.error("AI Routing OSRM Route Error:", e);
        return null;
    }
}

export default {
    performMapMatching,
    harvestTrajectoryData,
    getOptimalRoute
};
