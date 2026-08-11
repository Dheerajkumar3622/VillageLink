import express from 'express';
import { PassengerPresence, SmartStop, Ticket, User } from '../models.js';

const router = express.Router();

// Middleware to extract user (assumes authenticate middleware runs on parent server)
const requireAuth = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    next();
};

/**
 * POST /api/v2/presence/ping
 * Simulates or records a physical signal ping from a passenger ticket.
 * Supporting pluggable technologies: BLE, UWB, GPS, QR.
 */
router.post('/ping', async (req, res) => {
    try {
        const { passengerId, method, deviceId, rssi, gpsCoordinates, ticketId } = req.body;

        let resolvedPassengerId = passengerId;
        let ticket = null;

        if (ticketId) {
            ticket = await Ticket.findOne({ id: ticketId });
            if (ticket) {
                resolvedPassengerId = ticket.passengerId;
            }
        }

        if (method === 'ULTRASONIC' && !ticket) {
            return res.status(404).json({ error: 'Acoustic Ticket not found or invalid' });
        }

        if (!resolvedPassengerId) {
            return res.status(400).json({ error: 'passengerId is required' });
        }

        // Validate method
        const validMethods = ['BLE', 'UWB', 'GPS', 'QR', 'ULTRASONIC', 'NONE'];
        if (!validMethods.includes(method)) {
            return res.status(400).json({ error: 'Invalid detection method' });
        }

        // Resolve user detail and ticket categories
        const user = await User.findOne({ id: resolvedPassengerId });
        let category = 'REGULAR';
        if (user) {
            if (user.role === 'VIP') category = 'VIP';
            else if (user.preferredLanguage === 'LOCAL') category = 'STUDENT';
        }

        // Pluggable logic for resolving status
        let resolvedStatus = 'WAITING';
        let resolvedVehicleId = null;
        let resolvedStopId = null;

        if (method === 'BLE' || method === 'UWB') {
            if (deviceId.includes('BUS') || deviceId.includes('VEHICLE')) {
                resolvedStatus = rssi > -75 ? 'ONBOARD' : 'BOARDING';
                resolvedVehicleId = deviceId;
            } else {
                resolvedStatus = 'WAITING';
                resolvedStopId = deviceId;
            }
        } else if (method === 'GPS') {
            if (gpsCoordinates) {
                resolvedStopId = deviceId || 'STOP_MAIN';
                resolvedStatus = 'WAITING';
            }
        } else if (method === 'QR') {
            resolvedStatus = 'ONBOARD';
            resolvedVehicleId = deviceId || 'VEHICLE_AUTO_01';
        } else if (method === 'ULTRASONIC') {
            if (ticket) {
                if (ticket.status === 'USED') {
                    return res.status(400).json({ error: 'Ticket has already been verified/used' });
                }
                ticket.status = 'USED';
                ticket.onboardTime = new Date();
                await ticket.save();
            }
            resolvedStatus = 'ONBOARD';
            resolvedVehicleId = deviceId || 'VEHICLE_BUS_01';
        }

        // Upsert the Passenger Presence Record
        const presence = await PassengerPresence.findOneAndUpdate(
            { passengerId: resolvedPassengerId },
            {
                passengerName: user ? user.name : 'Unknown Passenger',
                ticketId: ticketId || 'TKT_DUMMY',
                vehicleId: resolvedVehicleId,
                stopId: resolvedStopId,
                detectionMethod: method,
                rssi: rssi || 0,
                lastSeen: Date.now(),
                status: resolvedStatus,
                category
            },
            { new: true, upsert: true }
        );

        // Recalculate smart stop stats dynamically if stopId is updated
        if (resolvedStopId) {
            await updateStopMetrics(resolvedStopId);
        }

        res.json({
            success: true,
            presence,
            resolvedState: resolvedStatus
        });

    } catch (error) {
        console.error('Error reporting passenger presence:', error);
        res.status(500).json({ error: 'Failed to record passenger presence status' });
    }
});

/**
 * GET /api/v2/presence/vehicle/:vehicleId
 * Returns passenger list and seat breakdown for Driver Dashboard.
 */
router.get('/vehicle/:vehicleId', async (req, res) => {
    try {
        const { vehicleId } = req.params;

        const onboard = await PassengerPresence.find({
            vehicleId,
            status: { $in: ['ONBOARD', 'BOARDING'] }
        });

        // Compute categories
        const categories = {
            women: onboard.filter(p => p.category === 'WOMEN').length,
            senior: onboard.filter(p => p.category === 'SENIOR_CITIZEN').length,
            disabled: onboard.filter(p => p.category === 'DISABLED').length,
            children: onboard.filter(p => p.category === 'CHILDREN').length,
            vip: onboard.filter(p => p.category === 'VIP').length,
            student: onboard.filter(p => p.category === 'STUDENT').length,
            regular: onboard.filter(p => p.category === 'REGULAR').length
        };

        res.json({
            vehicleId,
            totalOnboard: onboard.length,
            seatOccupancyPercent: Math.min(100, (onboard.length / 40) * 100), // Default limit 40
            passengers: onboard,
            categories
        });
    } catch (error) {
        console.error('Error fetching vehicle presence:', error);
        res.status(500).json({ error: 'Failed to fetch vehicle passenger list' });
    }
});

/**
 * GET /api/v2/presence/stop/:stopId
 * Returns queuing stats for Smart Stop Panels.
 */
router.get('/stop/:stopId', async (req, res) => {
    try {
        const { stopId } = req.params;

        let stop = await SmartStop.findOne({ stopId });
        if (!stop) {
            // Seed a placeholder stop if it does not exist
            stop = new SmartStop({
                stopId,
                name: stopId.replace('_', ' ').toUpperCase(),
                lat: 25.612,
                lng: 85.131
            });
            await stop.save();
        }

        // Dynamically compute wait queue stats from live records
        const activeWaiting = await PassengerPresence.find({
            stopId,
            status: 'WAITING',
            lastSeen: { $gt: Date.now() - 300000 } // Active within 5 minutes
        });

        stop.waitingCount = activeWaiting.length;
        stop.crowdDensity = stop.waitingCount > 15 ? 'HIGH' : (stop.waitingCount > 5 ? 'MEDIUM' : 'LOW');
        
        // Count categories
        stop.passengerCategories = {
            women: activeWaiting.filter(p => p.category === 'WOMEN').length,
            senior: activeWaiting.filter(p => p.category === 'SENIOR_CITIZEN').length,
            disabled: activeWaiting.filter(p => p.category === 'DISABLED').length,
            children: activeWaiting.filter(p => p.category === 'CHILDREN').length,
            vip: activeWaiting.filter(p => p.category === 'VIP').length,
            student: activeWaiting.filter(p => p.category === 'STUDENT').length
        };

        await stop.save();

        // Calculate real incoming vehicles for this stop from DriverLocation and Route
        let incomingVehicles = [];
        try {
            const { DriverLocation, Route } = await import('../models.js');
            const activeDrivers = await DriverLocation.find({ active: true }).lean();
            for (const d of activeDrivers) {
                if (d.activeRouteId) {
                    const route = await Route.findOne({ id: d.activeRouteId }).lean();
                    if (route) {
                        const totalSeats = d.seatsTotal || 40;
                        const occupied = d.seatsOccupied || 0;
                        const pct = Math.round((occupied / totalSeats) * 100);
                        incomingVehicles.push({
                            id: d.driverId || 'VL-BUS-LIVE',
                            route: `${route.from} ➔ ${route.to}`,
                            eta: '4 min',
                            occupancy: `${pct}%`
                        });
                    }
                }
            }
        } catch (e) {
            console.warn('Driver location lookup failed:', e.message);
        }

        if (incomingVehicles.length === 0) {
            incomingVehicles = [
                { id: 'VL-BUS-101', route: 'Village Central ➔ Mandi Terminal', eta: '3 min', occupancy: '65%' },
                { id: 'VL-AUTO-204', route: 'Block A ➔ Main Stop', eta: '7 min', occupancy: '30%' }
            ];
        }

        const stopObj = stop.toObject();
        stopObj.incomingVehicles = incomingVehicles;

        res.json(stopObj);
    } catch (error) {
        console.error('Error fetching stop presence:', error);
        res.status(500).json({ error: 'Failed to fetch stop stats' });
    }
});

// Helper: updates stop numbers
async function updateStopMetrics(stopId) {
    const activeWaiting = await PassengerPresence.find({
        stopId,
        status: 'WAITING',
        lastSeen: { $gt: Date.now() - 300000 }
    });

    await SmartStop.findOneAndUpdate(
        { stopId },
        {
            waitingCount: activeWaiting.length,
            crowdDensity: activeWaiting.length > 15 ? 'HIGH' : (activeWaiting.length > 5 ? 'MEDIUM' : 'LOW'),
            'passengerCategories.women': activeWaiting.filter(p => p.category === 'WOMEN').length,
            'passengerCategories.senior': activeWaiting.filter(p => p.category === 'SENIOR_CITIZEN').length,
            'passengerCategories.disabled': activeWaiting.filter(p => p.category === 'DISABLED').length,
            'passengerCategories.children': activeWaiting.filter(p => p.category === 'CHILDREN').length,
            'passengerCategories.vip': activeWaiting.filter(p => p.category === 'VIP').length,
            'passengerCategories.student': activeWaiting.filter(p => p.category === 'STUDENT').length
        }
    );
}

export default router;
