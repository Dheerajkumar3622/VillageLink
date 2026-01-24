/**
 * Driver Allocation Service
 * Matches nearby available drivers to ride requests using geospatial queries
 */

import Models from '../models.js';
const { DriverLocation, User, ActiveTrip } = Models;

/**
 * Calculate Haversine distance between two points
 * @returns Distance in kilometers
 */
const haversine = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLng = (lng2 - lng1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

/**
 * Find best matching driver for a ride request
 * @param {number} pickupLat - Pickup latitude
 * @param {number} pickupLng - Pickup longitude
 * @param {string} vehicleType - Preferred vehicle type (optional)
 * @param {number} maxDistanceKm - Maximum search radius (default 5km)
 * @returns {Object|null} Best matching driver or null
 */
export const findBestDriver = async (pickupLat, pickupLng, vehicleType = null, maxDistanceKm = 5) => {
    try {
        // Build query for nearby available drivers
        const query = {
            location: {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: [pickupLng, pickupLat] // MongoDB uses [lng, lat]
                    },
                    $maxDistance: maxDistanceKm * 1000 // Convert to meters
                }
            },
            isOnline: true,
            currentTripId: null // Available only
        };

        // Add vehicle type filter if specified
        if (vehicleType) {
            query.vehicleType = vehicleType;
        }

        // Find up to 10 nearby drivers
        const nearbyDrivers = await DriverLocation.find(query).limit(10).lean();

        if (nearbyDrivers.length === 0) {
            console.log(`📍 No drivers found within ${maxDistanceKm}km of [${pickupLat}, ${pickupLng}]`);
            return null;
        }

        // Get driver details and calculate scores
        const scoredDrivers = await Promise.all(
            nearbyDrivers.map(async (driverLoc) => {
                const user = await User.findOne({ id: driverLoc.driverId }).lean();
                if (!user || user.isBanned) return null;

                // Calculate distance
                const distance = haversine(
                    pickupLat, pickupLng,
                    driverLoc.location.coordinates[1],
                    driverLoc.location.coordinates[0]
                );

                // Calculate score (higher is better)
                const distanceScore = Math.max(0, 100 - distance * 20); // Closer = higher
                const verifiedBonus = user.isVerified ? 20 : 0;

                // 100x: Hero Bonus (Prioritize high-performing drivers)
                const heroBonus = Math.min(30, (user.heroLevel || 1) * 2);

                return {
                    driverId: driverLoc.driverId,
                    driverName: user.name,
                    location: {
                        lat: driverLoc.location.coordinates[1],
                        lng: driverLoc.location.coordinates[0]
                    },
                    distance: Math.round(distance * 100) / 100, // km
                    vehicleType: driverLoc.vehicleType,
                    heading: driverLoc.heading,
                    speed: driverLoc.speed,
                    score: distanceScore + verifiedBonus + heroBonus,
                    isVerified: user.isVerified,
                    heroLevel: user.heroLevel || 1
                };
            })
        );

        // Filter out null entries and sort by score
        const validDrivers = scoredDrivers.filter(d => d !== null);
        validDrivers.sort((a, b) => b.score - a.score);

        if (validDrivers.length === 0) {
            return null;
        }

        console.log(`🚗 Found ${validDrivers.length} drivers. Best: ${validDrivers[0].driverName} (${validDrivers[0].distance}km)`);
        return validDrivers[0];

    } catch (error) {
        console.error('❌ Driver allocation error:', error);
        return null;
    }
};

/**
 * Assign a driver to a trip
 * @param {string} tripId - Trip ID
 * @param {string} driverId - Driver ID to assign
 * @returns {boolean} Success status
 */
export const assignDriverToTrip = async (tripId, driverId) => {
    try {
        // Update trip with driver assignment
        await ActiveTrip.findOneAndUpdate(
            { tripId },
            {
                driverId,
                status: 'DRIVER_ASSIGNED'
            }
        );

        // Mark driver as busy
        await DriverLocation.findOneAndUpdate(
            { driverId },
            { currentTripId: tripId }
        );

        console.log(`✅ Driver ${driverId} assigned to trip ${tripId}`);
        return true;

    } catch (error) {
        console.error('❌ Assignment error:', error);
        return false;
    }
};

/**
 * Release driver from a trip (after completion or cancellation)
 * @param {string} driverId - Driver ID
 */
export const releaseDriver = async (driverId) => {
    try {
        await DriverLocation.findOneAndUpdate(
            { driverId },
            { currentTripId: null }
        );
        console.log(`🔓 Driver ${driverId} released`);
    } catch (error) {
        console.error('❌ Release error:', error);
    }
};

/**
 * Get all online drivers (for map display)
 * @param {Object} bounds - Map bounds { north, south, east, west }
 * @returns {Array} Array of driver locations
 */
export const getOnlineDriversInBounds = async (bounds) => {
    try {
        const drivers = await DriverLocation.find({
            isOnline: true,
            'location.coordinates.0': { $gte: bounds.west, $lte: bounds.east },
            'location.coordinates.1': { $gte: bounds.south, $lte: bounds.north }
        }).lean();

        return drivers.map(d => ({
            driverId: d.driverId,
            lat: d.location.coordinates[1],
            lng: d.location.coordinates[0],
            heading: d.heading,
            speed: d.speed,
            vehicleType: d.vehicleType
        }));

    } catch (error) {
        console.error('❌ Get drivers error:', error);
        return [];
    }
};

/**
 * Update driver location
 * @param {string} driverId - Driver ID
 * @param {Object} locationData - Location data from GPS
 */
export const updateDriverLocation = async (driverId, locationData) => {
    try {
        await DriverLocation.findOneAndUpdate(
            { driverId },
            {
                location: {
                    type: 'Point',
                    coordinates: [locationData.lng, locationData.lat]
                },
                speed: locationData.speed || 0,
                heading: locationData.heading || 0,
                accuracy: locationData.accuracy || 100,
                source: locationData.source || 'GPS',
                isOnline: true,
                lastUpdated: new Date()
            },
            { upsert: true, new: true }
        );
    } catch (error) {
        console.error('❌ Location update error:', error);
    }
};

/**
 * Set driver online/offline status
 */
export const setDriverOnline = async (driverId, vehicleType = 'BUS') => {
    await DriverLocation.findOneAndUpdate(
        { driverId },
        { isOnline: true, vehicleType, lastUpdated: new Date() },
        { upsert: true }
    );
    console.log(`🟢 Driver ${driverId} is ONLINE`);
};

export const setDriverOffline = async (driverId) => {
    await DriverLocation.findOneAndUpdate(
        { driverId },
        { isOnline: false, currentTripId: null, lastUpdated: new Date() }
    );
    console.log(`⚫ Driver ${driverId} is OFFLINE`);
};

// Default export for CJS compatibility
export default {
    findBestDriver,
    assignDriverToTrip,
    releaseDriver,
    getOnlineDriversInBounds,
    updateDriverLocation,
    setDriverOnline,
    setDriverOffline
};
