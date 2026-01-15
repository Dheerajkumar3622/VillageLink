/**
 * Dynamic Re-routing Service
 * Monitors active trips for traffic conditions and suggests alternate routes
 */

import { ActiveTrip } from '../models.js';
import { getRealRoadPath } from '../logic.js';
import { detectSlowdownsOnRoute, getTrafficWeight } from './trafficAggregatorService.js';

// --- CONSTANTS ---

const REROUTE_CHECK_INTERVAL_MS = 60000; // Check every minute
const MIN_DELAY_FOR_REROUTE = 5; // Minimum 5 minutes delay to suggest reroute
const REROUTE_COOLDOWN_MS = 300000; // 5 minutes between reroute suggestions

// Track last reroute time per trip
const lastRerouteTime = new Map();

// Socket.IO reference
let io = null;

/**
 * Initialize the re-routing service
 * @param {Server} socketIo - Socket.IO server instance
 */
export const initializeReroutingService = (socketIo) => {
    io = socketIo;

    // Start periodic check for all active trips
    setInterval(checkAllActiveTrips, REROUTE_CHECK_INTERVAL_MS);

    console.log('🔄 Dynamic Re-routing Service initialized');
};

/**
 * Check all active trips for potential re-routing
 */
const checkAllActiveTrips = async () => {
    try {
        const activeTrips = await ActiveTrip.find({
            status: 'TRIP_ACTIVE'
        }).lean();

        for (const trip of activeTrips) {
            await checkTripForReroute(trip);
        }
    } catch (error) {
        console.error('❌ Active trip check error:', error);
    }
};

/**
 * Check a specific trip for re-routing needs
 * @param {Object} trip - Active trip document
 */
const checkTripForReroute = async (trip) => {
    const { tripId, routePolyline, driverId, passengerId, dropoffLocation } = trip;

    // Check cooldown
    const lastReroute = lastRerouteTime.get(tripId) || 0;
    if (Date.now() - lastReroute < REROUTE_COOLDOWN_MS) {
        return; // Still in cooldown period
    }

    // Skip if no route data
    if (!routePolyline || routePolyline.length < 2) {
        return;
    }

    try {
        // Convert route to coordinates for traffic check
        const routeCoordinates = routePolyline.map(coord => ({
            lat: coord[0],
            lng: coord[1]
        }));

        // Detect slowdowns on current route
        const slowdownInfo = await detectSlowdownsOnRoute(routeCoordinates);

        if (slowdownInfo.hasSlowdown && slowdownInfo.estimatedDelayMinutes >= MIN_DELAY_FOR_REROUTE) {
            console.log(`🚧 Trip ${tripId}: Significant delay detected (${slowdownInfo.estimatedDelayMinutes} min)`);

            // Get driver's current position (from last known location in route)
            // In production, this would come from real-time driver location
            const currentPosition = routeCoordinates[Math.floor(routeCoordinates.length * 0.3)]; // Approximate 30% progress

            // Calculate alternate route
            const alternateRoute = await calculateAlternateRoute(
                currentPosition.lat,
                currentPosition.lng,
                dropoffLocation.lat,
                dropoffLocation.lng,
                slowdownInfo.affectedSegments
            );

            if (alternateRoute && alternateRoute.isFaster) {
                // Suggest reroute
                await suggestReroute(tripId, driverId, passengerId, alternateRoute, slowdownInfo);
                lastRerouteTime.set(tripId, Date.now());
            }
        }
    } catch (error) {
        console.error(`❌ Reroute check error for ${tripId}:`, error);
    }
};

/**
 * Calculate an alternate route avoiding traffic
 * @returns {Object|null} Alternate route data or null
 */
const calculateAlternateRoute = async (startLat, startLng, endLat, endLng, affectedSegments) => {
    try {
        // Get new route from OSRM
        const newRoute = await getRealRoadPath(startLat, startLng, endLat, endLng);

        if (!newRoute || !newRoute.pathDetails) {
            return null;
        }

        // Check if new route avoids the congested segments
        const newRouteCoordinates = newRoute.pathDetails;
        const newSlowdownInfo = await detectSlowdownsOnRoute(newRouteCoordinates);

        // Compare routes
        const currentDelay = affectedSegments.reduce((sum, seg) => {
            if (seg.congestionLevel === 'JAM') return sum + 3;
            if (seg.congestionLevel === 'HEAVY') return sum + 1.5;
            if (seg.congestionLevel === 'SLOW') return sum + 0.5;
            return sum;
        }, 0);

        const newRouteDelay = newSlowdownInfo.estimatedDelayMinutes || 0;

        // New route is better if delay is at least 3 minutes less
        const isFaster = (currentDelay - newRouteDelay) >= 3;

        if (isFaster) {
            return {
                isFaster: true,
                newPath: newRouteCoordinates,
                newDistance: newRoute.distance,
                newDuration: newRoute.duration,
                savedMinutes: Math.round(currentDelay - newRouteDelay),
                reason: 'Traffic detected on current route'
            };
        }

        return null;
    } catch (error) {
        console.error('❌ Alternate route calculation error:', error);
        return null;
    }
};

/**
 * Suggest a reroute to driver and notify passenger
 */
const suggestReroute = async (tripId, driverId, passengerId, alternateRoute, slowdownInfo) => {
    try {
        // Update trip with new route option
        await ActiveTrip.findOneAndUpdate(
            { tripId },
            {
                $set: {
                    alternateRoute: {
                        path: alternateRoute.newPath,
                        distance: alternateRoute.newDistance,
                        duration: alternateRoute.newDuration,
                        savedMinutes: alternateRoute.savedMinutes,
                        suggestedAt: new Date()
                    }
                }
            }
        );

        // Notify driver with new route suggestion
        if (io && driverId) {
            io.to(`driver_${driverId}`).emit('reroute_suggested', {
                tripId,
                reason: alternateRoute.reason,
                savedMinutes: alternateRoute.savedMinutes,
                newPath: alternateRoute.newPath.map(c => [c.lat, c.lng]),
                newDistance: alternateRoute.newDistance,
                newDuration: alternateRoute.newDuration,
                trafficInfo: {
                    severity: slowdownInfo.severity,
                    delayMinutes: slowdownInfo.estimatedDelayMinutes
                }
            });

            console.log(`🔄 Reroute suggestion sent to driver ${driverId} for trip ${tripId}`);
        }

        // Notify passenger about potential delay and reroute
        if (io && passengerId) {
            io.to(`passenger_${passengerId}`).emit('trip_update', {
                tripId,
                type: 'REROUTE_SUGGESTED',
                message: `Traffic detected ahead. Driver may take an alternate route to save ${alternateRoute.savedMinutes} minutes.`,
                originalDelay: slowdownInfo.estimatedDelayMinutes,
                savedMinutes: alternateRoute.savedMinutes
            });
        }
    } catch (error) {
        console.error('❌ Suggest reroute error:', error);
    }
};

/**
 * Handle driver accepting reroute
 * @param {string} tripId - Trip ID
 * @param {string} driverId - Driver ID
 */
export const acceptReroute = async (tripId, driverId) => {
    try {
        const trip = await ActiveTrip.findOne({ tripId });

        if (trip && trip.alternateRoute) {
            // Update trip with new route
            await ActiveTrip.findOneAndUpdate(
                { tripId },
                {
                    $set: {
                        routePolyline: trip.alternateRoute.path.map(c => [c.lat, c.lng]),
                        currentEtaMinutes: trip.alternateRoute.duration,
                        distanceKm: trip.alternateRoute.distance
                    },
                    $unset: { alternateRoute: 1 }
                }
            );

            // Notify passenger
            if (io) {
                io.to(`passenger_${trip.passengerId}`).emit('trip_update', {
                    tripId,
                    type: 'ROUTE_CHANGED',
                    message: 'Driver is taking a faster route to avoid traffic.',
                    newEta: trip.alternateRoute.duration
                });
            }

            console.log(`✅ Reroute accepted for trip ${tripId}`);
        }
    } catch (error) {
        console.error('❌ Accept reroute error:', error);
    }
};

/**
 * Handle driver declining reroute
 * @param {string} tripId - Trip ID
 */
export const declineReroute = async (tripId) => {
    try {
        await ActiveTrip.findOneAndUpdate(
            { tripId },
            { $unset: { alternateRoute: 1 } }
        );
        console.log(`❌ Reroute declined for trip ${tripId}`);
    } catch (error) {
        console.error('❌ Decline reroute error:', error);
    }
};

/**
 * Manual check for a specific trip (can be called via API)
 * @param {string} tripId - Trip ID
 * @returns {Object} Reroute suggestion or null
 */
export const checkTripForRerouteManual = async (tripId) => {
    const trip = await ActiveTrip.findOne({ tripId }).lean();
    if (!trip) return { error: 'Trip not found' };

    await checkTripForReroute(trip);

    const updatedTrip = await ActiveTrip.findOne({ tripId }).lean();
    return {
        hasAlternateRoute: !!updatedTrip.alternateRoute,
        alternateRoute: updatedTrip.alternateRoute || null
    };
};

/**
 * Cleanup reroute data for completed trips
 */
export const cleanupCompletedTrip = (tripId) => {
    lastRerouteTime.delete(tripId);
};
