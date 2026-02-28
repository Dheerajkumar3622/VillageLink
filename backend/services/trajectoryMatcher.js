/**
 * trajectoryMatcher.js
 * Phase 5: Hyper-Precision Dynamic Trajectory Matching Engine
 * 
 * Uses in-memory R-Tree spatial indexing + Golden Rule chronological filtering
 * to match Passengers with only the Drivers whose routes naturally intersect
 * the Passenger's start and end points in the correct sequential order.
 */

import RBush from 'rbush';

// --- IN-MEMORY STATE ---
// Map of driverId -> { trajectory: [{lat, lng}], activeIndex: number, meta: {} }
const activeDrivers = new Map();

// R-Tree for spatial bounding box queries
let spatialIndex = new RBush();

let ioRef = null;

// --- HAVERSINE DISTANCE (km) ---
function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// --- FIND CLOSEST POINT ON TRAJECTORY ---
function findClosestPointIndex(trajectory, targetLat, targetLng) {
    let minDist = Infinity;
    let minIdx = -1;
    for (let i = 0; i < trajectory.length; i++) {
        const d = haversine(trajectory[i].lat, trajectory[i].lng, targetLat, targetLng);
        if (d < minDist) {
            minDist = d;
            minIdx = i;
        }
    }
    return { index: minIdx, distance: minDist };
}

// --- REGISTER DRIVER TRAJECTORY ---
export function registerTrajectory(driverId, trajectory, meta = {}) {
    if (!trajectory || trajectory.length < 2) return;

    // Remove old entry if exists
    removeTrajectory(driverId);

    // Calculate bounding box for R-Tree
    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
    for (const pt of trajectory) {
        if (pt.lat < minLat) minLat = pt.lat;
        if (pt.lat > maxLat) maxLat = pt.lat;
        if (pt.lng < minLng) minLng = pt.lng;
        if (pt.lng > maxLng) maxLng = pt.lng;
    }

    const entry = {
        minX: minLng, minY: minLat,
        maxX: maxLng, maxY: maxLat,
        driverId
    };

    spatialIndex.insert(entry);

    activeDrivers.set(driverId, {
        trajectory,
        activeIndex: 0,
        meta: { ...meta, driverId },
        rbushEntry: entry,
        startedAt: Date.now()
    });

    console.log(`📍 Trajectory registered for Driver ${driverId} (${trajectory.length} points)`);
}

// --- UPDATE DRIVER POSITION (SNAP TO TRAJECTORY) ---
export function updateDriverPosition(driverId, lat, lng) {
    const driver = activeDrivers.get(driverId);
    if (!driver) return;

    // Snap to closest point on their own trajectory
    const { index } = findClosestPointIndex(driver.trajectory, lat, lng);
    if (index >= 0) {
        driver.activeIndex = index;
    }
    driver.lastLat = lat;
    driver.lastLng = lng;
    driver.lastUpdate = Date.now();
}

// --- REMOVE DRIVER TRAJECTORY ---
export function removeTrajectory(driverId) {
    const driver = activeDrivers.get(driverId);
    if (driver && driver.rbushEntry) {
        spatialIndex.remove(driver.rbushEntry, (a, b) => a.driverId === b.driverId);
    }
    activeDrivers.delete(driverId);
}

// --- THE GOLDEN RULE FILTER ---
/**
 * Given a passenger's start (Bahrar) and end (Bhadokra) coordinates,
 * find all active drivers whose trajectory:
 * 1. Passes within `maxSnapKm` of BOTH points
 * 2. Has startIdx < endIdx (correct direction)
 * 3. Driver's current position is BEFORE the start point (hasn't passed it yet)
 * 
 * Returns: Array of matching driver objects with ETA info
 */
export function findMatchingVehicles(startLat, startLng, endLat, endLng, maxSnapKm = 1.5) {
    const results = [];

    // Quick R-Tree bounding box pre-filter
    // Expand search box by ~maxSnapKm in degrees (~0.015 deg per km)
    const expand = maxSnapKm * 0.015;
    const searchBox = {
        minX: Math.min(startLng, endLng) - expand,
        minY: Math.min(startLat, endLat) - expand,
        maxX: Math.max(startLng, endLng) + expand,
        maxY: Math.max(startLat, endLat) + expand
    };

    const candidates = spatialIndex.search(searchBox);

    for (const candidate of candidates) {
        const driver = activeDrivers.get(candidate.driverId);
        if (!driver) continue;

        const traj = driver.trajectory;

        // Find closest trajectory points to start and end
        const startSnap = findClosestPointIndex(traj, startLat, startLng);
        const endSnap = findClosestPointIndex(traj, endLat, endLng);

        // Filter B: Proximity Snapping - both points must be within maxSnapKm of the trajectory
        if (startSnap.distance > maxSnapKm || endSnap.distance > maxSnapKm) continue;

        // THE GOLDEN RULE: Idx_Current < Idx_Start < Idx_End
        const currentIdx = driver.activeIndex;
        if (!(currentIdx < startSnap.index && startSnap.index < endSnap.index)) continue;

        // Calculate approximate ETA to pickup
        const pointsToPickup = startSnap.index - currentIdx;
        const totalPoints = traj.length;
        // Rough ETA: assume ~40km/h average rural speed
        const totalDistKm = haversine(traj[0].lat, traj[0].lng, traj[totalPoints - 1].lat, traj[totalPoints - 1].lng);
        const etaMinutes = Math.round((pointsToPickup / totalPoints) * (totalDistKm / 40) * 60);

        // Calculate segment distance (start -> end)
        const segmentDistKm = haversine(startLat, startLng, endLat, endLng);

        results.push({
            driverId: candidate.driverId,
            meta: driver.meta,
            etaMinutes: etaMinutes || 1,
            segmentDistKm: Math.round(segmentDistKm * 10) / 10,
            currentPosition: {
                lat: driver.lastLat || traj[currentIdx].lat,
                lng: driver.lastLng || traj[currentIdx].lng
            },
            snapDistanceStart: Math.round(startSnap.distance * 100) / 100,
            snapDistanceEnd: Math.round(endSnap.distance * 100) / 100
        });
    }

    // Sort by ETA (nearest arriving first)
    results.sort((a, b) => a.etaMinutes - b.etaMinutes);

    return results;
}

// --- GET ACTIVE STATS ---
export function getActiveTrajectoryCount() {
    return activeDrivers.size;
}

// --- INITIALIZE ---
export function initializeTrajectoryMatcher(io) {
    ioRef = io;
    console.log('🛣️  Trajectory Matcher Engine initialized');
}

export default {
    initializeTrajectoryMatcher,
    registerTrajectory,
    updateDriverPosition,
    removeTrajectory,
    findMatchingVehicles,
    getActiveTrajectoryCount
};
