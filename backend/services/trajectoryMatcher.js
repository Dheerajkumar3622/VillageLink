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
function normalizeStopName(s) {
    return String(s || '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ');
}

function stopMatches(query, candidate) {
    const q = normalizeStopName(query);
    const c = normalizeStopName(candidate);
    if (!q || !c) return false;
    return c.includes(q) || q.includes(c);
}

/** Map stop list index [0..n-1] to polyline index */
function stopIndexToTrajIndex(stopIdx, numStops, trajLen) {
    if (trajLen < 2) return 0;
    if (numStops <= 1) return 0;
    return Math.min(trajLen - 1, Math.round((stopIdx / (numStops - 1)) * (trajLen - 1)));
}

function trajSegmentDistanceKm(traj, fromIdx, toIdx) {
    if (!traj || fromIdx >= toIdx) return 0;
    let d = 0;
    for (let i = fromIdx; i < toIdx && i < traj.length - 1; i++) {
        d += haversine(traj[i].lat, traj[i].lng, traj[i + 1].lat, traj[i + 1].lng);
    }
    return d;
}

/**
 * Match drivers by ordered stop names (same direction as registered trajectory).
 * Example: route A..H forward or H..A reverse — stop order in meta.stopNames must match travel order.
 */
export function findMatchingVehiclesByStops(fromStop, toStop, maxEtaMinutes = 30, avgSpeedKmh = 38) {
    const results = [];
    for (const [driverId, driver] of activeDrivers) {
        const stops = driver.meta?.stopNames;
        const traj = driver.trajectory;
        if (!stops || stops.length < 2 || !traj || traj.length < 2) continue;

        let idxFrom = -1;
        let idxTo = -1;
        for (let i = 0; i < stops.length; i++) {
            if (idxFrom < 0 && stopMatches(fromStop, stops[i])) idxFrom = i;
            if (stopMatches(toStop, stops[i])) idxTo = i;
        }
        if (idxFrom < 0 || idxTo < 0 || idxFrom >= idxTo) continue;

        const nStops = stops.length;
        const startTrajIdx = stopIndexToTrajIndex(idxFrom, nStops, traj.length);
        const endTrajIdx = stopIndexToTrajIndex(idxTo, nStops, traj.length);
        const currentIdx = driver.activeIndex;

        if (!(currentIdx < startTrajIdx && startTrajIdx < endTrajIdx)) continue;

        const distPickupKm = trajSegmentDistanceKm(traj, currentIdx, startTrajIdx);
        const etaMinutes = Math.max(1, Math.round((distPickupKm / Math.max(avgSpeedKmh, 5)) * 60));
        if (etaMinutes > maxEtaMinutes) continue;

        const segmentDistKm = trajSegmentDistanceKm(traj, startTrajIdx, endTrajIdx);

        results.push({
            driverId,
            meta: driver.meta,
            etaMinutes,
            segmentDistKm: Math.round(segmentDistKm * 10) / 10,
            pickupStopIndex: idxFrom,
            dropStopIndex: idxTo,
            currentPosition: {
                lat: driver.lastLat || traj[currentIdx].lat,
                lng: driver.lastLng || traj[currentIdx].lng
            }
        });
    }

    results.sort((a, b) => a.etaMinutes - b.etaMinutes);
    return results;
}

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

/** Driver HUD + agent tools: snapshot of active trajectory for a driver */
export function getDriverRouteState(driverId) {
    const driver = activeDrivers.get(driverId);
    if (!driver) return null;
    const traj = driver.trajectory;
    const currentIdx = driver.activeIndex;
    return {
        driverId,
        active: true,
        activeIndex: currentIdx,
        trajectoryPointCount: traj.length,
        meta: driver.meta || {},
        stopNames: driver.meta?.stopNames || [],
        currentPosition: {
            lat: driver.lastLat ?? traj[Math.min(currentIdx, traj.length - 1)]?.lat,
            lng: driver.lastLng ?? traj[Math.min(currentIdx, traj.length - 1)]?.lng
        },
        lastUpdate: driver.lastUpdate || null
    };
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
    findMatchingVehiclesByStops,
    getActiveTrajectoryCount,
    getDriverRouteState
};
