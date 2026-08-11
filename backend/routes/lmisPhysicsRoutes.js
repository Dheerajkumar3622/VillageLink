import express from 'express';
import { calculateVehiclePhysics, getVehiclePhysics } from '../services/lmisPhysicsEngine.js';

const router = express.Router();

/**
 * POST /api/v2/lmis/physics/calculate
 * Triggers dynamics calculations for rolling resistance, drag, and battery drainage.
 */
router.post('/calculate', async (req, res) => {
    try {
        const { vehicleId, telemetry } = req.body;
        if (!vehicleId) {
            return res.status(400).json({ error: 'vehicleId is required' });
        }

        const stats = await calculateVehiclePhysics(vehicleId, telemetry || {});
        res.json(stats);
    } catch (error) {
        console.error('Error in physics calculator route:', error);
        res.status(500).json({ error: 'Failed to compute vehicle physics metrics' });
    }
});

/**
 * GET /api/v2/lmis/physics/vehicle/:vehicleId
 * Returns the current kinetic telemetry for the vehicle.
 */
router.get('/vehicle/:vehicleId', async (req, res) => {
    try {
        const { vehicleId } = req.params;
        const stats = await getVehiclePhysics(vehicleId);
        res.json(stats);
    } catch (error) {
        console.error('Error fetching physics state:', error);
        res.status(500).json({ error: 'Failed to retrieve vehicle physics profile' });
    }
});

export default router;
