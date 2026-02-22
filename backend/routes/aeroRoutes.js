/**
 * Aeroponic IoT Routes
 * API endpoints for Smart Aeroponics module
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
    AeroDevice,
    AeroTower,
    AeroReading,
    AeroAlert,
    AeroCommand,
    AeroCropPreset
} from '../models.js';

const router = express.Router();

// Middleware to extract user from JWT (simplified - assumes auth middleware adds req.user)
const requireAuth = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    next();
};

// ==================== DEVICE MANAGEMENT ====================

// GET /api/aero/devices - List farmer's registered devices
router.get('/devices', requireAuth, async (req, res) => {
    try {
        const devices = await AeroDevice.find({ farmerId: req.user.id });

        // Enrich with towers
        const enrichedDevices = await Promise.all(devices.map(async (device) => {
            const towers = await AeroTower.find({ deviceId: device.id });
            return { ...device.toObject(), towers };
        }));

        res.json(enrichedDevices);
    } catch (error) {
        console.error('Error fetching aero devices:', error);
        res.status(500).json({ error: 'Failed to fetch devices' });
    }
});

// POST /api/aero/devices - Register new device
router.post('/devices', requireAuth, async (req, res) => {
    try {
        const { name, location, tankCapacityLiters, macAddress } = req.body;

        const device = new AeroDevice({
            id: `AERO_${uuidv4().slice(0, 8).toUpperCase()}`,
            farmerId: req.user.id,
            name: name || 'My Aeroponic System',
            location: location || 'ROOF',
            tankCapacityLiters: tankCapacityLiters || 60,
            macAddress,
            status: 'ACTIVE',
            createdAt: Date.now()
        });

        await device.save();

        // Create default 3 towers
        const towerNames = [
            { name: 'Tower A', nameHi: 'टावर A' },
            { name: 'Tower B', nameHi: 'टावर B' },
            { name: 'Tower C', nameHi: 'टावर C' }
        ];

        const towers = await Promise.all(towerNames.map(async (t, idx) => {
            const tower = new AeroTower({
                id: `${device.id}_T${idx + 1}`,
                deviceId: device.id,
                name: t.name,
                nameHi: t.nameHi,
                location: location || 'ROOF',
                status: 'IDLE'
            });
            await tower.save();
            return tower;
        }));

        res.status(201).json({ ...device.toObject(), towers });
    } catch (error) {
        console.error('Error registering aero device:', error);
        res.status(500).json({ error: 'Failed to register device' });
    }
});

// ==================== LIVE DATA ====================

// GET /api/aero/live/:deviceId - Get latest sensor values
router.get('/live/:deviceId', requireAuth, async (req, res) => {
    try {
        const { deviceId } = req.params;

        // Verify device belongs to user
        const device = await AeroDevice.findOne({ id: deviceId, farmerId: req.user.id });
        if (!device) {
            return res.status(404).json({ error: 'Device not found' });
        }

        // Get latest reading
        const latestReading = await AeroReading.findOne({ deviceId })
            .sort({ recordedAt: -1 })
            .limit(1);

        if (!latestReading) {
            // Return mock data for demo/new devices
            return res.json({
                deviceId,
                pH: 6.2,
                ec: 1.8,
                waterTemp: 22,
                tankLevel: 75,
                pumpStatus: 'AUTO',
                mistingActive: false,
                lastUpdate: Date.now(),
                isOnline: device.status === 'ACTIVE',
                isDemoData: true
            });
        }

        // Determine status indicators based on presets
        const towers = await AeroTower.find({ deviceId });
        const activeTower = towers.find(t => t.status === 'ACTIVE');
        let preset = null;

        if (activeTower?.presetId) {
            preset = await AeroCropPreset.findOne({ id: activeTower.presetId });
        }

        const response = {
            ...latestReading.toObject(),
            isOnline: device.status === 'ACTIVE' && (Date.now() - latestReading.recordedAt) < 1800000, // 30 min
            pHStatus: preset ? (
                latestReading.pH < preset.pHMin ? 'LOW' :
                    latestReading.pH > preset.pHMax ? 'HIGH' : 'NORMAL'
            ) : 'NORMAL',
            ecStatus: preset ? (
                latestReading.ec < preset.ecMin ? 'LOW' :
                    latestReading.ec > preset.ecMax ? 'HIGH' : 'NORMAL'
            ) : 'NORMAL',
            tankStatus: latestReading.tankLevel < 20 ? 'LOW' :
                latestReading.tankLevel > 90 ? 'FULL' : 'NORMAL'
        };

        res.json(response);
    } catch (error) {
        console.error('Error fetching live data:', error);
        res.status(500).json({ error: 'Failed to fetch live data' });
    }
});

// POST /api/aero/readings - ESP32 posts sensor data here
router.post('/readings', async (req, res) => {
    try {
        const { deviceId, towerId, pH, ec, waterTemp, ambientTemp, humidity, tankLevel, pumpStatus, mistingActive, signature } = req.body;

        // TODO: Verify signature from ESP32

        const reading = new AeroReading({
            id: uuidv4(),
            deviceId,
            towerId,
            pH,
            ec,
            waterTemp,
            ambientTemp,
            humidity,
            tankLevel,
            pumpStatus,
            mistingActive,
            recordedAt: Date.now()
        });

        await reading.save();

        // Update device last online
        await AeroDevice.updateOne({ id: deviceId }, { lastOnline: Date.now(), status: 'ACTIVE' });

        // Check for alerts
        await checkAndCreateAlerts(deviceId, reading);

        res.status(201).json({ success: true, readingId: reading.id });
    } catch (error) {
        console.error('Error saving reading:', error);
        res.status(500).json({ error: 'Failed to save reading' });
    }
});

// ==================== COMMANDS ====================

// POST /api/aero/command - Send command to device
router.post('/command', requireAuth, async (req, res) => {
    try {
        const { device_id, command, value, towerId } = req.body;

        // Verify device belongs to user
        const device = await AeroDevice.findOne({ id: device_id, farmerId: req.user.id });
        if (!device) {
            return res.status(404).json({ error: 'Device not found' });
        }

        const cmd = new AeroCommand({
            id: uuidv4(),
            deviceId: device_id,
            towerId,
            command,
            value,
            timestamp: Date.now(),
            status: 'PENDING'
        });

        await cmd.save();

        // In production, this would be sent via MQTT/WebSocket to ESP32
        // For now, we'll simulate command execution after a delay

        res.json({
            success: true,
            commandId: cmd.id,
            message: `Command ${command} queued for device ${device_id}`
        });
    } catch (error) {
        console.error('Error sending command:', error);
        res.status(500).json({ error: 'Failed to send command' });
    }
});

// GET /api/aero/commands/:deviceId - ESP32 polls for pending commands
router.get('/commands/:deviceId', async (req, res) => {
    try {
        const { deviceId } = req.params;

        const pendingCommands = await AeroCommand.find({
            deviceId,
            status: 'PENDING'
        }).sort({ timestamp: 1 });

        res.json(pendingCommands);
    } catch (error) {
        console.error('Error fetching commands:', error);
        res.status(500).json({ error: 'Failed to fetch commands' });
    }
});

// POST /api/aero/commands/:commandId/ack - ESP32 acknowledges command execution
router.post('/commands/:commandId/ack', async (req, res) => {
    try {
        const { commandId } = req.params;
        const { status, errorMessage } = req.body;

        await AeroCommand.updateOne(
            { id: commandId },
            {
                status: status || 'EXECUTED',
                executedAt: Date.now(),
                errorMessage
            }
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Error acknowledging command:', error);
        res.status(500).json({ error: 'Failed to acknowledge command' });
    }
});

// ==================== AI PREDICTION ====================

// GET /api/aero/predict/:deviceId - Get AI harvest prediction
router.get('/predict/:deviceId', requireAuth, async (req, res) => {
    try {
        const { deviceId } = req.params;
        const { towerId } = req.query;

        // Find active tower with crop
        let tower;
        if (towerId) {
            tower = await AeroTower.findOne({ id: towerId, deviceId });
        } else {
            tower = await AeroTower.findOne({ deviceId, status: 'ACTIVE', currentCrop: { $exists: true } });
        }

        if (!tower || !tower.plantedAt) {
            return res.json({
                deviceId,
                message: 'No active crop found',
                messageHi: 'कोई सक्रिय फसल नहीं मिली'
            });
        }

        const preset = tower.presetId ? await AeroCropPreset.findOne({ id: tower.presetId }) : null;
        const expectedDays = preset?.expectedDays || 30;

        const daysElapsed = Math.floor((Date.now() - tower.plantedAt) / (1000 * 60 * 60 * 24));
        const daysRemaining = Math.max(0, expectedDays - daysElapsed);

        // Calculate health score based on recent readings
        const recentReadings = await AeroReading.find({ deviceId, towerId: tower.id })
            .sort({ recordedAt: -1 })
            .limit(24); // Last 24 readings

        let healthScore = 85; // Default good health

        if (recentReadings.length > 0 && preset) {
            const avgPH = recentReadings.reduce((sum, r) => sum + r.pH, 0) / recentReadings.length;
            const avgEC = recentReadings.reduce((sum, r) => sum + r.ec, 0) / recentReadings.length;

            // Score based on how close to optimal range
            const phOptimal = (preset.pHMin + preset.pHMax) / 2;
            const ecOptimal = (preset.ecMin + preset.ecMax) / 2;

            const phDeviation = Math.abs(avgPH - phOptimal) / phOptimal;
            const ecDeviation = Math.abs(avgEC - ecOptimal) / ecOptimal;

            healthScore = Math.round(100 - (phDeviation * 50) - (ecDeviation * 50));
            healthScore = Math.max(20, Math.min(100, healthScore));
        }

        // Determine growth stage
        let growthStage = 'SEEDLING';
        const progressPercent = (daysElapsed / expectedDays) * 100;
        if (progressPercent > 80) growthStage = 'HARVEST_READY';
        else if (progressPercent > 50) growthStage = 'MATURATION';
        else if (progressPercent > 20) growthStage = 'VEGETATIVE';

        res.json({
            deviceId,
            towerId: tower.id,
            cropName: tower.currentCrop,
            cropNameHi: tower.currentCropHi || tower.currentCrop,
            plantedAt: tower.plantedAt,
            expectedDays,
            daysElapsed,
            daysRemaining,
            healthScore,
            growthStage,
            recommendation: daysRemaining <= 3 ? 'Harvest your crop soon for best quality' : null,
            recommendationHi: daysRemaining <= 3 ? 'सर्वोत्तम गुणवत्ता के लिए जल्द ही अपनी फसल काटें' : null
        });
    } catch (error) {
        console.error('Error generating prediction:', error);
        res.status(500).json({ error: 'Failed to generate prediction' });
    }
});

// ==================== CROP PRESETS ====================

// GET /api/aero/presets - Get crop preset list
router.get('/presets', async (req, res) => {
    try {
        let presets = await AeroCropPreset.find();

        // Seed default presets if none exist
        if (presets.length === 0) {
            const defaultPresets = [
                {
                    id: 'spinach', nameHi: 'पालक', nameEn: 'Spinach', icon: '🥬',
                    pHMin: 6.0, pHMax: 7.0, ecMin: 1.8, ecMax: 2.3,
                    tempMin: 15, tempMax: 24, expectedDays: 30,
                    mistOnSeconds: 15, mistOffSeconds: 300,
                    description: 'Fast-growing leafy green', descriptionHi: 'तेजी से उगने वाला हरा पत्तेदार'
                },
                {
                    id: 'cabbage', nameHi: 'पत्ता गोभी', nameEn: 'Cabbage', icon: '🥗',
                    pHMin: 6.5, pHMax: 7.0, ecMin: 2.5, ecMax: 3.0,
                    tempMin: 15, tempMax: 20, expectedDays: 60,
                    mistOnSeconds: 20, mistOffSeconds: 360,
                    description: 'Cool season crop', descriptionHi: 'ठंडे मौसम की फसल'
                },
                {
                    id: 'lettuce', nameHi: 'सलाद पत्ता', nameEn: 'Lettuce', icon: '🥬',
                    pHMin: 5.5, pHMax: 6.5, ecMin: 0.8, ecMax: 1.2,
                    tempMin: 15, tempMax: 21, expectedDays: 25,
                    mistOnSeconds: 10, mistOffSeconds: 240,
                    description: 'Quick harvest salad green', descriptionHi: 'जल्दी तैयार सलाद पत्ता'
                },
                {
                    id: 'mint', nameHi: 'पुदीना', nameEn: 'Mint', icon: '🌿',
                    pHMin: 5.5, pHMax: 6.5, ecMin: 2.0, ecMax: 2.4,
                    tempMin: 18, tempMax: 25, expectedDays: 40,
                    mistOnSeconds: 15, mistOffSeconds: 360,
                    description: 'Aromatic herb', descriptionHi: 'सुगंधित जड़ी-बूटी'
                },
                {
                    id: 'basil', nameHi: 'तुलसी', nameEn: 'Basil', icon: '🌿',
                    pHMin: 5.5, pHMax: 6.5, ecMin: 1.0, ecMax: 1.6,
                    tempMin: 20, tempMax: 30, expectedDays: 45,
                    mistOnSeconds: 15, mistOffSeconds: 300,
                    description: 'Popular culinary herb', descriptionHi: 'लोकप्रिय पाक जड़ी बूटी'
                },
                {
                    id: 'strawberry', nameHi: 'स्ट्रॉबेरी', nameEn: 'Strawberry', icon: '🍓',
                    pHMin: 5.8, pHMax: 6.2, ecMin: 1.8, ecMax: 2.2,
                    tempMin: 15, tempMax: 25, expectedDays: 90,
                    mistOnSeconds: 20, mistOffSeconds: 240,
                    description: 'Sweet red berries', descriptionHi: 'मीठे लाल जामुन'
                },
                {
                    id: 'tomato', nameHi: 'टमाटर', nameEn: 'Tomato', icon: '🍅',
                    pHMin: 5.5, pHMax: 6.5, ecMin: 2.0, ecMax: 5.0,
                    tempMin: 18, tempMax: 27, expectedDays: 80,
                    mistOnSeconds: 30, mistOffSeconds: 180,
                    description: 'Versatile vegetable fruit', descriptionHi: 'बहुमुखी सब्जी फल'
                }
            ];

            await AeroCropPreset.insertMany(defaultPresets);
            presets = defaultPresets;
        }

        res.json(presets);
    } catch (error) {
        console.error('Error fetching presets:', error);
        res.status(500).json({ error: 'Failed to fetch presets' });
    }
});

// POST /api/aero/devices/pair - Pair a distributor-installed device
router.post('/devices/pair', requireAuth, async (req, res) => {
    try {
        const { deviceId, macAddress, name } = req.body;

        // In a real system, we'd verify the device is in a 'waiting for pair' state in a separate table
        const device = await AeroDevice.findOne({ id: deviceId, macAddress });

        if (!device) {
            return res.status(404).json({ error: 'Device not found or MAC address mismatch' });
        }

        if (device.isPaired) {
            return res.status(400).json({ error: 'Device already paired' });
        }

        device.farmerId = req.user.id;
        device.isPaired = true;
        device.pairedAt = Date.now();
        if (name) device.name = name;

        await device.save();

        res.json({ success: true, device });
    } catch (error) {
        console.error('Error pairing device:', error);
        res.status(500).json({ error: 'Failed to pair device' });
    }
});

// POST /api/aero/tower/:towerId/plant - Start growing a crop
router.post('/tower/:towerId/plant', requireAuth, async (req, res) => {
    try {
        const { towerId } = req.params;
        const { presetId } = req.body;

        const tower = await AeroTower.findOne({ id: towerId });
        if (!tower) {
            return res.status(404).json({ error: 'Tower not found' });
        }

        // Verify ownership via device
        const device = await AeroDevice.findOne({ id: tower.deviceId, farmerId: req.user.id });
        if (!device) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const preset = await AeroCropPreset.findOne({ id: presetId });
        if (!preset) {
            return res.status(404).json({ error: 'Preset not found' });
        }

        await AeroTower.updateOne({ id: towerId }, {
            currentCrop: preset.nameEn,
            currentCropHi: preset.nameHi,
            presetId: preset.id,
            plantedAt: Date.now(),
            expectedHarvestAt: Date.now() + (preset.expectedDays * 24 * 60 * 60 * 1000),
            status: 'ACTIVE'
        });

        res.json({
            success: true,
            message: `Started growing ${preset.nameEn}`,
            messageHi: `${preset.nameHi} उगाना शुरू किया`
        });
    } catch (error) {
        console.error('Error planting crop:', error);
        res.status(500).json({ error: 'Failed to start crop' });
    }
});

// ==================== ALERTS ====================

// GET /api/aero/alerts/:deviceId - Get alert history
router.get('/alerts/:deviceId', requireAuth, async (req, res) => {
    try {
        const { deviceId } = req.params;
        const { unacknowledged } = req.query;

        // Verify device belongs to user
        const device = await AeroDevice.findOne({ id: deviceId, farmerId: req.user.id });
        if (!device) {
            return res.status(404).json({ error: 'Device not found' });
        }

        const query = { deviceId };
        if (unacknowledged === 'true') {
            query.acknowledged = false;
        }

        const alerts = await AeroAlert.find(query)
            .sort({ timestamp: -1 })
            .limit(50);

        res.json(alerts);
    } catch (error) {
        console.error('Error fetching alerts:', error);
        res.status(500).json({ error: 'Failed to fetch alerts' });
    }
});

// POST /api/aero/alerts/:alertId/acknowledge - Acknowledge alert
router.post('/alerts/:alertId/acknowledge', requireAuth, async (req, res) => {
    try {
        const { alertId } = req.params;

        await AeroAlert.updateOne(
            { id: alertId },
            { acknowledged: true, acknowledgedAt: Date.now() }
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Error acknowledging alert:', error);
        res.status(500).json({ error: 'Failed to acknowledge alert' });
    }
});

// ==================== HISTORY ====================

// GET /api/aero/history/:deviceId - Get sensor history for charts
router.get('/history/:deviceId', requireAuth, async (req, res) => {
    try {
        const { deviceId } = req.params;
        const { period = '24h', towerId } = req.query;

        // Verify device belongs to user
        const device = await AeroDevice.findOne({ id: deviceId, farmerId: req.user.id });
        if (!device) {
            return res.status(404).json({ error: 'Device not found' });
        }

        // Calculate time range
        const now = Date.now();
        let startTime;
        switch (period) {
            case '7d':
                startTime = now - (7 * 24 * 60 * 60 * 1000);
                break;
            case '30d':
                startTime = now - (30 * 24 * 60 * 60 * 1000);
                break;
            default: // 24h
                startTime = now - (24 * 60 * 60 * 1000);
        }

        const query = { deviceId, recordedAt: { $gte: startTime } };
        if (towerId) query.towerId = towerId;

        const readings = await AeroReading.find(query)
            .sort({ recordedAt: 1 })
            .select('pH ec waterTemp tankLevel recordedAt');

        res.json(readings);
    } catch (error) {
        console.error('Error fetching history:', error);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

// ==================== HELPER FUNCTIONS ====================

async function checkAndCreateAlerts(deviceId, reading) {
    const towers = await AeroTower.find({ deviceId, status: 'ACTIVE' });
    if (towers.length === 0) return;

    const activeTower = towers[0];
    const preset = activeTower.presetId
        ? await AeroCropPreset.findOne({ id: activeTower.presetId })
        : null;

    const alerts = [];

    // pH alerts
    if (preset && reading.pH < preset.pHMin) {
        alerts.push({
            id: uuidv4(),
            deviceId,
            towerId: activeTower.id,
            type: 'PH_LOW',
            severity: reading.pH < preset.pHMin - 0.5 ? 'CRITICAL' : 'WARNING',
            message: `pH too low: ${reading.pH} (min: ${preset.pHMin})`,
            messageHi: `pH बहुत कम: ${reading.pH} (न्यूनतम: ${preset.pHMin})`,
            value: reading.pH,
            threshold: preset.pHMin,
            timestamp: Date.now()
        });
    }

    if (preset && reading.pH > preset.pHMax) {
        alerts.push({
            id: uuidv4(),
            deviceId,
            towerId: activeTower.id,
            type: 'PH_HIGH',
            severity: reading.pH > preset.pHMax + 0.5 ? 'CRITICAL' : 'WARNING',
            message: `pH too high: ${reading.pH} (max: ${preset.pHMax})`,
            messageHi: `pH बहुत अधिक: ${reading.pH} (अधिकतम: ${preset.pHMax})`,
            value: reading.pH,
            threshold: preset.pHMax,
            timestamp: Date.now()
        });
    }

    // EC alerts
    if (preset && reading.ec < preset.ecMin) {
        alerts.push({
            id: uuidv4(),
            deviceId,
            type: 'EC_LOW',
            severity: 'WARNING',
            message: `EC too low: ${reading.ec} (min: ${preset.ecMin})`,
            messageHi: `EC बहुत कम: ${reading.ec} (न्यूनतम: ${preset.ecMin})`,
            value: reading.ec,
            threshold: preset.ecMin,
            timestamp: Date.now()
        });
    }

    if (preset && reading.ec > preset.ecMax) {
        alerts.push({
            id: uuidv4(),
            deviceId,
            type: 'EC_HIGH',
            severity: 'WARNING',
            message: `EC too high: ${reading.ec} (max: ${preset.ecMax})`,
            messageHi: `EC बहुत अधिक: ${reading.ec} (अधिकतम: ${preset.ecMax})`,
            value: reading.ec,
            threshold: preset.ecMax,
            timestamp: Date.now()
        });
    }

    // Tank level alert
    if (reading.tankLevel < 20) {
        alerts.push({
            id: uuidv4(),
            deviceId,
            type: 'TANK_LOW',
            severity: reading.tankLevel < 10 ? 'CRITICAL' : 'WARNING',
            message: `Tank level low: ${reading.tankLevel}%`,
            messageHi: `टैंक का स्तर कम: ${reading.tankLevel}%`,
            value: reading.tankLevel,
            threshold: 20,
            timestamp: Date.now()
        });
    }

    // Save alerts
    if (alerts.length > 0) {
        await AeroAlert.insertMany(alerts);

        // TODO: Send WhatsApp/SMS notifications for CRITICAL alerts
        // This would integrate with a notification service
    }
}

export default router;
