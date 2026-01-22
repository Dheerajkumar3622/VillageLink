import express from 'express';
import * as Auth from '../auth.js';
import VillageManagerService from '../services/villageManagerService.js';
import Models from '../models.js';
const { VillageManager } = Models;

const router = express.Router();

/**
 * VillageManager Routes
 */

// Middleware to ensure user is a VillageManager
const requireVillageManager = async (req, res, next) => {
    if (req.user.role !== 'VILLAGE_MANAGER' && req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Access denied. VillageManager role required.' });
    }
    next();
};

// Register as VillageManager (Complete profile)
router.post('/complete-profile', Auth.authenticate, async (req, res) => {
    try {
        const { village, panchayat, block, aadhaarNumber } = req.body;
        const userId = req.user.id;

        let profile = await VillageManager.findOne({ userId });
        if (profile) {
            return res.status(400).json({ error: 'Profile already exists' });
        }

        profile = new VillageManager({
            id: 'VM' + Math.random().toString(36).substr(2, 9).toUpperCase(),
            userId,
            village,
            panchayat,
            block,
            aadhaarNumber,
            status: 'VERIFIED' // Default to verified for demo/simplicity unless asked otherwise
        });

        await profile.save();
        res.status(201).json(profile);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get Profile/Stats
router.get('/profile', Auth.authenticate, requireVillageManager, async (req, res) => {
    try {
        const profile = await VillageManagerService.getManagerStats(req.user.id);
        if (!profile) return res.status(404).json({ error: 'Profile not found' });
        res.json(profile);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add Beneficiary
router.post('/beneficiary', Auth.authenticate, requireVillageManager, async (req, res) => {
    try {
        const beneficiary = await VillageManagerService.registerBeneficiary(req.user.id, req.body);
        res.status(201).json(beneficiary);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// List Beneficiaries
router.get('/beneficiaries', Auth.authenticate, requireVillageManager, async (req, res) => {
    try {
        const beneficiaries = await VillageManagerService.getBeneficiaries(req.user.id);
        res.json(beneficiaries);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Proxy Ticket Booking
router.post('/book-ticket', Auth.authenticate, requireVillageManager, async (req, res) => {
    try {
        const { beneficiaryId, ticketData } = req.body;
        const result = await VillageManagerService.createProxyTicket(req.user.id, beneficiaryId, ticketData);
        res.status(201).json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Transaction History
router.get('/transactions', Auth.authenticate, requireVillageManager, async (req, res) => {
    try {
        const transactions = await VillageManagerService.getProxyTransactions(req.user.id);
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
