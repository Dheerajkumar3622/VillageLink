import express from 'express';
import { Drone, ChargingDock, FlightCorridor, SmartPackage } from '../models.js';

const router = express.Router();

// Helper: Seed initial drones, docks, and corridors if empty
async function seedDronesIfEmpty() {
    const count = await Drone.countDocuments();
    if (count === 0) {
        // Seed 4 drones
        const drones = [
            { droneId: 'DRN_01', name: 'Garuda-1 (Medical)', type: 'MEDICAL', maxPayloadKg: 5, maxVolumeCm3: 2000, status: 'IDLE', batteryLevel: 95, batteryHealth: 98, motorHealth: 'GOOD' },
            { droneId: 'DRN_02', name: 'Pushpak-2 (Heavy)', type: 'HEAVY', maxPayloadKg: 20, maxVolumeCm3: 8000, status: 'IDLE', batteryLevel: 88, batteryHealth: 92, motorHealth: 'GOOD' },
            { droneId: 'DRN_03', name: 'Pawan-3 (Small)', type: 'SMALL', maxPayloadKg: 2, maxVolumeCm3: 1000, status: 'IDLE', batteryLevel: 45, batteryHealth: 99, motorHealth: 'GOOD' },
            { droneId: 'DRN_04', name: 'Vayu-4 (Emergency)', type: 'EMERGENCY', maxPayloadKg: 10, maxVolumeCm3: 4000, status: 'IDLE', batteryLevel: 100, batteryHealth: 95, motorHealth: 'GOOD' }
        ];
        await Drone.insertMany(drones);

        // Seed 3 docks
        const docks = [
            { dockId: 'DOCK_01', name: 'Mandi Central Port', lat: 25.612, lng: 85.131, totalSlots: 4, occupiedSlots: 0, powerOutputKw: 50 },
            { dockId: 'DOCK_02', name: 'North Village Gateway', lat: 25.625, lng: 85.145, totalSlots: 2, occupiedSlots: 0, powerOutputKw: 22 },
            { dockId: 'DOCK_03', name: 'District Hospital Pad', lat: 25.602, lng: 85.110, totalSlots: 2, occupiedSlots: 0, powerOutputKw: 22 }
        ];
        await ChargingDock.insertMany(docks);

        // Seed 1 corridor and 1 no fly zone
        const corridors = [
            {
                corridorId: 'CORRIDOR_A',
                name: 'High-speed Agri Drone Highway A',
                type: 'CORRIDOR',
                boundaryPolygon: {
                    type: 'Polygon',
                    coordinates: [[[85.120, 25.600], [85.150, 25.600], [85.150, 25.630], [85.120, 25.630], [85.120, 25.600]]]
                },
                minAltitudeMeters: 40,
                maxAltitudeMeters: 100
            },
            {
                corridorId: 'NOFLY_RESTRICTED',
                name: 'Gram Panchayat Power Substation Zone',
                type: 'NO_FLY_ZONE',
                boundaryPolygon: {
                    type: 'Polygon',
                    coordinates: [[[85.132, 25.615], [85.138, 25.615], [85.138, 25.620], [85.132, 25.620], [85.132, 25.615]]]
                },
                minAltitudeMeters: 0,
                maxAltitudeMeters: 500
            }
        ];
        await FlightCorridor.insertMany(corridors);
    }
}

// Seed on module load
seedDronesIfEmpty().catch(console.error);

/**
 * GET /api/v2/drones/fleet
 * Lists all drones inside the system.
 */
router.get('/fleet', async (req, res) => {
    try {
        const drones = await Drone.find({});
        res.json(drones);
    } catch (error) {
        console.error('Error listing drones:', error);
        res.status(500).json({ error: 'Failed to fetch drone list' });
    }
});

/**
 * POST /api/v2/drones/register
 * Registers a new drone device.
 */
router.post('/register', async (req, res) => {
    try {
        const { droneId, name, type, maxPayloadKg, maxVolumeCm3 } = req.body;

        if (!droneId || !name || !type || !maxPayloadKg || !maxVolumeCm3) {
            return res.status(400).json({ error: 'Missing registration details' });
        }

        const drone = new Drone({
            droneId,
            name,
            type,
            maxPayloadKg,
            maxVolumeCm3,
            status: 'IDLE'
        });

        await drone.save();
        res.status(201).json({ success: true, drone });
    } catch (error) {
        console.error('Error registering drone:', error);
        res.status(500).json({ error: 'Failed to register drone' });
    }
});

/**
 * POST /api/v2/drones/telemetry
 * Stream updates from a drone flight computer.
 */
router.post('/telemetry', async (req, res) => {
    try {
        const { droneId, lat, lng, alt, speedMps, batteryLevel, windSpeedMps } = req.body;

        if (!droneId) {
            return res.status(400).json({ error: 'droneId is required' });
        }

        const updateData = {
            'telemetry.lat': lat,
            'telemetry.lng': lng,
            'telemetry.alt': alt,
            'telemetry.speedMps': speedMps,
            'telemetry.windSpeedMps': windSpeedMps || 0
        };

        if (batteryLevel !== undefined) {
            updateData.batteryLevel = batteryLevel;
            // Diagnostic trigger: check if battery is extremely low
            if (batteryLevel < 15) {
                updateData.status = 'MAINTENANCE'; // Auto force RTL land/service state
            }
        }

        const drone = await Drone.findOneAndUpdate(
            { droneId },
            { $set: updateData },
            { new: true }
        );

        if (!drone) {
            return res.status(404).json({ error: 'Drone device not registered' });
        }

        res.json({
            success: true,
            status: drone.status,
            battery: drone.batteryLevel
        });
    } catch (error) {
        console.error('Error writing drone telemetry:', error);
        res.status(500).json({ error: 'Failed to record drone flight telemetry' });
    }
});

/**
 * GET /api/v2/drones/charging-docks
 * Lists all charging stations.
 */
router.get('/charging-docks', async (req, res) => {
    try {
        const docks = await ChargingDock.find({});
        res.json(docks);
    } catch (error) {
        console.error('Error listing docks:', error);
        res.status(500).json({ error: 'Failed to load docks list' });
    }
});

/**
 * GET /api/v2/drones/corridors
 * Lists all flight paths and restrictions.
 */
router.get('/corridors', async (req, res) => {
    try {
        const corridors = await FlightCorridor.find({});
        res.json(corridors);
    } catch (error) {
        console.error('Error fetching corridors:', error);
        res.status(500).json({ error: 'Failed to load flight corridors' });
    }
});

export default router;
