/**
 * CargoLink Routes - Crowdsourced Supply Chain API
 * Enables passengers, farmers, vendors to ship items via traveling vehicles
 */

import express from 'express';
import { CargoRequest, CargoCapacity, CargoMatch, User, DriverLocation } from '../models.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Helper: Generate OTP
const generateOTP = () => Math.floor(1000 + Math.random() * 9000).toString();

// Helper: Calculate base price (hybrid model)
const calculateBasePrice = (weightKg, distanceKm, itemType) => {
    const baseRate = 2; // ₹2 per km per kg
    const typeMultiplier = {
        'PRODUCE': 1.0,
        'GOODS': 1.2,
        'FOOD': 1.3,
        'DOCUMENTS': 0.5,
        'PACKAGE': 1.0
    };
    const multiplier = typeMultiplier[itemType] || 1.0;
    return Math.ceil(weightKg * distanceKm * baseRate * multiplier);
};

// Helper: Calculate distance between two points (Haversine)
const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

// ==================== CARGO REQUEST ENDPOINTS ====================

// POST /api/cargo/request - Create new cargo request
router.post('/request', async (req, res) => {
    try {
        const {
            shipperId, shipperType, shipperName, shipperPhone,
            itemType, itemName, description, weightKg, volumeLiters, photos, isFragile,
            pickupLocation, dropoffLocation, pickupWindow, deliveryDeadline,
            offeredPrice, paymentMethod, receiverName, receiverPhone
        } = req.body;

        // Calculate distance and base price
        const distanceKm = calculateDistance(
            pickupLocation.lat, pickupLocation.lng,
            dropoffLocation.lat, dropoffLocation.lng
        );
        const basePrice = calculateBasePrice(weightKg, distanceKm, itemType);

        const cargoRequest = new CargoRequest({
            id: `CARGO-${uuidv4().substr(0, 8).toUpperCase()}`,
            shipperId, shipperType, shipperName, shipperPhone,
            itemType, itemName, description, weightKg, volumeLiters,
            photos: photos || [], isFragile: isFragile || false,
            pickupLocation, dropoffLocation, distanceKm,
            pickupWindow, deliveryDeadline,
            basePrice,
            offeredPrice: offeredPrice || basePrice,
            paymentMethod: paymentMethod || 'WALLET',
            receiverName, receiverPhone,
            status: 'POSTED',
            pickupOTP: generateOTP(),
            deliveryOTP: generateOTP(),
            createdAt: Date.now()
        });

        await cargoRequest.save();

        res.json({
            success: true,
            cargo: cargoRequest,
            message: 'Cargo request posted successfully'
        });
    } catch (error) {
        console.error('Create cargo request error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/cargo/request/:id - Get cargo details
router.get('/request/:id', async (req, res) => {
    try {
        const cargo = await CargoRequest.findOne({ id: req.params.id });
        if (!cargo) {
            return res.status(404).json({ success: false, error: 'Cargo not found' });
        }
        res.json({ success: true, cargo });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/cargo/shipper/:userId - Get user's cargo requests
router.get('/shipper/:userId', async (req, res) => {
    try {
        const { status } = req.query;
        const query = { shipperId: req.params.userId };
        if (status) query.status = status;

        const cargos = await CargoRequest.find(query).sort({ createdAt: -1 });
        res.json({ success: true, cargos });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/cargo/calculate-price - Calculate price without creating request
router.get('/calculate-price', async (req, res) => {
    try {
        const { weightKg, fromLat, fromLng, toLat, toLng, itemType } = req.query;
        const distanceKm = calculateDistance(
            parseFloat(fromLat), parseFloat(fromLng),
            parseFloat(toLat), parseFloat(toLng)
        );
        const basePrice = calculateBasePrice(parseFloat(weightKg), distanceKm, itemType);

        res.json({
            success: true,
            distanceKm: Math.round(distanceKm * 10) / 10,
            basePrice,
            minPrice: Math.ceil(basePrice * 0.8),
            maxPrice: Math.ceil(basePrice * 1.5)
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== MATCHING ENDPOINTS ====================

// GET /api/cargo/match/:requestId - Find matching drivers
router.get('/match/:requestId', async (req, res) => {
    try {
        const cargo = await CargoRequest.findOne({ id: req.params.requestId });
        if (!cargo) {
            return res.status(404).json({ success: false, error: 'Cargo not found' });
        }

        // Find drivers who are:
        // 1. Accepting cargo
        // 2. Have capacity for this weight
        // 3. Are online and near the pickup area
        const drivers = await CargoCapacity.find({
            acceptingCargo: true,
            maxWeightKg: { $gte: cargo.weightKg },
            $or: [
                { acceptedTypes: cargo.itemType },
                { acceptedTypes: { $size: 0 } } // Accepts all types
            ]
        });

        // Get driver locations
        const driverIds = drivers.map(d => d.driverId);
        const locations = await DriverLocation.find({
            driverId: { $in: driverIds },
            isOnline: true
        });

        // Create matches with scoring
        const matches = [];
        for (const driver of drivers) {
            const location = locations.find(l => l.driverId === driver.driverId);
            if (!location) continue;

            const [lng, lat] = location.location.coordinates;
            const pickupDistance = calculateDistance(
                lat, lng,
                cargo.pickupLocation.lat, cargo.pickupLocation.lng
            );

            // Only match drivers within 10km of pickup
            if (pickupDistance > 10) continue;

            // Calculate ETA (assuming 20km/h average in rural areas)
            const pickupETA = Math.ceil(pickupDistance / 20 * 60); // minutes
            const deliveryETA = pickupETA + Math.ceil(cargo.distanceKm / 25 * 60);

            // Score: lower detour = higher score
            const score = Math.max(0, 100 - (pickupDistance * 10));

            const match = new CargoMatch({
                id: `MATCH-${uuidv4().substr(0, 8).toUpperCase()}`,
                cargoRequestId: cargo.id,
                driverId: driver.driverId,
                driverName: driver.driverName,
                vehicleType: driver.vehicleType,
                pickupDetourKm: pickupDistance,
                totalDetourKm: pickupDistance,
                estimatedPickupTime: pickupETA,
                estimatedDeliveryTime: deliveryETA,
                driverCurrentLocation: { lat, lng },
                offerPrice: cargo.offeredPrice,
                shipperPrice: cargo.offeredPrice,
                score,
                status: 'PENDING',
                expiresAt: Date.now() + 30 * 60 * 1000, // 30 min expiry
                createdAt: Date.now()
            });

            await match.save();
            matches.push(match);
        }

        // Sort by score descending
        matches.sort((a, b) => b.score - a.score);

        res.json({
            success: true,
            matches,
            total: matches.length
        });
    } catch (error) {
        console.error('Match error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/cargo/accept - Driver accepts cargo
router.post('/accept', async (req, res) => {
    try {
        const { matchId, driverId, acceptedPrice } = req.body;

        const match = await CargoMatch.findOne({ id: matchId });
        if (!match) {
            return res.status(404).json({ success: false, error: 'Match not found' });
        }
        if (match.driverId !== driverId) {
            return res.status(403).json({ success: false, error: 'Unauthorized' });
        }
        if (match.status !== 'PENDING') {
            return res.status(400).json({ success: false, error: 'Match already processed' });
        }

        // Update match
        match.status = 'ACCEPTED';
        match.respondedAt = Date.now();
        await match.save();

        // Update cargo request
        const cargo = await CargoRequest.findOne({ id: match.cargoRequestId });
        cargo.status = 'DRIVER_ACCEPTED';
        cargo.matchedDriverId = driverId;
        cargo.matchedDriverName = match.driverName;
        cargo.matchedVehicleType = match.vehicleType;
        cargo.acceptedPrice = acceptedPrice || match.offerPrice;
        await cargo.save();

        // Reject other pending matches
        await CargoMatch.updateMany(
            { cargoRequestId: cargo.id, id: { $ne: matchId }, status: 'PENDING' },
            { status: 'REJECTED' }
        );

        res.json({
            success: true,
            cargo,
            match,
            message: 'Cargo accepted successfully'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/cargo/counter-offer - Driver makes counter offer
router.post('/counter-offer', async (req, res) => {
    try {
        const { matchId, driverId, counterPrice } = req.body;

        const match = await CargoMatch.findOne({ id: matchId, driverId });
        if (!match) {
            return res.status(404).json({ success: false, error: 'Match not found' });
        }

        match.status = 'COUNTER_OFFER';
        match.counterOfferPrice = counterPrice;
        await match.save();

        res.json({ success: true, match });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== PICKUP/DELIVERY ENDPOINTS ====================

// POST /api/cargo/pickup/:id - Confirm pickup with OTP
router.post('/pickup/:id', async (req, res) => {
    try {
        const { otp, photo, driverId } = req.body;
        const cargo = await CargoRequest.findOne({ id: req.params.id });

        if (!cargo) {
            return res.status(404).json({ success: false, error: 'Cargo not found' });
        }
        if (cargo.matchedDriverId !== driverId) {
            return res.status(403).json({ success: false, error: 'Unauthorized' });
        }
        if (cargo.pickupOTP !== otp) {
            return res.status(400).json({ success: false, error: 'Invalid OTP' });
        }

        cargo.status = 'PICKED_UP';
        cargo.pickupTimestamp = Date.now();
        cargo.pickupPhoto = photo;
        await cargo.save();

        // Update driver capacity
        await CargoCapacity.updateOne(
            { driverId },
            { $inc: { currentLoadKg: cargo.weightKg } }
        );

        res.json({
            success: true,
            cargo,
            deliveryOTP: cargo.deliveryOTP,
            message: 'Pickup confirmed'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/cargo/deliver/:id - Confirm delivery with OTP
router.post('/deliver/:id', async (req, res) => {
    try {
        const { otp, photo, driverId } = req.body;
        const cargo = await CargoRequest.findOne({ id: req.params.id });

        if (!cargo) {
            return res.status(404).json({ success: false, error: 'Cargo not found' });
        }
        if (cargo.matchedDriverId !== driverId) {
            return res.status(403).json({ success: false, error: 'Unauthorized' });
        }
        if (cargo.deliveryOTP !== otp) {
            return res.status(400).json({ success: false, error: 'Invalid OTP' });
        }

        cargo.status = 'DELIVERED';
        cargo.deliveryTimestamp = Date.now();
        cargo.deliveryPhoto = photo;
        await cargo.save();

        // Update driver capacity and stats
        await CargoCapacity.updateOne(
            { driverId },
            {
                $inc: { currentLoadKg: -cargo.weightKg, totalDeliveries: 1 },
                $set: { lastUpdated: Date.now() }
            }
        );

        res.json({
            success: true,
            cargo,
            message: 'Delivery confirmed! Payment processed.'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== DRIVER CAPACITY ENDPOINTS ====================

// GET /api/cargo/capacity/:driverId - Get driver's cargo capacity
router.get('/capacity/:driverId', async (req, res) => {
    try {
        let capacity = await CargoCapacity.findOne({ driverId: req.params.driverId });
        if (!capacity) {
            // Create default capacity
            const user = await User.findOne({ id: req.params.driverId });
            capacity = new CargoCapacity({
                driverId: req.params.driverId,
                driverName: user?.name || 'Driver',
                vehicleType: 'AUTO',
                maxWeightKg: 20,
                maxVolumeLiters: 50,
                acceptedTypes: ['PRODUCE', 'GOODS', 'FOOD', 'DOCUMENTS', 'PACKAGE'],
                acceptingCargo: true
            });
            await capacity.save();
        }
        res.json({ success: true, capacity });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT /api/cargo/capacity/:driverId - Update driver's cargo capacity
router.put('/capacity/:driverId', async (req, res) => {
    try {
        const updates = req.body;
        updates.lastUpdated = Date.now();

        const capacity = await CargoCapacity.findOneAndUpdate(
            { driverId: req.params.driverId },
            updates,
            { new: true, upsert: true }
        );

        res.json({ success: true, capacity });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/cargo/driver/:driverId - Get cargo requests for driver's route
router.get('/driver/:driverId', async (req, res) => {
    try {
        const capacity = await CargoCapacity.findOne({ driverId: req.params.driverId });
        if (!capacity || !capacity.acceptingCargo) {
            return res.json({ success: true, cargos: [] });
        }

        // Get driver's assigned cargo
        const assignedCargo = await CargoRequest.find({
            matchedDriverId: req.params.driverId,
            status: { $in: ['DRIVER_ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'] }
        });

        // Get pending matches for this driver
        const pendingMatches = await CargoMatch.find({
            driverId: req.params.driverId,
            status: 'PENDING',
            expiresAt: { $gt: Date.now() }
        });

        const pendingCargoIds = pendingMatches.map(m => m.cargoRequestId);
        const availableCargo = await CargoRequest.find({
            id: { $in: pendingCargoIds }
        });

        res.json({
            success: true,
            assignedCargo,
            availableCargo,
            pendingMatches,
            capacity
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/cargo/track/:id - Track cargo location
router.get('/track/:id', async (req, res) => {
    try {
        const cargo = await CargoRequest.findOne({ id: req.params.id });
        if (!cargo) {
            return res.status(404).json({ success: false, error: 'Cargo not found' });
        }

        let driverLocation = null;
        if (cargo.matchedDriverId && ['PICKED_UP', 'IN_TRANSIT'].includes(cargo.status)) {
            const location = await DriverLocation.findOne({ driverId: cargo.matchedDriverId });
            if (location) {
                driverLocation = {
                    lat: location.location.coordinates[1],
                    lng: location.location.coordinates[0],
                    lastUpdated: location.lastUpdated
                };
            }
        }

        res.json({
            success: true,
            cargo,
            driverLocation,
            pickupLocation: cargo.pickupLocation,
            dropoffLocation: cargo.dropoffLocation
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/cargo/cancel/:id - Cancel cargo request
router.post('/cancel/:id', async (req, res) => {
    try {
        const { userId, reason } = req.body;
        const cargo = await CargoRequest.findOne({ id: req.params.id });

        if (!cargo) {
            return res.status(404).json({ success: false, error: 'Cargo not found' });
        }
        if (cargo.shipperId !== userId && cargo.matchedDriverId !== userId) {
            return res.status(403).json({ success: false, error: 'Unauthorized' });
        }
        if (['DELIVERED', 'CANCELLED'].includes(cargo.status)) {
            return res.status(400).json({ success: false, error: 'Cannot cancel' });
        }

        cargo.status = 'CANCELLED';
        await cargo.save();

        // Reject all matches
        await CargoMatch.updateMany(
            { cargoRequestId: cargo.id },
            { status: 'REJECTED' }
        );

        res.json({ success: true, message: 'Cargo cancelled' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
