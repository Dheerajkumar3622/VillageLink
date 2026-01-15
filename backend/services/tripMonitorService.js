/**
 * Trip Monitor Service
 * Monitors active trips in real-time, detects delays vs expected route,
 * and triggers re-routing when significant delays occur
 */

import { ActiveTrip, DriverLocation } from '../models.js';
import { detectSlowdownsOnRoute, getTrafficAlongRoute } from './trafficAggregatorService.js';
import * as Logic from '../logic.js';

// --- CONSTANTS ---

const MONITOR_INTERVAL_MS = 30000; // Check every 30 seconds
const SIGNIFICANT_DELAY_THRESHOLD_MIN = 5; // Trigger re-route if 5+ min delay
const MIN_DISTANCE_FOR_REROUTE_KM = 1; // Don't re-route if less than 1km remaining
const ETA_RECALCULATION_INTERVAL_MS = 60000; // Recalculate ETA every minute

// Active monitoring interval
let monitorInterval = null;

// Socket.IO reference
let io = null;

// Cache of last known driver positions for distance calculation
const driverPositionCache = new Map();

// Last ETA update timestamps per trip
const lastEtaUpdate = new Map();

/**
 * Initialize the trip monitor with Socket.IO instance
 * @param {Server} socketIo - Socket.IO server instance
 */
export const initializeTripMonitor = (socketIo) => {
    io = socketIo;

    // Start the monitoring loop
    if (!monitorInterval) {
        monitorInterval = setInterval(monitorActiveTrips, MONITOR_INTERVAL_MS);
        console.log('🔍 Trip Monitor started - checking every 30s');
    }
};

/**
 * Stop the trip monitor
 */
export const stopTripMonitor = () => {
    if (monitorInterval) {
        clearInterval(monitorInterval);
        monitorInterval = null;
        console.log('🔍 Trip Monitor stopped');
    }
};

/**
 * Main monitoring loop - check all active trips
 */
const monitorActiveTrips = async () => {
    try {
        // Get all active trips
        const activeTrips = await ActiveTrip.find({
            status: { $in: ['EN_ROUTE', 'EN_ROUTE_PICKUP', 'IN_PROGRESS'] }
        }).lean();

        if (activeTrips.length === 0) return;

        console.log(`🔍 Monitoring ${activeTrips.length} active trips`);

        for (const trip of activeTrips) {
            await checkTripProgress(trip);
        }
    } catch (error) {
        console.error('❌ Trip monitor error:', error);
    }
};

/**
 * Check progress of a single trip
 * @param {Object} trip - Trip document
 */
const checkTripProgress = async (trip) => {
    try {
        // Get current driver position
        const driverLoc = await DriverLocation.findOne({ driverId: trip.driverId }).lean();
        if (!driverLoc) return;

        const currentPos = {
            lat: driverLoc.location.coordinates[1],
            lng: driverLoc.location.coordinates[0]
        };

        // Calculate remaining distance
        const destination = trip.status === 'EN_ROUTE_PICKUP'
            ? trip.pickupLocation
            : trip.dropoffLocation;

        const remainingKm = calculateDistance(
            currentPos.lat, currentPos.lng,
            destination.lat, destination.lng
        );

        // Skip if too close to destination
        if (remainingKm < MIN_DISTANCE_FOR_REROUTE_KM) {
            return;
        }

        // Check for traffic slowdowns along remaining route
        const remainingRoute = trip.routePolyline?.slice() || [currentPos, destination];
        const slowdownInfo = await detectSlowdownsOnRoute(remainingRoute);

        // Calculate new ETA
        const now = Date.now();
        const shouldRecalcEta = !lastEtaUpdate.has(trip.tripId) ||
            (now - lastEtaUpdate.get(trip.tripId)) > ETA_RECALCULATION_INTERVAL_MS;

        if (shouldRecalcEta || slowdownInfo.hasSlowdown) {
            const newEta = await calculateNewEta(currentPos, destination, slowdownInfo);

            // Update trip with new ETA
            await ActiveTrip.findOneAndUpdate(
                { tripId: trip.tripId },
                { currentEtaMinutes: newEta }
            );

            lastEtaUpdate.set(trip.tripId, now);

            // Notify passenger of ETA update
            if (io) {
                io.to(`passenger_${trip.passengerId}`).emit('eta_update', {
                    tripId: trip.tripId,
                    etaMinutes: newEta,
                    hasTrafficDelay: slowdownInfo.hasSlowdown,
                    delayMinutes: slowdownInfo.estimatedDelayMinutes
                });
            }
        }

        // Check if delay is significant enough for re-routing
        if (slowdownInfo.hasSlowdown && slowdownInfo.severity === 'SEVERE') {
            await triggerRerouting(trip, currentPos, destination, slowdownInfo);
        }
    } catch (error) {
        console.error(`❌ Trip ${trip.tripId} check error:`, error);
    }
};

/**
 * Calculate new ETA considering traffic
 * @param {Object} currentPos - Current driver position
 * @param {Object} destination - Destination coordinates
 * @param {Object} slowdownInfo - Traffic slowdown info
 * @returns {number} ETA in minutes
 */
const calculateNewEta = async (currentPos, destination, slowdownInfo) => {
    try {
        // Get route from OSRM
        const routeData = await Logic.getRealRoadPath(
            currentPos.lat, currentPos.lng,
            destination.lat, destination.lng
        );

        if (routeData) {
            // Base ETA from OSRM
            let etaMinutes = Math.ceil(routeData.duration / 60);

            // Add traffic delay
            if (slowdownInfo.estimatedDelayMinutes > 0) {
                etaMinutes += slowdownInfo.estimatedDelayMinutes;
            }

            return etaMinutes;
        }

        // Fallback: estimate based on straight-line distance
        const distKm = calculateDistance(
            currentPos.lat, currentPos.lng,
            destination.lat, destination.lng
        );

        // Assume 25 km/h average in village areas
        let etaMinutes = Math.ceil(distKm / 25 * 60);

        if (slowdownInfo.estimatedDelayMinutes > 0) {
            etaMinutes += slowdownInfo.estimatedDelayMinutes;
        }

        return etaMinutes;
    } catch (error) {
        console.error('❌ ETA calculation error:', error);
        return trip.originalEtaMinutes || 30;
    }
};

/**
 * Trigger re-routing for a trip
 * @param {Object} trip - Trip document
 * @param {Object} currentPos - Current driver position
 * @param {Object} destination - Destination
 * @param {Object} slowdownInfo - Slowdown details
 */
const triggerRerouting = async (trip, currentPos, destination, slowdownInfo) => {
    try {
        console.log(`🔄 Triggering re-route for trip ${trip.tripId}`);

        // Get alternate route from OSRM (with alternatives)
        const alternateRoute = await Logic.getRealRoadPath(
            currentPos.lat, currentPos.lng,
            destination.lat, destination.lng,
            { alternatives: true }
        );

        if (!alternateRoute || !alternateRoute.pathDetails) {
            console.log(`📍 No alternate route available for trip ${trip.tripId}`);
            return;
        }

        // Check if alternate is significantly faster
        const currentRouteDuration = trip.currentEtaMinutes * 60;
        const alternateRouteDuration = alternateRoute.duration;

        if (alternateRouteDuration < currentRouteDuration * 0.8) { // 20% faster
            // Update trip with new route
            await ActiveTrip.findOneAndUpdate(
                { tripId: trip.tripId },
                {
                    routePolyline: alternateRoute.pathDetails,
                    currentEtaMinutes: Math.ceil(alternateRoute.duration / 60),
                    isRerouted: true
                }
            );

            // Notify driver and passenger
            if (io) {
                const routeUpdate = {
                    tripId: trip.tripId,
                    newRoute: alternateRoute.pathDetails,
                    newEtaMinutes: Math.ceil(alternateRoute.duration / 60),
                    reason: 'Traffic congestion detected on current route',
                    oldEtaMinutes: trip.currentEtaMinutes
                };

                io.to(`driver_${trip.driverId}`).emit('route_update', routeUpdate);
                io.to(`passenger_${trip.passengerId}`).emit('route_update', routeUpdate);
            }

            console.log(`✅ Re-routed trip ${trip.tripId} - saved ${Math.ceil((currentRouteDuration - alternateRouteDuration) / 60)} min`);
        } else {
            console.log(`📍 No faster alternate route for trip ${trip.tripId}`);
        }
    } catch (error) {
        console.error(`❌ Re-routing error for trip ${trip.tripId}:`, error);
    }
};

/**
 * Manually trigger ETA recalculation for a trip
 * @param {string} tripId - Trip ID
 */
export const recalculateEta = async (tripId) => {
    const trip = await ActiveTrip.findOne({ tripId }).lean();
    if (trip) {
        lastEtaUpdate.delete(tripId); // Force recalculation
        await checkTripProgress(trip);
    }
};

/**
 * Get current trip status with live data
 * @param {string} tripId - Trip ID
 * @returns {Object} Trip status info
 */
export const getTripLiveStatus = async (tripId) => {
    try {
        const trip = await ActiveTrip.findOne({ tripId }).lean();
        if (!trip) return null;

        const driverLoc = await DriverLocation.findOne({ driverId: trip.driverId }).lean();

        const destination = trip.status === 'EN_ROUTE_PICKUP'
            ? trip.pickupLocation
            : trip.dropoffLocation;

        let remainingKm = 0;
        let driverPosition = null;

        if (driverLoc) {
            driverPosition = {
                lat: driverLoc.location.coordinates[1],
                lng: driverLoc.location.coordinates[0],
                heading: driverLoc.heading,
                speed: driverLoc.speed
            };

            remainingKm = calculateDistance(
                driverPosition.lat, driverPosition.lng,
                destination.lat, destination.lng
            );
        }

        return {
            tripId,
            status: trip.status,
            driverPosition,
            pickup: trip.pickupLocation,
            dropoff: trip.dropoffLocation,
            etaMinutes: trip.currentEtaMinutes,
            remainingKm: Math.round(remainingKm * 10) / 10,
            routePolyline: trip.routePolyline,
            isRerouted: trip.isRerouted || false
        };
    } catch (error) {
        console.error('❌ Get trip status error:', error);
        return null;
    }
};

/**
 * Calculate Haversine distance
 */
const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLng = (lng2 - lng1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

/**
 * Listen for driver location updates to update trip progress
 * Call this for each location stream event
 */
export const onDriverLocationUpdate = async (driverId, locationData) => {
    // Cache position
    driverPositionCache.set(driverId, {
        ...locationData,
        timestamp: Date.now()
    });

    // Find active trip for this driver
    const trip = await ActiveTrip.findOne({
        driverId,
        status: { $in: ['EN_ROUTE', 'EN_ROUTE_PICKUP', 'IN_PROGRESS'] }
    }).lean();

    if (trip && io) {
        // Broadcast position to passenger
        io.to(`passenger_${trip.passengerId}`).emit('driver_location_broadcast', {
            driverId,
            tripId: trip.tripId,
            ...locationData
        });
    }
};
