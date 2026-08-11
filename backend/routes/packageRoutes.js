import express from 'express';
import { SmartPackage, Drone, User } from '../models.js';

const router = express.Router();

/**
 * POST /api/v2/packages/create
 * Creates a parcel delivery request and invokes the AI allocation logic.
 */
router.post('/create', async (req, res) => {
    try {
        const { type, weightKg, volumeCm3, pickupCoordinates, dropCoordinates, priority, fragile, requiredTempCelsius, deliveryDeadline } = req.body;

        if (!type || !weightKg || !volumeCm3 || !pickupCoordinates || !dropCoordinates || !deliveryDeadline) {
            return res.status(400).json({ error: 'Missing required package fields' });
        }

        // Generate tracking properties
        const packageId = `PKG_${Math.floor(100000 + Math.random() * 900000)}`;
        const otpCode = Math.floor(1000 + Math.random() * 9000).toString(); // simple 4 digit OTP
        const qrCodeUrl = `/api/v2/packages/qr/${packageId}`;

        // Initialize new package document
        const newPackage = new SmartPackage({
            packageId,
            type,
            weightKg,
            volumeCm3,
            pickupCoordinates,
            dropCoordinates,
            priority: priority || 'MEDIUM',
            fragile: fragile || false,
            requiredTempCelsius: requiredTempCelsius || 22.0,
            deliveryDeadline: new Date(deliveryDeadline).getTime(),
            otpCode,
            qrCodeUrl,
            status: 'PENDING'
        });

        // Run AI Package Assignment Engine
        const assignment = await runAIAssignment(newPackage);
        if (assignment) {
            newPackage.assignedCarrierId = assignment.carrierId;
            newPackage.carrierType = assignment.carrierType;
            newPackage.status = 'ASSIGNED';
        }

        await newPackage.save();

        res.status(201).json({
            success: true,
            package: newPackage,
            otpCode // Sent directly in response for demo/client ease
        });

    } catch (error) {
        console.error('Error creating package:', error);
        res.status(500).json({ error: 'Failed to record package shipment' });
    }
});

/**
 * GET /api/v2/packages/list
 * Fetch all package records. Supports filtering by status or carrier.
 */
router.get('/list', async (req, res) => {
    try {
        const { status, carrierId } = req.query;
        const filter = {};
        if (status) filter.status = status;
        if (carrierId) filter.assignedCarrierId = carrierId;

        const packages = await SmartPackage.find(filter).sort({ createdAt: -1 });
        res.json(packages);
    } catch (error) {
        console.error('Error listing packages:', error);
        res.status(500).json({ error: 'Failed to retrieve package records' });
    }
});

/**
 * POST /api/v2/packages/verify
 * Confirms OTP/QR code scanning to transition package delivery state.
 */
router.post('/verify', async (req, res) => {
    try {
        const { packageId, otpCode, photoBase64, signature } = req.body;

        const pkg = await SmartPackage.findOne({ packageId });
        if (!pkg) {
            return res.status(404).json({ error: 'Package not found' });
        }

        if (pkg.status === 'DELIVERED') {
            return res.status(400).json({ error: 'Package already delivered' });
        }

        // Validate OTP
        if (pkg.otpCode !== otpCode) {
            return res.status(400).json({ error: 'Incorrect verification OTP' });
        }

        // Complete delivery
        pkg.status = 'DELIVERED';
        pkg.proofPhotoBase64 = photoBase64 || null;
        pkg.proofSignature = signature || null;
        pkg.proofUrl = `/proofs/${packageId}.png`;

        // If assigned carrier is a drone, free it back to IDLE
        if (pkg.carrierType === 'DRONE' && pkg.assignedCarrierId) {
            await Drone.findOneAndUpdate(
                { droneId: pkg.assignedCarrierId },
                { status: 'IDLE', currentPayloadWeightKg: 0 }
            );
        }

        await pkg.save();

        res.json({
            success: true,
            status: pkg.status,
            message: 'Package handoff verified and completed successfully.'
        });

    } catch (error) {
        console.error('Error verifying package:', error);
        res.status(500).json({ error: 'Failed to process package verification code' });
    }
});

/**
 * AI Package Assignment Algorithm Heuristics
 * Iterates through transit nodes and evaluates drone suitability vs. bus cargo space.
 */
async function runAIAssignment(pkg) {
    // 1. Check Drones first for Critical/Fragile/Medical payloads under max capacity (e.g. 15kg)
    if (pkg.priority === 'CRITICAL' || pkg.type === 'MEDICINE') {
        const availableDrone = await Drone.findOne({
            status: 'IDLE',
            maxPayloadKg: { $gte: pkg.weightKg },
            maxVolumeCm3: { $gte: pkg.volumeCm3 },
            batteryLevel: { $gte: 40 } // Operational safe minimum
        });

        if (availableDrone) {
            // Lock drone status
            availableDrone.status = 'ASSIGNED';
            availableDrone.currentPayloadWeightKg = pkg.weightKg;
            await availableDrone.save();

            return {
                carrierId: availableDrone.droneId,
                carrierType: 'DRONE'
            };
        }
    }

    // 2. Fallback or standard allocation to public transit vehicle co-carrying (Buses, Tempos)
    // For demo simulation, mock assigning to a random active passenger vehicle
    const roadCarriers = ['BUS_01', 'BUS_02', 'TEMPO_03', 'VAN_04'];
    const chosenCarrier = roadCarriers[Math.floor(Math.random() * roadCarriers.length)];

    return {
        carrierId: chosenCarrier,
        carrierType: 'VEHICLE'
    };
}

export default router;
