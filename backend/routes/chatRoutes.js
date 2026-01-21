/**
 * Chat Routes - WhatsApp-style Messaging
 * USS v3.0
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as Auth from '../auth.js';
import { Conversation, Message } from '../models/ussModels.js';
import { User } from '../models.js';

const router = express.Router();

// ==================== CONVERSATIONS ====================

// Get my conversations
router.get('/conversations', Auth.authenticate, async (req, res) => {
    try {
        const conversations = await Conversation.find({
            'participants.userId': req.user.id,
            isActive: true
        }).sort({ updatedAt: -1 });

        // Add unread count for current user
        const enriched = conversations.map(conv => {
            const unread = conv.unreadCount?.get(req.user.id) || 0;
            return {
                ...conv.toObject(),
                myUnreadCount: unread
            };
        });

        res.json({ success: true, conversations: enriched });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Start new conversation
router.post('/conversation', Auth.authenticate, async (req, res) => {
    try {
        const { recipientId, message, orderId, orderType } = req.body;

        if (!recipientId) {
            return res.status(400).json({ success: false, error: 'Recipient required' });
        }

        // Check if conversation already exists
        let conversation = await Conversation.findOne({
            type: orderId ? 'ORDER_CHAT' : 'DIRECT',
            orderId: orderId || null,
            'participants.userId': { $all: [req.user.id, recipientId] }
        });

        if (!conversation) {
            // Get recipient details
            const recipient = await User.findOne({ id: recipientId }).select('name');

            conversation = new Conversation({
                id: `CONV-${uuidv4().substring(0, 12).toUpperCase()}`,
                type: orderId ? 'ORDER_CHAT' : 'DIRECT',
                orderId,
                orderType,
                participants: [
                    {
                        userId: req.user.id,
                        name: req.user.name,
                        role: 'SENDER',
                        joinedAt: new Date(),
                        lastReadAt: new Date()
                    },
                    {
                        userId: recipientId,
                        name: recipient?.name || 'User',
                        role: 'RECIPIENT',
                        joinedAt: new Date()
                    }
                ],
                unreadCount: new Map([[recipientId, 0]]),
                createdAt: Date.now(),
                updatedAt: Date.now()
            });

            await conversation.save();
        }

        // If initial message provided, send it
        if (message) {
            const msg = new Message({
                id: `MSG-${uuidv4().substring(0, 12).toUpperCase()}`,
                conversationId: conversation.id,
                senderId: req.user.id,
                senderName: req.user.name,
                type: 'TEXT',
                content: message,
                status: 'SENT',
                timestamp: Date.now()
            });

            await msg.save();

            // Update conversation
            conversation.lastMessage = {
                text: message,
                senderId: req.user.id,
                senderName: req.user.name,
                type: 'TEXT',
                timestamp: new Date()
            };
            conversation.updatedAt = new Date();

            // Increment unread for recipient
            const currentUnread = conversation.unreadCount.get(recipientId) || 0;
            conversation.unreadCount.set(recipientId, currentUnread + 1);

            await conversation.save();
        }

        res.json({
            success: true,
            conversation,
            message: 'Conversation started'
        });
    } catch (error) {
        console.error('Start conversation error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get conversation details
router.get('/conversation/:id', Auth.authenticate, async (req, res) => {
    try {
        const conversation = await Conversation.findOne({
            id: req.params.id,
            'participants.userId': req.user.id
        });

        if (!conversation) {
            return res.status(404).json({ success: false, error: 'Conversation not found' });
        }

        res.json({ success: true, conversation });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== MESSAGES ====================

// Get messages in conversation
router.get('/conversation/:id/messages', Auth.authenticate, async (req, res) => {
    try {
        const { limit = 50, before } = req.query;

        // Verify user is participant
        const conversation = await Conversation.findOne({
            id: req.params.id,
            'participants.userId': req.user.id
        });

        if (!conversation) {
            return res.status(404).json({ success: false, error: 'Conversation not found' });
        }

        let query = { conversationId: req.params.id, isDeleted: false };
        if (before) {
            query.timestamp = { $lt: new Date(before) };
        }

        const messages = await Message.find(query)
            .sort({ timestamp: -1 })
            .limit(parseInt(limit));

        // Mark as read
        await Conversation.updateOne(
            { id: req.params.id, 'participants.userId': req.user.id },
            {
                $set: {
                    'participants.$.lastReadAt': new Date(),
                    [`unreadCount.${req.user.id}`]: 0
                }
            }
        );

        // Mark messages as read
        await Message.updateMany(
            {
                conversationId: req.params.id,
                senderId: { $ne: req.user.id },
                status: { $ne: 'READ' }
            },
            {
                $push: { readBy: { userId: req.user.id, readAt: new Date() } },
                $set: { status: 'READ' }
            }
        );

        res.json({ success: true, messages: messages.reverse() });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Send message
router.post('/conversation/:id/message', Auth.authenticate, async (req, res) => {
    try {
        const { type = 'TEXT', content, mediaUrl, productData, locationData, replyToMessageId } = req.body;

        // Verify user is participant
        const conversation = await Conversation.findOne({
            id: req.params.id,
            'participants.userId': req.user.id
        });

        if (!conversation) {
            return res.status(404).json({ success: false, error: 'Conversation not found' });
        }

        // Get reply content if replying
        let replyToContent = null;
        if (replyToMessageId) {
            const replyMsg = await Message.findOne({ id: replyToMessageId });
            replyToContent = replyMsg?.content?.substring(0, 100);
        }

        const message = new Message({
            id: `MSG-${uuidv4().substring(0, 12).toUpperCase()}`,
            conversationId: req.params.id,
            senderId: req.user.id,
            senderName: req.user.name,
            type,
            content,
            mediaUrl,
            productData,
            locationData,
            replyToMessageId,
            replyToContent,
            status: 'SENT',
            timestamp: Date.now()
        });

        await message.save();

        // Update conversation
        const previewText = type === 'TEXT' ? content : `[${type}]`;
        conversation.lastMessage = {
            text: previewText?.substring(0, 50),
            senderId: req.user.id,
            senderName: req.user.name,
            type,
            timestamp: new Date()
        };
        conversation.updatedAt = new Date();

        // Increment unread for other participants
        for (const p of conversation.participants) {
            if (p.userId !== req.user.id) {
                const current = conversation.unreadCount.get(p.userId) || 0;
                conversation.unreadCount.set(p.userId, current + 1);
            }
        }

        await conversation.save();

        res.json({
            success: true,
            message,
            conversationUpdated: true
        });
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete message
router.delete('/message/:id', Auth.authenticate, async (req, res) => {
    try {
        const message = await Message.findOne({ id: req.params.id, senderId: req.user.id });

        if (!message) {
            return res.status(404).json({ success: false, error: 'Message not found' });
        }

        message.isDeleted = true;
        message.content = 'This message was deleted';
        await message.save();

        res.json({ success: true, message: 'Message deleted' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== SPECIAL MESSAGES ====================

// Send product card
router.post('/conversation/:id/send-product', Auth.authenticate, async (req, res) => {
    try {
        const { productId, productName, price, image } = req.body;

        const message = new Message({
            id: `MSG-${uuidv4().substring(0, 12).toUpperCase()}`,
            conversationId: req.params.id,
            senderId: req.user.id,
            senderName: req.user.name,
            type: 'PRODUCT',
            content: `Shared: ${productName}`,
            productData: { productId, name: productName, price, image },
            status: 'SENT',
            timestamp: Date.now()
        });

        await message.save();

        // Update conversation
        const conversation = await Conversation.findOne({ id: req.params.id });
        if (conversation) {
            conversation.lastMessage = {
                text: `Shared a product: ${productName}`,
                senderId: req.user.id,
                senderName: req.user.name,
                type: 'PRODUCT',
                timestamp: new Date()
            };
            conversation.updatedAt = new Date();
            await conversation.save();
        }

        res.json({ success: true, message });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Send location
router.post('/conversation/:id/send-location', Auth.authenticate, async (req, res) => {
    try {
        const { lat, lng, address, name } = req.body;

        const message = new Message({
            id: `MSG-${uuidv4().substring(0, 12).toUpperCase()}`,
            conversationId: req.params.id,
            senderId: req.user.id,
            senderName: req.user.name,
            type: 'LOCATION',
            content: `Shared location: ${name || address}`,
            locationData: { lat, lng, address, name },
            status: 'SENT',
            timestamp: Date.now()
        });

        await message.save();

        res.json({ success: true, message });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== REACTIONS ====================

// React to message
router.post('/message/:id/react', Auth.authenticate, async (req, res) => {
    try {
        const { emoji } = req.body;

        const message = await Message.findOne({ id: req.params.id });
        if (!message) {
            return res.status(404).json({ success: false, error: 'Message not found' });
        }

        // Remove existing reaction from user
        message.reactions = message.reactions.filter(r => r.userId !== req.user.id);

        // Add new reaction
        if (emoji) {
            message.reactions.push({
                userId: req.user.id,
                emoji,
                timestamp: new Date()
            });
        }

        await message.save();

        res.json({ success: true, reactions: message.reactions });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== UNREAD COUNT ====================

// Get total unread count
router.get('/unread-count', Auth.authenticate, async (req, res) => {
    try {
        const conversations = await Conversation.find({
            'participants.userId': req.user.id,
            isActive: true
        });

        let totalUnread = 0;
        for (const conv of conversations) {
            totalUnread += conv.unreadCount?.get(req.user.id) || 0;
        }

        res.json({ success: true, unreadCount: totalUnread });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
