import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticate } from '../auth.js';
import Models from '../models.js';

const { VillageCircle, User } = Models;
const router = express.Router();

/**
 * Village Circles - Social Group Buying & Community Support
 */

// Create a new Village Circle
router.post('/circle', authenticate, async (req, res) => {
    try {
        const { name, description, targetItems, location } = req.body;

        const circle = new VillageCircle({
            id: `CIRC-${uuidv4().substring(0, 8).toUpperCase()}`,
            name,
            description,
            creatorId: req.user.id,
            members: [{
                userId: req.user.id,
                role: 'ADMIN',
                joinedAt: Date.now()
            }],
            targetItems: targetItems || [],
            location: location || req.user.location,
            status: 'ACTIVE'
        });

        await circle.save();
        res.status(201).json({ success: true, circle });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Join a Village Circle
router.post('/circle/:id/join', authenticate, async (req, res) => {
    try {
        const circle = await VillageCircle.findOne({ id: req.params.id });
        if (!circle) return res.status(404).json({ error: "Circle not found" });

        if (circle.members.find(m => m.userId === req.user.id)) {
            return res.status(400).json({ error: "Already a member" });
        }

        circle.members.push({
            userId: req.user.id,
            role: 'MEMBER',
            joinedAt: Date.now()
        });

        await circle.save();
        res.json({ success: true, message: "Joined successfully" });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Get Circles near me
router.get('/circles', async (req, res) => {
    try {
        const { lat, lng, radius = 10 } = req.query; // radius in km
        // Simple filter for now (can upgrade to $near if indexed)
        const circles = await VillageCircle.find({ status: 'ACTIVE' }).limit(20);
        res.json({ success: true, circles });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

/**
 * Gamification & Hero Points
 */

// Daily Streak Update / Hero Points Check
router.post('/user/daily-heartbeat', authenticate, async (req, res) => {
    try {
        const user = await User.findOne({ id: req.user.id });
        if (!user) return res.status(404).json({ error: "User not found" });

        const today = new Date().setHours(0, 0, 0, 0);
        const lastActivity = user.lastActivityDate ? new Date(user.lastActivityDate).setHours(0, 0, 0, 0) : 0;

        let bonusPoints = 0;
        if (today !== lastActivity) {
            // New day activity
            if (today - lastActivity === 86400000) {
                user.dailyStreak += 1;
                bonusPoints = 10 * user.dailyStreak; // Bonus increases with streak
            } else {
                user.dailyStreak = 1;
                bonusPoints = 10;
            }
            user.heroPoints += bonusPoints;
            user.lastActivityDate = Date.now();

            // Level up logic
            user.heroLevel = Math.floor(user.heroPoints / 1000) + 1;
            await user.save();
        }

        res.json({
            success: true,
            streak: user.dailyStreak,
            points: user.heroPoints,
            level: user.heroLevel,
            reward: bonusPoints > 0 ? `+${bonusPoints} Hero Points!` : null
        });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

export default router;
