/**
 * Route Intelligence API Routes
 * Endpoints for village mapping, route demand, and commute patterns
 */

import express from 'express';
import { getRouteWithPlaces } from '../logic.js';
import { getHotRoutesNearDriver, getCurrentDemand } from '../services/routeDemandService.js';
import { findRegularVehiclesNear, getDriverSchedule, recordDriverPass } from '../services/commutePatternService.js';
import * as Auth from '../auth.js';

const router = express.Router();

// --- ROUTE WITH PLACES ---

/**
 * GET /api/route/with-places
 * Get OSRM route with mapped villages and POIs
 */
router.get('/with-places', async (req, res) => {
    try {
        const { startLat, startLng, endLat, endLng } = req.query;

        if (!startLat || !startLng || !endLat || !endLng) {
            return res.status(400).json({ error: 'Missing coordinates' });
        }

        const route = await getRouteWithPlaces(
            parseFloat(startLat),
            parseFloat(startLng),
            parseFloat(endLat),
            parseFloat(endLng)
        );

        if (!route) {
            return res.status(404).json({ error: 'Route not found' });
        }

        res.json({
            success: true,
            distance: route.distance,
            duration: route.duration,
            places: route.places,
            pathDetails: route.pathDetails
        });

    } catch (error) {
        console.error('Route with places error:', error);
        res.status(500).json({ error: 'Failed to get route' });
    }
});

// --- ROUTE DEMAND ---

/**
 * GET /api/route/demand
 * Get current hot routes (for driver dashboard)
 */
router.get('/demand', Auth.authenticate, async (req, res) => {
    try {
        const { lat, lng } = req.query;

        if (lat && lng) {
            const hotRoutes = await getHotRoutesNearDriver(
                parseFloat(lat),
                parseFloat(lng)
            );
            return res.json({ hotRoutes });
        }

        // Return all hot routes if no location
        const allDemand = getCurrentDemand();
        res.json({ hotRoutes: allDemand });

    } catch (error) {
        res.status(500).json({ error: 'Failed to get demand' });
    }
});

// --- COMMUTE PATTERNS ---

/**
 * GET /api/route/regular-vehicles
 * Find vehicles that regularly pass near a location
 */
router.get('/regular-vehicles', async (req, res) => {
    try {
        const { lat, lng, hour } = req.query;

        if (!lat || !lng) {
            return res.status(400).json({ error: 'Missing location' });
        }

        const vehicles = await findRegularVehiclesNear(
            parseFloat(lat),
            parseFloat(lng),
            hour ? parseInt(hour) : null
        );

        res.json({
            success: true,
            count: vehicles.length,
            vehicles
        });

    } catch (error) {
        res.status(500).json({ error: 'Failed to find vehicles' });
    }
});

/**
 * GET /api/route/driver-schedule/:driverId
 * Get a driver's regular schedule
 */
router.get('/driver-schedule/:driverId', async (req, res) => {
    try {
        const schedule = await getDriverSchedule(req.params.driverId);
        res.json({ schedule });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get schedule' });
    }
});

/**
 * POST /api/route/record-pass
 * Record driver passing through a location (called by driver app)
 */
router.post('/record-pass', Auth.authenticate, async (req, res) => {
    try {
        const driverId = req.user.id;
        const { lat, lng, villageName } = req.body;

        if (!lat || !lng) {
            return res.status(400).json({ error: 'Missing location' });
        }

        await recordDriverPass(driverId, lat, lng, villageName || 'Unknown');
        res.json({ success: true });

    } catch (error) {
        res.status(500).json({ error: 'Failed to record pass' });
    }
});

export default router;
