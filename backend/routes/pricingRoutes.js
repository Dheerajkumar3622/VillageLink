/**
 * Admin Pricing Routes - Centralized Rate Control
 * USS v3.0
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as Auth from '../auth.js';
import { TransportPricing, PriceAudit } from '../models/ussModels.js';

const router = express.Router();

// Seed default pricing (run once)
async function seedDefaultPricing() {
    const defaults = [
        { vehicleType: 'BUS', baseFare: 10, perKmRate: 1.5, perKgRate: 0.3, freeWeightKg: 10 },
        { vehicleType: 'AUTO', baseFare: 20, perKmRate: 3, perKgRate: 0.5, freeWeightKg: 5 },
        { vehicleType: 'CAR', baseFare: 50, perKmRate: 5, perKgRate: 1, freeWeightKg: 3 },
        { vehicleType: 'TRUCK', baseFare: 100, perKmRate: 8, perKgRate: 0.2, freeWeightKg: 100 },
        { vehicleType: 'BIKE', baseFare: 15, perKmRate: 2, perKgRate: 1, freeWeightKg: 2 },
        { vehicleType: 'TEMPO', baseFare: 80, perKmRate: 6, perKgRate: 0.3, freeWeightKg: 50 },
        { vehicleType: 'TRAVELER', baseFare: 30, perKmRate: 2, perKgRate: 0.4, freeWeightKg: 8 }
    ];

    for (const d of defaults) {
        const exists = await TransportPricing.findOne({ vehicleType: d.vehicleType });
        if (!exists) {
            await new TransportPricing({
                id: `TP-${d.vehicleType}`,
                ...d,
                nightChargePercent: 25,
                surgeMax: 1.5,
                platformCommission: 10,
                waitingChargePerMin: 2,
                isActive: true,
                createdAt: Date.now()
            }).save();
        }
    }
}

// Initialize on first request
let initialized = false;

// ==================== GET PRICING ====================

// Get all pricing
router.get('/all', async (req, res) => {
    try {
        if (!initialized) {
            await seedDefaultPricing();
            initialized = true;
        }

        const pricing = await TransportPricing.find({ isActive: true });
        res.json({ success: true, pricing });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get pricing for specific vehicle
router.get('/:vehicleType', async (req, res) => {
    try {
        const pricing = await TransportPricing.findOne({
            vehicleType: req.params.vehicleType.toUpperCase(),
            isActive: true
        });

        if (!pricing) {
            return res.status(404).json({ success: false, error: 'Pricing not found' });
        }

        res.json({ success: true, pricing });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== UPDATE PRICING (ADMIN) ====================

// Update pricing for vehicle type
router.put('/:vehicleType', Auth.authenticate, async (req, res) => {
    try {
        // Check if admin
        if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ success: false, error: 'Admin access required' });
        }

        const {
            baseFare, perKmRate, perKgRate, freeWeightKg,
            nightChargePercent, surgeMax, platformCommission, waitingChargePerMin
        } = req.body;

        const vehicleType = req.params.vehicleType.toUpperCase();

        const pricing = await TransportPricing.findOneAndUpdate(
            { vehicleType },
            {
                baseFare,
                perKmRate,
                perKgRate,
                freeWeightKg,
                nightChargePercent,
                surgeMax,
                platformCommission,
                waitingChargePerMin,
                updatedBy: req.user.id,
                updatedAt: new Date()
            },
            { new: true, upsert: true }
        );

        res.json({
            success: true,
            pricing,
            message: `${vehicleType} pricing updated`
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== CALCULATE PRICE ====================

// Calculate fare with breakdown
router.post('/calculate', async (req, res) => {
    try {
        const {
            vehicleType, distanceKm, weightKg = 0,
            isNight = false, surgeMultiplier = 1
        } = req.body;

        let pricing = await TransportPricing.findOne({
            vehicleType: vehicleType.toUpperCase(),
            isActive: true
        });

        if (!pricing) {
            pricing = {
                baseFare: 20,
                perKmRate: 3,
                perKgRate: 0.5,
                freeWeightKg: 5,
                nightChargePercent: 25,
                surgeMax: 1.5,
                platformCommission: 10
            };
        }

        // Calculate components
        const base = pricing.baseFare;
        const distance = distanceKm * pricing.perKmRate;
        const weight = weightKg > pricing.freeWeightKg
            ? (weightKg - pricing.freeWeightKg) * pricing.perKgRate
            : 0;

        let subtotal = base + distance + weight;

        // Night charge
        const night = isNight ? subtotal * (pricing.nightChargePercent / 100) : 0;
        subtotal += night;

        // Surge (capped)
        const actualSurge = Math.min(surgeMultiplier, pricing.surgeMax);
        const surge = subtotal * (actualSurge - 1);
        subtotal += surge;

        // Platform fee
        const platform = subtotal * (pricing.platformCommission / 100);
        const total = Math.round(subtotal + platform);

        // Log audit
        const audit = new PriceAudit({
            id: `PA-${uuidv4().substring(0, 12).toUpperCase()}`,
            orderType: 'CALCULATED',
            vehicleType: vehicleType.toUpperCase(),
            distanceKm,
            weightKg,
            appliedRates: {
                baseFare: pricing.baseFare,
                perKmRate: pricing.perKmRate,
                perKgRate: pricing.perKgRate,
                surgeMultiplier: actualSurge,
                nightCharge: isNight
            },
            breakdown: {
                base: Math.round(base),
                distance: Math.round(distance),
                weight: Math.round(weight),
                surge: Math.round(surge),
                night: Math.round(night),
                platform: Math.round(platform),
                total
            },
            calculatedAt: Date.now()
        });

        await audit.save();

        res.json({
            success: true,
            fare: total,
            breakdown: audit.breakdown,
            appliedRates: audit.appliedRates
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== AUDIT LOG ====================

// Get pricing audit log (Admin)
router.get('/audit/log', Auth.authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ success: false, error: 'Admin access required' });
        }

        const { limit = 100, vehicleType, orderType } = req.query;

        let query = {};
        if (vehicleType) query.vehicleType = vehicleType.toUpperCase();
        if (orderType) query.orderType = orderType;

        const audits = await PriceAudit.find(query)
            .sort({ calculatedAt: -1 })
            .limit(parseInt(limit));

        res.json({ success: true, audits });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
