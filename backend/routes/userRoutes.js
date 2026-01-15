
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
            address: user.did || '0x' + Math.random().toString(16).slice(2, 42)
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Update transaction history (off-chain ledger)
router.post('/transaction', authenticate, async (req, res) => {
    try {
        const { amount, type, desc } = req.body;

        const transaction = new Transaction({
            id: `TX-${Date.now()}`,
            userId: req.user.id,
            amount: amount,
            type: type, // EARN, SPEND
            description: desc,
            timestamp: Date.now(),
            status: 'COMPLETED'
        });

        await transaction.save();

        // Update user balance if EARN
        if (type === 'EARN') {
            await User.findOneAndUpdate({ id: req.user.id }, { $inc: { walletBalance: amount } });
        } else if (type === 'SPEND') {
            await User.findOneAndUpdate({ id: req.user.id }, { $inc: { walletBalance: -amount } });
        }

        res.json({ success: true, transaction });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
