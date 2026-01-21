/**
 * Village Manager Routes - API for proxy booking services
 * Enables VillageManagers to help villagers without smartphones access platform services
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { User, Beneficiary, ProxyTransaction, Ticket } from '../models.js';

const router = express.Router();

// Middleware to verify Village Manager role
const verifyVillageManager = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }

        const user = await User.findOne({ id: userId });
        if (!user || user.role !== 'VILLAGE_MANAGER') {
            return res.status(403).json({ success: false, error: 'Village Manager access required' });
        }

        req.manager = user;
        next();
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// =================================
// BENEFICIARY ENDPOINTS
// =================================

// GET /api/village-manager/beneficiaries - List all beneficiaries for the manager
router.get('/beneficiaries', verifyVillageManager, async (req, res) => {
    try {
        const beneficiaries = await Beneficiary.find({
            managerId: req.manager.id,
            isActive: true
        }).sort({ registeredAt: -1 });

        res.json({ success: true, beneficiaries });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/village-manager/beneficiaries - Register a new beneficiary
router.post('/beneficiaries', verifyVillageManager, async (req, res) => {
    try {
        const { name, phone, aadharNumber, address, village, panchayat, district } = req.body;

        if (!name || !village) {
            return res.status(400).json({ success: false, error: 'Name and village are required' });
        }

        // Check for duplicate by phone or aadhar if provided
        if (phone) {
            const existing = await Beneficiary.findOne({ phone, managerId: req.manager.id });
            if (existing) {
                return res.status(400).json({ success: false, error: 'Beneficiary with this phone already exists' });
            }
        }

        const beneficiary = new Beneficiary({
            id: `BEN-${uuidv4().slice(0, 8).toUpperCase()}`,
            name,
            phone,
            aadharNumber,
            address,
            village,
            panchayat,
            district,
            managerId: req.manager.id,
            registeredAt: Date.now(),
            isActive: true
        });

        await beneficiary.save();

        res.json({ success: true, beneficiary });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT /api/village-manager/beneficiaries/:id - Update beneficiary details
router.put('/beneficiaries/:id', verifyVillageManager, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const beneficiary = await Beneficiary.findOneAndUpdate(
            { id, managerId: req.manager.id },
            { $set: updates },
            { new: true }
        );

        if (!beneficiary) {
            return res.status(404).json({ success: false, error: 'Beneficiary not found' });
        }

        res.json({ success: true, beneficiary });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE /api/village-manager/beneficiaries/:id - Deactivate a beneficiary
router.delete('/beneficiaries/:id', verifyVillageManager, async (req, res) => {
    try {
        const { id } = req.params;

        const beneficiary = await Beneficiary.findOneAndUpdate(
            { id, managerId: req.manager.id },
            { $set: { isActive: false } },
            { new: true }
        );

        if (!beneficiary) {
            return res.status(404).json({ success: false, error: 'Beneficiary not found' });
        }

        res.json({ success: true, message: 'Beneficiary deactivated' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// =================================
// PROXY BOOKING ENDPOINTS
// =================================

// POST /api/village-manager/proxy/ticket - Book ticket on behalf of beneficiary
router.post('/proxy/ticket', verifyVillageManager, async (req, res) => {
    try {
        const { beneficiaryId, from, to, passengerCount, paymentMethod, notes } = req.body;

        if (!beneficiaryId || !from || !to) {
            return res.status(400).json({ success: false, error: 'Beneficiary, from, and to are required' });
        }

        // Verify beneficiary belongs to this manager
        const beneficiary = await Beneficiary.findOne({
            id: beneficiaryId,
            managerId: req.manager.id,
            isActive: true
        });

        if (!beneficiary) {
            return res.status(404).json({ success: false, error: 'Beneficiary not found' });
        }

        // Calculate fare (simplified - in production, use fare calculation service)
        const baseFare = 20;
        const farePerKm = 2;
        const estimatedDistance = 15; // Would be calculated in production
        const totalPrice = baseFare + (farePerKm * estimatedDistance * (passengerCount || 1));

        // Create ticket
        const ticket = new Ticket({
            id: `TKT-${uuidv4().slice(0, 8).toUpperCase()}`,
            userId: beneficiaryId, // Using beneficiary ID as user
            from,
            to,
            status: 'PENDING',
            paymentMethod: paymentMethod || 'CASH',
            timestamp: Date.now(),
            passengerCount: passengerCount || 1,
            totalPrice,
            proxyManagerId: req.manager.id // Track who booked it
        });

        await ticket.save();

        // Create proxy transaction record
        const transaction = new ProxyTransaction({
            id: `PTX-${uuidv4().slice(0, 8).toUpperCase()}`,
            beneficiaryId,
            beneficiaryName: beneficiary.name,
            managerId: req.manager.id,
            managerName: req.manager.name,
            transactionType: 'TICKET_BOOKING',
            referenceId: ticket.id,
            amount: totalPrice,
            paymentMethod: paymentMethod || 'CASH',
            paymentReceived: paymentMethod === 'CASH',
            status: 'COMPLETED',
            notes,
            timestamp: Date.now()
        });

        await transaction.save();

        res.json({
            success: true,
            ticket,
            transaction,
            message: `Ticket booked for ${beneficiary.name}`
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// =================================
// TRANSACTION HISTORY
// =================================

// GET /api/village-manager/transactions - Get all proxy transaction history
router.get('/transactions', verifyVillageManager, async (req, res) => {
    try {
        const { limit = 50, status, type } = req.query;

        const query = { managerId: req.manager.id };
        if (status) query.status = status;
        if (type) query.transactionType = type;

        const transactions = await ProxyTransaction
            .find(query)
            .sort({ timestamp: -1 })
            .limit(parseInt(limit));

        res.json({ success: true, transactions });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// =================================
// DASHBOARD STATS
// =================================

// GET /api/village-manager/stats - Get VillageManager dashboard stats
router.get('/stats', verifyVillageManager, async (req, res) => {
    try {
        const managerId = req.manager.id;

        // Get beneficiary counts
        const totalBeneficiaries = await Beneficiary.countDocuments({ managerId });
        const activeBeneficiaries = await Beneficiary.countDocuments({ managerId, isActive: true });

        // Get today's start timestamp
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        // Get transaction stats
        const todaysTransactions = await ProxyTransaction.countDocuments({
            managerId,
            timestamp: { $gte: todayStart.getTime() }
        });

        const totalTransactions = await ProxyTransaction.countDocuments({ managerId });

        // Calculate revenue
        const revenueAgg = await ProxyTransaction.aggregate([
            { $match: { managerId, status: 'COMPLETED' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const totalRevenue = revenueAgg[0]?.total || 0;

        // Pending payments
        const pendingPayments = await ProxyTransaction.countDocuments({
            managerId,
            paymentReceived: false,
            status: { $ne: 'CANCELLED' }
        });

        res.json({
            success: true,
            stats: {
                totalBeneficiaries,
                activeBeneficiaries,
                todaysTransactions,
                totalTransactions,
                totalRevenue,
                pendingPayments
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
