/**
 * UMG API Routes - Unified Mobility Grid Backend Routes
 * 
 * Handles:
 * - Driver subscriptions (zero-commission model)
 * - Share Auto FLMC routes
 * - Guardian safety features
 * - Conductor metrics and revenue protection
 */

import express from 'express';
import {
    DriverSubscription,
    ShareAutoRoute,
    ShareAutoVehicle,
    TrustedContact,
    LiveShare,
    SafetyAlert,
    ConductorMetrics,
    AudioVerification,
    FraudAlert,
    MultimodalJourney,
    User
} from '../models.js';

const router = express.Router();

// ==================== SUBSCRIPTION ROUTES ====================

// Get current subscription for user
router.get('/subscriptions/current', async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const subscription = await DriverSubscription.findOne({
            userId,
            status: { $in: ['ACTIVE', 'GRACE'] }
        }).sort({ createdAt: -1 });

        if (!subscription) {
            return res.status(404).json({ error: 'No active subscription' });
        }

        res.json(subscription);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create subscription
router.post('/subscriptions/create', async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { planId, paymentMethod, amount, duration } = req.body;

        // Calculate dates
        const startDate = Date.now();
        let endDate;
        switch (duration) {
            case 'DAILY':
                endDate = startDate + 24 * 60 * 60 * 1000;
                break;
            case 'MONTHLY':
                endDate = startDate + 30 * 24 * 60 * 60 * 1000;
                break;
            case 'YEARLY':
                endDate = startDate + 365 * 24 * 60 * 60 * 1000;
                break;
            default:
                endDate = startDate + 24 * 60 * 60 * 1000;
        }

        const subscription = new DriverSubscription({
            id: `SUB_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userId,
            planId,
            plan: duration,
            amount,
            startDate,
            endDate,
            status: 'ACTIVE',
            autoRenew: true,
            createdAt: Date.now(),
            updatedAt: Date.now()
        });

        await subscription.save();

        // If UPI/Wallet, activate immediately; else return payment URL
        if (paymentMethod === 'WALLET') {
            // Deduct from wallet
            await User.updateOne({ id: userId }, { $inc: { walletBalance: -amount } });
            res.json({ subscription });
        } else {
            // Return Razorpay order creation URL (implement actual Razorpay integration)
            res.json({
                subscription,
                paymentUrl: `/api/payment/create?subscriptionId=${subscription.id}&amount=${amount}`
            });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Activate subscription after payment
router.post('/subscriptions/activate', async (req, res) => {
    try {
        const { subscriptionId, transactionId } = req.body;

        const subscription = await DriverSubscription.findOneAndUpdate(
            { id: subscriptionId },
            {
                status: 'ACTIVE',
                transactionId,
                updatedAt: Date.now()
            },
            { new: true }
        );

        if (!subscription) {
            return res.status(404).json({ error: 'Subscription not found' });
        }

        res.json(subscription);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Cancel subscription
router.post('/subscriptions/:id/cancel', async (req, res) => {
    try {
        const subscription = await DriverSubscription.findOneAndUpdate(
            { id: req.params.id, userId: req.user?.id },
            { status: 'CANCELLED', autoRenew: false, updatedAt: Date.now() },
            { new: true }
        );

        if (!subscription) {
            return res.status(404).json({ error: 'Subscription not found' });
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get subscription history
router.get('/subscriptions/history', async (req, res) => {
    try {
        const userId = req.user?.id;
        const subscriptions = await DriverSubscription.find({ userId })
            .sort({ createdAt: -1 })
            .limit(20);
        res.json(subscriptions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== SHARE AUTO ROUTES ====================

// Get nearby share auto routes
router.get('/share-auto/routes/nearby', async (req, res) => {
    try {
        const { lat, lng, radius = 2 } = req.query;

        // For now, return all active routes (implement geo query in production)
        const routes = await ShareAutoRoute.find({ isActive: true }).limit(10);
        res.json(routes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get route by ID
router.get('/share-auto/routes/:id', async (req, res) => {
    try {
        const route = await ShareAutoRoute.findOne({ id: req.params.id });
        if (!route) {
            return res.status(404).json({ error: 'Route not found' });
        }
        res.json(route);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get vehicles on a route
router.get('/share-auto/routes/:id/vehicles', async (req, res) => {
    try {
        const vehicles = await ShareAutoVehicle.find({
            routeId: req.params.id,
            status: { $ne: 'OFFLINE' }
        });
        res.json(vehicles);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update vehicle location (for drivers)
router.post('/share-auto/vehicle/location', async (req, res) => {
    try {
        const { vehicleId, lat, lng, heading, speed, occupancy } = req.body;

        await ShareAutoVehicle.findOneAndUpdate(
            { id: vehicleId },
            {
                currentLocation: { lat, lng, heading, speed, updatedAt: Date.now() },
                currentOccupancy: occupancy,
                lastUpdated: Date.now()
            }
        );

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Toggle freight mode
router.post('/driver/:driverId/freight-mode', async (req, res) => {
    try {
        const { enableFreight } = req.body;

        await ShareAutoVehicle.findOneAndUpdate(
            { driverId: req.params.driverId },
            { freightModeEnabled: enableFreight }
        );

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== JOURNEY PLANNING ROUTES ====================

// Plan multimodal journey
router.post('/journey/plan', async (req, res) => {
    try {
        const { origin, destination } = req.body;

        // Simple journey planning (replace with actual routing API)
        const distance = Math.sqrt(
            Math.pow(destination.lat - origin.lat, 2) +
            Math.pow(destination.lng - origin.lng, 2)
        ) * 111; // Approximate km

        const segments = [];

        if (distance > 2) {
            // First mile
            segments.push({
                mode: 'SHARE_AUTO',
                from: origin,
                to: { name: 'Bus Stand', lat: origin.lat + 0.01, lng: origin.lng + 0.01 },
                duration: 5,
                distance: 1.5,
                fare: 15
            });

            // Main journey
            segments.push({
                mode: 'BUS',
                from: { name: 'Bus Stand', lat: origin.lat + 0.01, lng: origin.lng + 0.01 },
                to: { name: 'Drop Point', lat: destination.lat - 0.005, lng: destination.lng - 0.005 },
                duration: Math.round(distance * 3),
                distance: distance - 2,
                fare: Math.round(10 + (distance - 2) * 2.5)
            });

            // Last mile
            segments.push({
                mode: 'WALK',
                from: { name: 'Drop Point', lat: destination.lat - 0.005, lng: destination.lng - 0.005 },
                to: destination,
                duration: 3,
                distance: 0.3,
                fare: 0
            });
        } else {
            segments.push({
                mode: 'AUTO',
                from: origin,
                to: destination,
                duration: Math.round(distance * 3),
                distance,
                fare: Math.round(15 + distance * 5)
            });
        }

        const journey = {
            id: `journey_${Date.now()}`,
            segments,
            totalFare: segments.reduce((sum, s) => sum + s.fare, 0),
            totalDuration: segments.reduce((sum, s) => sum + s.duration, 0),
            totalDistance: segments.reduce((sum, s) => sum + s.distance, 0)
        };

        res.json([journey]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== GUARDIAN ROUTES ====================

// Get trusted contacts
router.get('/guardian/contacts', async (req, res) => {
    try {
        const userId = req.user?.id;
        const contacts = await TrustedContact.find({ userId });
        res.json(contacts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add trusted contact
router.post('/guardian/contacts', async (req, res) => {
    try {
        const userId = req.user?.id;
        const { name, phone, relationship, autoShare } = req.body;

        const contact = new TrustedContact({
            id: `contact_${Date.now()}`,
            userId,
            name,
            phone,
            relationship,
            autoShare,
            createdAt: Date.now()
        });

        await contact.save();
        res.json(contact);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete trusted contact
router.delete('/guardian/contacts/:id', async (req, res) => {
    try {
        await TrustedContact.deleteOne({ id: req.params.id, userId: req.user?.id });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start live share
router.post('/guardian/share', async (req, res) => {
    try {
        const userId = req.user?.id;
        const { tripId, contactIds } = req.body;

        // Get contact phone numbers
        const contacts = await TrustedContact.find({
            id: { $in: contactIds || [] },
            userId
        });

        const shareToken = Math.random().toString(36).substr(2, 12);

        const liveShare = new LiveShare({
            id: `share_${Date.now()}`,
            tripId,
            userId,
            sharedWith: contacts.map(c => c.phone),
            shareToken,
            shareUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/track/${shareToken}`,
            status: 'ACTIVE',
            expiresAt: Date.now() + 24 * 60 * 60 * 1000,
            createdAt: Date.now()
        });

        await liveShare.save();
        res.json(liveShare);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Stop live share
router.post('/guardian/share/:id/stop', async (req, res) => {
    try {
        await LiveShare.findOneAndUpdate(
            { id: req.params.id },
            { status: 'ENDED' }
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Trigger SOS
router.post('/guardian/sos', async (req, res) => {
    try {
        const userId = req.user?.id;
        const { location, tripId, audioUrl, type = 'SOS' } = req.body;

        const alert = new SafetyAlert({
            id: `alert_${Date.now()}`,
            type,
            userId,
            tripId,
            location,
            message: 'Emergency SOS triggered',
            audioUrl,
            status: 'ACTIVE',
            createdAt: Date.now()
        });

        await alert.save();

        // TODO: Send SMS to trusted contacts
        // TODO: Notify nearby authorities

        res.json(alert);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Cancel SOS
router.post('/guardian/sos/:id/cancel', async (req, res) => {
    try {
        await SafetyAlert.findOneAndUpdate(
            { id: req.params.id },
            { status: 'RESOLVED', resolvedAt: Date.now() }
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== CONDUCTOR METRICS ROUTES ====================

// Get today's metrics
router.get('/conductor/:conductorId/metrics/:date', async (req, res) => {
    try {
        let metrics = await ConductorMetrics.findOne({
            conductorId: req.params.conductorId,
            date: req.params.date
        });

        if (!metrics) {
            metrics = {
                conductorId: req.params.conductorId,
                date: req.params.date,
                totalTickets: 0,
                digitalTickets: 0,
                cashTickets: 0,
                totalRevenue: 0,
                verifiedRevenue: 0,
                fraudAlerts: 0,
                bonusEarned: 0
            };
        }

        res.json(metrics);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get historical metrics
router.get('/conductor/:conductorId/metrics', async (req, res) => {
    try {
        const { days = 7 } = req.query;
        const metrics = await ConductorMetrics.find({
            conductorId: req.params.conductorId
        })
            .sort({ date: -1 })
            .limit(parseInt(days));
        res.json(metrics);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Log audio verification
router.post('/conductor/verifications', async (req, res) => {
    try {
        const verification = new AudioVerification({
            ...req.body,
            id: `av_${Date.now()}`
        });
        await verification.save();

        // Update conductor metrics
        const today = new Date().toISOString().split('T')[0];
        await ConductorMetrics.findOneAndUpdate(
            { conductorId: req.body.conductorId, date: today },
            {
                $inc: {
                    totalTickets: 1,
                    digitalTickets: req.body.type === 'TICKET_VALIDATED' ? 1 : 0,
                    verifiedRevenue: req.body.amount || 0
                },
                $set: { updatedAt: Date.now() }
            },
            { upsert: true }
        );

        res.json(verification);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== ADMIN STATS ROUTES ====================

// Get subscription stats
router.get('/admin/subscriptions/stats', async (req, res) => {
    try {
        const totalActive = await DriverSubscription.countDocuments({ status: 'ACTIVE' });
        const today = new Date().toISOString().split('T')[0];

        // Calculate daily revenue from subscriptions
        const todayStart = new Date(today).getTime();
        const todaySubs = await DriverSubscription.find({
            createdAt: { $gte: todayStart }
        });
        const dailyRevenue = todaySubs.reduce((sum, s) => sum + s.amount, 0);

        res.json({
            totalActiveSubscribers: totalActive,
            dailyRevenue,
            monthlyRevenue: dailyRevenue * 30, // Rough estimate
            churnRate: 5, // TODO: Calculate actual churn
            conversionRate: 12 // TODO: Calculate actual conversion
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get active subscriptions list
router.get('/admin/subscriptions/active', async (req, res) => {
    try {
        const subscriptions = await DriverSubscription.find({ status: 'ACTIVE' })
            .sort({ createdAt: -1 })
            .limit(100);
        res.json(subscriptions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
