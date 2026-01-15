/**
 * Driver Timeout Manager
 * Manages ride request timeouts and cascade re-allocation
 * when drivers don't respond within the timeout window
 */

import DriverAllocationService from './driverAllocationService.js';
const { findBestDriver, assignDriverToTrip, releaseDriver } = DriverAllocationService;

import Models from '../models.js';
const { ActiveTrip } = Models;

// --- CONSTANTS ---

const DEFAULT_TIMEOUT_MS = 30000; // 30 seconds to respond
const MAX_ALLOCATION_ATTEMPTS = 5; // Maximum drivers to try before giving up
const REALLOCATION_DELAY_MS = 2000; // Wait 2s before trying next driver

// Active timeouts by tripId
const activeTimeouts = new Map();

// Track declined drivers per trip
const declinedDrivers = new Map();

// Socket.IO reference (set during initialization)
let io = null;

/**
 * Initialize the timeout manager with Socket.IO instance
 * @param {Server} socketIo - Socket.IO server instance
 */
export const initializeTimeoutManager = (socketIo) => {
    io = socketIo;
    console.log('⏱️ Driver Timeout Manager initialized');
};

/**
 * Start tracking timeout for a ride request
 * @param {string} tripId - Trip ID
 * @param {string} driverId - Assigned driver ID
 * @param {Object} tripData - Trip details for re-allocation
 * @returns {void}
 */
export const startTimeout = (tripId, driverId, tripData) => {
    // Clear any existing timeout
    clearTimeout(tripId);

    const timeout = setTimeout(async () => {
        console.log(`⏱️ Driver ${driverId} timed out for trip ${tripId}`);
        await handleTimeout(tripId, driverId, tripData);
    }, DEFAULT_TIMEOUT_MS);

    activeTimeouts.set(tripId, {
        timeoutId: timeout,
        driverId,
        tripData,
        startTime: Date.now()
    });

    console.log(`⏱️ Timeout started for trip ${tripId} - Driver ${driverId} has 30s to respond`);
};

/**
 * Clear timeout when driver responds (accepts/rejects)
 * @param {string} tripId - Trip ID
 */
export const clearTimeout = (tripId) => {
    const timeoutData = activeTimeouts.get(tripId);
    if (timeoutData) {
        global.clearTimeout(timeoutData.timeoutId);
        activeTimeouts.delete(tripId);
        console.log(`⏱️ Timeout cleared for trip ${tripId}`);
    }
};

/**
 * Handle driver timeout - try to find another driver
 * @param {string} tripId - Trip ID
 * @param {string} timedOutDriverId - Driver who timed out
 * @param {Object} tripData - Trip data for re-allocation
 */
const handleTimeout = async (tripId, timedOutDriverId, tripData) => {
    try {
        // Mark this driver as declined for this trip
        addDeclinedDriver(tripId, timedOutDriverId);

        // Release the timed-out driver
        await releaseDriver(timedOutDriverId);

        // Update trip status
        await ActiveTrip.findOneAndUpdate(
            { tripId },
            { status: 'SEARCHING', driverId: null }
        );

        // Notify passenger about re-allocation
        if (io) {
            io.to(`passenger_${tripData.passengerId}`).emit('driver_timeout', {
                tripId,
                message: 'Driver did not respond. Finding another driver...'
            });
        }

        // Attempt re-allocation after short delay
        setTimeout(() => attemptReallocation(tripId, tripData), REALLOCATION_DELAY_MS);
    } catch (error) {
        console.error('❌ Timeout handling error:', error);
    }
};

/**
 * Attempt to find and assign another driver
 * @param {string} tripId - Trip ID
 * @param {Object} tripData - Trip data
 */
const attemptReallocation = async (tripId, tripData) => {
    // Check how many attempts we've made
    const declined = declinedDrivers.get(tripId) || new Set();

    if (declined.size >= MAX_ALLOCATION_ATTEMPTS) {
        console.log(`❌ Trip ${tripId}: Max allocation attempts reached`);
        await markTripFailed(tripId, tripData.passengerId);
        return;
    }

    try {
        // Find another driver, excluding declined ones
        const newDriver = await findBestDriverExcluding(
            tripData.pickup.lat,
            tripData.pickup.lng,
            Array.from(declined),
            tripData.vehicleType
        );

        if (newDriver) {
            console.log(`🚗 Found new driver ${newDriver.driverId} for trip ${tripId}`);

            // Assign and start new timeout
            await assignDriverToTrip(tripId, newDriver.driverId);

            // Notify new driver
            if (io) {
                io.to(`driver_${newDriver.driverId}`).emit('ride_request', {
                    tripId,
                    pickup: tripData.pickup,
                    dropoff: tripData.dropoff,
                    passengerName: tripData.passengerName,
                    fare: tripData.fare,
                    isReallocation: true
                });

                // Notify passenger about new driver
                io.to(`passenger_${tripData.passengerId}`).emit('driver_found', {
                    tripId,
                    driver: {
                        id: newDriver.driverId,
                        name: newDriver.driverName,
                        distance: newDriver.distance,
                        location: newDriver.location,
                        vehicleType: newDriver.vehicleType
                    },
                    isReallocation: true
                });
            }

            // Start timeout for new driver
            startTimeout(tripId, newDriver.driverId, tripData);
        } else {
            console.log(`❌ No available drivers for trip ${tripId}`);
            await markTripFailed(tripId, tripData.passengerId);
        }
    } catch (error) {
        console.error('❌ Reallocation error:', error);
        await markTripFailed(tripId, tripData.passengerId);
    }
};

/**
 * Find best driver excluding specific driver IDs
 * @param {number} lat - Pickup latitude
 * @param {number} lng - Pickup longitude
 * @param {Array} excludeIds - Driver IDs to exclude
 * @param {string} vehicleType - Preferred vehicle type
 * @returns {Object|null} Best matching driver or null
 */
const findBestDriverExcluding = async (lat, lng, excludeIds, vehicleType) => {
    // Import the driver allocation module
    const { DriverLocation, User } = await import('../models.js');

    try {
        const query = {
            location: {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: [lng, lat]
                    },
                    $maxDistance: 10000 // 10km
                }
            },
            isOnline: true,
            currentTripId: null,
            driverId: { $nin: excludeIds }
        };

        if (vehicleType) {
            query.vehicleType = vehicleType;
        }

        const nearbyDrivers = await DriverLocation.find(query).limit(5).lean();

        if (nearbyDrivers.length === 0) return null;

        // Get first available driver with user details
        for (const driverLoc of nearbyDrivers) {
            const user = await User.findOne({ id: driverLoc.driverId }).lean();
            if (user && !user.isBanned) {
                return {
                    driverId: driverLoc.driverId,
                    driverName: user.name,
                    location: {
                        lat: driverLoc.location.coordinates[1],
                        lng: driverLoc.location.coordinates[0]
                    },
                    distance: calculateDistance(
                        lat, lng,
                        driverLoc.location.coordinates[1],
                        driverLoc.location.coordinates[0]
                    ),
                    vehicleType: driverLoc.vehicleType
                };
            }
        }

        return null;
    } catch (error) {
        console.error('❌ Find driver error:', error);
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
    return Math.round(R * c * 100) / 100;
};

/**
 * Mark trip as failed (no drivers available)
 */
const markTripFailed = async (tripId, passengerId) => {
    try {
        await ActiveTrip.findOneAndUpdate(
            { tripId },
            { status: 'NO_DRIVERS' }
        );

        if (io) {
            io.to(`passenger_${passengerId}`).emit('no_drivers_available', {
                tripId,
                message: 'No drivers available at this time. Please try again later.'
            });
        }

        // Cleanup
        cleanupTrip(tripId);
    } catch (error) {
        console.error('❌ Mark trip failed error:', error);
    }
};

/**
 * Add driver to declined list for a trip
 */
const addDeclinedDriver = (tripId, driverId) => {
    if (!declinedDrivers.has(tripId)) {
        declinedDrivers.set(tripId, new Set());
    }
    declinedDrivers.get(tripId).add(driverId);
};

/**
 * Handle explicit driver rejection
 * @param {string} tripId - Trip ID
 * @param {string} driverId - Driver who rejected
 */
export const handleDriverRejection = async (tripId, driverId) => {
    console.log(`🚫 Driver ${driverId} rejected trip ${tripId}`);

    // Clear timeout
    clearTimeout(tripId);

    // Get trip data from active timeout or fetch from DB
    let tripData = activeTimeouts.get(tripId)?.tripData;

    if (!tripData) {
        const trip = await ActiveTrip.findOne({ tripId }).lean();
        if (trip) {
            tripData = {
                pickup: trip.pickupLocation,
                dropoff: trip.dropoffLocation,
                passengerId: trip.passengerId,
                passengerName: trip.passengerName || 'Passenger',
                vehicleType: trip.vehicleType,
                fare: trip.fare
            };
        }
    }

    if (tripData) {
        // Handle same as timeout
        await handleTimeout(tripId, driverId, tripData);
    }
};

/**
 * Handle driver acceptance - stop timeout and proceed
 * @param {string} tripId - Trip ID
 * @param {string} driverId - Driver who accepted
 */
export const handleDriverAcceptance = (tripId, driverId) => {
    console.log(`✅ Driver ${driverId} accepted trip ${tripId}`);

    // Clear timeout
    clearTimeout(tripId);

    // Cleanup declined drivers for this trip
    declinedDrivers.delete(tripId);
};

/**
 * Cleanup trip data
 */
const cleanupTrip = (tripId) => {
    clearTimeout(tripId);
    declinedDrivers.delete(tripId);
};

/**
 * Get remaining time for driver to respond
 * @param {string} tripId - Trip ID
 * @returns {number} Remaining seconds or 0
 */
export const getRemainingTime = (tripId) => {
    const timeoutData = activeTimeouts.get(tripId);
    if (!timeoutData) return 0;

    const elapsed = Date.now() - timeoutData.startTime;
    return Math.max(0, Math.ceil((DEFAULT_TIMEOUT_MS - elapsed) / 1000));
};

/**
 * Get active timeout info (for debugging)
 */
export const getActiveTimeouts = () => {
    const info = [];
    for (const [tripId, data] of activeTimeouts.entries()) {
        info.push({
            tripId,
            driverId: data.driverId,
            remainingSeconds: getRemainingTime(tripId)
        });
    }
    return info;
};

// Default export for CJS compatibility
export default {
    initializeTimeoutManager,
    startTimeout,
    clearTimeout,
    handleDriverRejection,
    handleDriverAcceptance,
    getRemainingTime,
    getActiveTimeouts
};
