import express from 'express';
import { predictPassengerIntent } from '../services/lmisIntentEngine.js';
import { PassengerDigitalTwin } from '../models.js';

const router = express.Router();

/**
 * POST /api/v2/lmis/intent/predict
 * Analyzes passenger parameters to predict travel intents.
 */
router.post('/predict', async (req, res) => {
    try {
        const { passengerId, context } = req.body;
        if (!passengerId) {
            return res.status(400).json({ error: 'passengerId is required' });
        }

        const prediction = await predictPassengerIntent(passengerId, context || {});
        res.json({
            success: true,
            passengerId,
            prediction
        });
    } catch (error) {
        console.error('Error in intent prediction route:', error);
        res.status(500).json({ error: 'Failed to evaluate passenger intent values' });
    }
});

/**
 * GET /api/v2/lmis/digital-twin/:passengerId
 * Fetches the active passenger digital twin diagnostics.
 */
router.get('/digital-twin/:passengerId', async (req, res) => {
    try {
        const { passengerId } = req.params;
        const twin = await PassengerDigitalTwin.findOne({ passengerId });
        if (!twin) {
            return res.status(404).json({ error: 'Passenger Digital Twin not found' });
        }
        res.json(twin);
    } catch (error) {
        console.error('Error fetching digital twin:', error);
        res.status(500).json({ error: 'Failed to retrieve digital twin telemetry' });
    }
});

export default router;
