/**
 * Reels Routes - Instagram-style Short Videos
 * USS v3.0
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as Auth from '../auth.js';
import { Reel, ReelInteraction } from '../models/ussModels.js';
import { User } from '../models.js';

const router = express.Router();

// ==================== FEED ====================

// Get reels feed
router.get('/feed', async (req, res) => {
    try {
        const { limit = 10, skip = 0, userId } = req.query;

        const reels = await Reel.find({ status: 'ACTIVE' })
            .sort({ createdAt: -1 })
            .skip(parseInt(skip))
            .limit(parseInt(limit));

        // If user is logged in, add their interaction status
        let enrichedReels = reels;
        if (userId) {
            const interactions = await ReelInteraction.find({
                reelId: { $in: reels.map(r => r.id) },
                userId,
                type: { $in: ['LIKE', 'SAVE'] }
            });

            enrichedReels = reels.map(reel => ({
                ...reel.toObject(),
                isLiked: interactions.some(i => i.reelId === reel.id && i.type === 'LIKE'),
                isSaved: interactions.some(i => i.reelId === reel.id && i.type === 'SAVE')
            }));
        }

        res.json({ success: true, reels: enrichedReels });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get reels by shop/creator
router.get('/creator/:creatorId', async (req, res) => {
    try {
        const reels = await Reel.find({
            creatorId: req.params.creatorId,
            status: 'ACTIVE'
        }).sort({ createdAt: -1 });

        res.json({ success: true, reels });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get single reel
router.get('/:id', async (req, res) => {
    try {
        const reel = await Reel.findOne({ id: req.params.id });

        if (!reel) {
            return res.status(404).json({ success: false, error: 'Reel not found' });
        }

        res.json({ success: true, reel });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== CREATE/UPLOAD ====================

// Upload new reel
router.post('/upload', Auth.authenticate, async (req, res) => {
    try {
        const {
            videoUrl, thumbnailUrl, duration,
            caption, hashtags, musicId, musicTitle, musicArtist,
            locationTag, productTags, shopId, creatorType
        } = req.body;

        if (!videoUrl) {
            return res.status(400).json({ success: false, error: 'Video URL required' });
        }

        const reel = new Reel({
            id: `REEL-${uuidv4().substring(0, 10).toUpperCase()}`,
            creatorId: req.user.id,
            creatorName: req.user.name,
            creatorType: creatorType || 'USER',
            shopId,
            videoUrl,
            thumbnailUrl,
            duration: duration || 0,
            aspectRatio: '9:16',
            caption: caption || '',
            hashtags: hashtags || [],
            musicId,
            musicTitle,
            musicArtist,
            locationTag,
            productTags: productTags || [],
            status: 'ACTIVE', // Could be 'PROCESSING' if transcoding needed
            createdAt: Date.now()
        });

        await reel.save();

        // Update user's reels count
        await User.updateOne(
            { id: req.user.id },
            { $inc: { reelsCount: 1 } }
        );

        res.json({
            success: true,
            reel,
            message: 'Reel uploaded successfully'
        });
    } catch (error) {
        console.error('Reel upload error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete reel
router.delete('/:id', Auth.authenticate, async (req, res) => {
    try {
        const reel = await Reel.findOne({ id: req.params.id, creatorId: req.user.id });

        if (!reel) {
            return res.status(404).json({ success: false, error: 'Reel not found or not owned by you' });
        }

        reel.status = 'REMOVED';
        await reel.save();

        res.json({ success: true, message: 'Reel deleted' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== INTERACTIONS ====================

// View reel (log watch time)
router.post('/:id/view', async (req, res) => {
    try {
        const { userId, watchDuration, watchPercent } = req.body;

        // Increment view count
        await Reel.updateOne(
            { id: req.params.id },
            { $inc: { viewCount: 1 } }
        );

        // Log interaction
        if (userId) {
            await new ReelInteraction({
                id: `RI-${uuidv4().substring(0, 12)}`,
                reelId: req.params.id,
                userId,
                type: 'VIEW',
                watchDuration,
                watchPercent,
                timestamp: Date.now()
            }).save();
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Like/Unlike reel
router.post('/:id/like', Auth.authenticate, async (req, res) => {
    try {
        const existing = await ReelInteraction.findOne({
            reelId: req.params.id,
            userId: req.user.id,
            type: 'LIKE'
        });

        if (existing) {
            // Unlike
            await ReelInteraction.deleteOne({ id: existing.id });
            await Reel.updateOne({ id: req.params.id }, { $inc: { likeCount: -1 } });
            res.json({ success: true, liked: false });
        } else {
            // Like
            await new ReelInteraction({
                id: `RI-${uuidv4().substring(0, 12)}`,
                reelId: req.params.id,
                userId: req.user.id,
                type: 'LIKE',
                timestamp: Date.now()
            }).save();
            await Reel.updateOne({ id: req.params.id }, { $inc: { likeCount: 1 } });
            res.json({ success: true, liked: true });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Comment on reel
router.post('/:id/comment', Auth.authenticate, async (req, res) => {
    try {
        const { comment, replyToCommentId } = req.body;

        if (!comment || comment.trim().length === 0) {
            return res.status(400).json({ success: false, error: 'Comment required' });
        }

        const interaction = new ReelInteraction({
            id: `RI-${uuidv4().substring(0, 12)}`,
            reelId: req.params.id,
            userId: req.user.id,
            type: 'COMMENT',
            comment: comment.trim(),
            replyToCommentId,
            timestamp: Date.now()
        });

        await interaction.save();
        await Reel.updateOne({ id: req.params.id }, { $inc: { commentCount: 1 } });

        res.json({
            success: true,
            comment: {
                id: interaction.id,
                text: interaction.comment,
                userId: req.user.id,
                userName: req.user.name,
                timestamp: interaction.timestamp
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get comments
router.get('/:id/comments', async (req, res) => {
    try {
        const comments = await ReelInteraction.find({
            reelId: req.params.id,
            type: 'COMMENT'
        }).sort({ timestamp: -1 }).limit(100);

        // Enrich with user names
        const enriched = await Promise.all(
            comments.map(async (c) => {
                const user = await User.findOne({ id: c.userId }).select('name');
                return {
                    id: c.id,
                    text: c.comment,
                    userId: c.userId,
                    userName: user?.name || 'User',
                    replyTo: c.replyToCommentId,
                    timestamp: c.timestamp
                };
            })
        );

        res.json({ success: true, comments: enriched });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Save/Unsave reel
router.post('/:id/save', Auth.authenticate, async (req, res) => {
    try {
        const existing = await ReelInteraction.findOne({
            reelId: req.params.id,
            userId: req.user.id,
            type: 'SAVE'
        });

        if (existing) {
            await ReelInteraction.deleteOne({ id: existing.id });
            await Reel.updateOne({ id: req.params.id }, { $inc: { saveCount: -1 } });
            res.json({ success: true, saved: false });
        } else {
            await new ReelInteraction({
                id: `RI-${uuidv4().substring(0, 12)}`,
                reelId: req.params.id,
                userId: req.user.id,
                type: 'SAVE',
                timestamp: Date.now()
            }).save();
            await Reel.updateOne({ id: req.params.id }, { $inc: { saveCount: 1 } });
            res.json({ success: true, saved: true });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Share reel
router.post('/:id/share', async (req, res) => {
    try {
        await Reel.updateOne({ id: req.params.id }, { $inc: { shareCount: 1 } });

        const reel = await Reel.findOne({ id: req.params.id });
        const shareUrl = `https://villagelink.app/reel/${req.params.id}`;

        res.json({
            success: true,
            shareUrl,
            shareText: `Check out this reel: ${reel?.caption || ''}`
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== DISCOVERY ====================

// Search reels by hashtag
router.get('/search/hashtag/:tag', async (req, res) => {
    try {
        const reels = await Reel.find({
            hashtags: { $regex: req.params.tag, $options: 'i' },
            status: 'ACTIVE'
        }).sort({ viewCount: -1 }).limit(50);

        res.json({ success: true, reels });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Trending reels
router.get('/trending', async (req, res) => {
    try {
        // Get reels from last 7 days, sorted by engagement
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        const reels = await Reel.find({
            status: 'ACTIVE',
            createdAt: { $gte: weekAgo }
        }).sort({
            likeCount: -1,
            viewCount: -1
        }).limit(20);

        res.json({ success: true, reels });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
