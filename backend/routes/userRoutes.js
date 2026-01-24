
import express from 'express';
import { User, Transaction } from '../models.js';
import { authenticate } from '../auth.js';

const router = express.Router();

// Get user wallet balance and NFT passes
router.get('/wallet', authenticate, async (req, res) => {
    try {
        const user = await User.findOne({ id: req.user.id });
        if (!user) return res.status(404).json({ error: "User not found" });

        res.json({
            balance: user.walletBalance || 0,
            nfts: [], // For future NFT passes
            address: user.did || '0x' + Math.random().toString(16).slice(2, 42),
            heroPoints: user.heroPoints || 0,
            heroLevel: user.heroLevel || 1,
            dailyStreak: user.dailyStreak || 0
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Register additional roles for a user (Provider Registration)
router.post('/register-roles', authenticate, async (req, res) => {
    try {
        const { roles } = req.body;
        if (!roles || !Array.isArray(roles) || roles.length === 0) {
            return res.status(400).json({ error: "Roles are required" });
        }

        const user = await User.findOne({ id: req.user.id });
        if (!user) return res.status(404).json({ error: "User not found" });

        // For simplicity in current architecture, we take the first role as the primary role
        // In a real multi-role system, we'd add to a roles array
        const primaryRole = roles[0].roleType;

        // Map frontend roles to backend roles if mismatch
        let mappedRole = primaryRole;
        if (primaryRole === 'MESS_OWNER') mappedRole = 'MESS_MANAGER';
        if (primaryRole === 'LOGISTICS') mappedRole = 'LOGISTICS_PARTNER';

        user.role = mappedRole;
        user.isVerified = false;

        // 100x: Multi-role support for Provider App
        if (!user.providerRoles) user.providerRoles = [];
        const roleExists = user.providerRoles.find(r => r.roleType === mappedRole);

        if (!roleExists) {
            user.providerRoles.push({
                roleType: mappedRole,
                status: 'PENDING',
                businessName: roles[0].businessName || user.name,
                businessAddress: roles[0].businessAddress || user.address,
                registeredAt: Date.now()
            });
        }

        user.activeRole = mappedRole;

        await user.save();

        res.json({
            success: true,
            message: "Role registration submitted for approval",
            role: mappedRole,
            providerRoles: user.providerRoles
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
