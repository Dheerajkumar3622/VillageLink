/**
 * Route Demand Service
 * Calculates route profitability, notifies drivers, and handles capacity overflow
 */

import { ActiveTrip, DriverLocation, User, Ticket } from '../models.js';

// --- CONSTANTS ---

const DEMAND_REFRESH_INTERVAL_MS = 30000; // Refresh every 30s
const HOT_ROUTE_THRESHOLD = 3; // Minimum pending bookings to be "hot"
const BROADCAST_RADIUS_KM = 10; // Notify drivers within 10km

// Socket.IO reference
let io = null;

// Cache of route demands
const routeDemandCache = new Map();

/**
 * Initialize with Socket.IO instance
 */
export const initializeRouteDemandService = (socketIo) => {
    io = socketIo;

    // Start periodic demand calculation
    setInterval(updateRouteDemands, DEMAND_REFRESH_INTERVAL_MS);
    console.log('📊 Route Demand Service initialized');
};

/**
 * Calculate demand score for a route segment
 */
export const calculateRouteDemand = async (fromVillage, toVillage) => {
    try {
        const now = Date.now();
        const oneHourAgo = now - 60 * 60 * 1000;

        // Count pending tickets for this route
        const pendingCount = await Ticket.countDocuments({
            from: fromVillage,
            to: toVillage,
            status: { $in: ['PENDING', 'PAID'] },
            timestamp: { $gte: oneHourAgo }
        });

        // Calculate demand score (0-100)
        const demandScore = Math.min(100, pendingCount * 20);

        return {
            fromVillage,
            toVillage,
            pendingPassengers: pendingCount,
            demandScore,
            isHot: pendingCount >= HOT_ROUTE_THRESHOLD,
            timestamp: now
        };
    } catch (error) {
        console.error('Demand calculation error:', error);
        return null;
    }
};

/**
 * Update all route demands and cache
 */
const updateRouteDemands = async () => {
    try {
        // Get active routes from recent tickets
        const recentTickets = await Ticket.aggregate([
            { $match: { timestamp: { $gte: Date.now() - 3600000 } } },
            { $group: { _id: { from: '$from', to: '$to' }, count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 20 }
        ]);

        for (const route of recentTickets) {
            const demand = await calculateRouteDemand(route._id.from, route._id.to);
            if (demand) {
                const key = `${route._id.from}|${route._id.to}`;
                routeDemandCache.set(key, demand);

                // Broadcast to nearby idle drivers if hot
                if (demand.isHot) {
                    await notifyNearbyDrivers(demand);
                }
            }
        }
    } catch (error) {
        console.error('Route demand update error:', error);
    }
};

/**
 * Find profitable routes near a driver
 */
export const getHotRoutesNearDriver = async (driverLat, driverLng) => {
    const hotRoutes = [];

    for (const [key, demand] of routeDemandCache.entries()) {
        if (demand.isHot) {
            hotRoutes.push({
                ...demand,
                routeKey: key
            });
        }
    }

    return hotRoutes
        .sort((a, b) => b.demandScore - a.demandScore)
        .slice(0, 5);
};

/**
 * Notify nearby idle drivers about a hot route
 */
const notifyNearbyDrivers = async (routeDemand) => {
    if (!io) return;

    try {
        // Find idle drivers
        const idleDrivers = await DriverLocation.find({
            isOnline: true,
            currentTripId: null
        }).lean();

        for (const driver of idleDrivers) {
            io.to(`driver_${driver.driverId}`).emit('hot_route_nearby', {
                from: routeDemand.fromVillage,
                to: routeDemand.toVillage,
                pendingPassengers: routeDemand.pendingPassengers,
                demandScore: routeDemand.demandScore,
                message: `${routeDemand.pendingPassengers} passengers waiting on ${routeDemand.fromVillage} → ${routeDemand.toVillage}`
            });
        }
    } catch (error) {
        console.error('Driver notification error:', error);
    }
};

/**
 * Check vehicle capacity and trigger overflow if needed
 */
export const checkCapacityOverflow = async (tripId, driverId, passengerCount) => {
    try {
        // Get driver's vehicle capacity
        const user = await User.findOne({ id: driverId }).lean();
        const vehicleCapacity = user?.vehicleCapacity || 20;

        // Get current passengers on this trip
        const trip = await ActiveTrip.findOne({ tripId }).lean();
        const currentLoad = trip?.currentPassengers || 0;

        const totalLoad = currentLoad + passengerCount;

        if (totalLoad > vehicleCapacity) {
            // Overflow detected!
            const overflowCount = totalLoad - vehicleCapacity;
            console.log(`⚠️ Capacity overflow on trip ${tripId}: ${overflowCount} extra passengers`);

            // Notify another available driver
            await requestOverflowVehicle(trip, overflowCount);

            return {
                overflow: true,
                overflowCount,
                vehicleCapacity,
                currentLoad: totalLoad
            };
        }

        return { overflow: false, currentLoad: totalLoad };
    } catch (error) {
        console.error('Capacity check error:', error);
        return { overflow: false };
    }
};

/**
 * Request another vehicle for overflow passengers
 */
const requestOverflowVehicle = async (trip, overflowCount) => {
    if (!io || !trip) return;

    try {
        // Find nearby available drivers (excluding current)
        const nearbyDrivers = await DriverLocation.find({
            isOnline: true,
            currentTripId: null,
            driverId: { $ne: trip.driverId }
        }).limit(5).lean();

        if (nearbyDrivers.length === 0) {
            console.log('❌ No available drivers for overflow');
            return;
        }

        // Notify first available driver
        const targetDriver = nearbyDrivers[0];

        io.to(`driver_${targetDriver.driverId}`).emit('overflow_request', {
            originalTripId: trip.tripId,
            route: {
                from: trip.pickupLocation?.name || trip.from,
                to: trip.dropoffLocation?.name || trip.to
            },
            passengerCount: overflowCount,
            message: `Overflow: ${overflowCount} passengers need pickup on ${trip.from} → ${trip.to}`,
            urgent: true
        });

        console.log(`🚐 Overflow request sent to driver ${targetDriver.driverId}`);
    } catch (error) {
        console.error('Overflow request error:', error);
    }
};

/**
 * Get current demand for display
 */
export const getCurrentDemand = () => {
    return Array.from(routeDemandCache.values())
        .filter(d => d.isHot)
        .sort((a, b) => b.demandScore - a.demandScore);
};
