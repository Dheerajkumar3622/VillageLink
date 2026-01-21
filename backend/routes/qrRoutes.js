/**
 * QR Code Routes - Universal QR Scanner System
 * USS v3.0
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as Auth from '../auth.js';
import { QRCode, QRScanLog } from '../models/ussModels.js';
import { User, Shop, FoodVendor, Restaurant } from '../models.js';

const router = express.Router();

// ==================== QR GENERATION ====================

// Generate QR Code for Shop/User/Product
router.post('/generate', Auth.authenticate, async (req, res) => {
    try {
        const { qrType, name, description, entityId } = req.body;
        const userId = req.user.id;

        // Build payload based on type
        let payload = {
            app: 'villagelink',
            v: 1,
            type: qrType,
            id: entityId || userId,
            data: {}
        };

        switch (qrType) {
            case 'SHOP':
                payload.data = { name, ownerId: userId };
                break;
            case 'PAYMENT':
                payload.data = { name: req.user.name, phone: req.user.phone };
                break;
            case 'PRODUCT':
                payload.data = { name, productId: entityId };
                break;
            case 'USER':
                payload.data = { name: req.user.name, userId };
                break;
            default:
                payload.data = { name };
        }

        const qrCode = new QRCode({
            id: `QR-${uuidv4().substring(0, 12).toUpperCase()}`,
            ownerId: userId,
            ownerType: qrType === 'SHOP' ? 'SHOP' : qrType === 'PRODUCT' ? 'PRODUCT' : 'USER',
            qrType,
            payload: JSON.stringify(payload),
            name: name || `${qrType} QR`,
            description,
            createdAt: Date.now()
        });

        await qrCode.save();

        res.json({
            success: true,
            qrCode,
            message: 'QR Code generated successfully'
        });
    } catch (error) {
        console.error('QR generation error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== QR SCANNING ====================

// Get QR Info (what happens when scanned)
router.get('/:id/info', async (req, res) => {
    try {
        const qrCode = await QRCode.findOne({ id: req.params.id, isActive: true });

        if (!qrCode) {
            return res.status(404).json({ success: false, error: 'QR Code not found or inactive' });
        }

        const payload = JSON.parse(qrCode.payload);
        let entityDetails = null;

        // Fetch additional details based on type
        switch (qrCode.qrType) {
            case 'SHOP':
                entityDetails = await Shop.findOne({ id: payload.id }) ||
                    await FoodVendor.findOne({ id: payload.id }) ||
                    await Restaurant.findOne({ id: payload.id });
                break;
            case 'USER':
            case 'PAYMENT':
                entityDetails = await User.findOne({ id: payload.id }).select('name phone walletBalance');
                break;
        }

        res.json({
            success: true,
            qrCode: {
                id: qrCode.id,
                type: qrCode.qrType,
                name: qrCode.name,
                payload
            },
            entityDetails,
            action: getActionForType(qrCode.qrType)
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Log QR Scan and get action
router.post('/:id/scan', Auth.authenticate, async (req, res) => {
    try {
        const { location, action } = req.body;
        const qrCode = await QRCode.findOne({ id: req.params.id });

        if (!qrCode) {
            return res.status(404).json({ success: false, error: 'QR Code not found' });
        }

        // Update scan count
        await QRCode.updateOne(
            { id: req.params.id },
            {
                $inc: { scanCount: 1 },
                lastScannedAt: new Date(),
                lastScannedBy: req.user.id
            }
        );

        // Log the scan
        const scanLog = new QRScanLog({
            id: `SCAN-${uuidv4().substring(0, 12).toUpperCase()}`,
            qrId: qrCode.id,
            qrType: qrCode.qrType,
            scannedBy: req.user.id,
            scannedByName: req.user.name,
            action: action || 'VIEW',
            location,
            timestamp: Date.now()
        });

        await scanLog.save();

        const payload = JSON.parse(qrCode.payload);

        res.json({
            success: true,
            qrType: qrCode.qrType,
            payload,
            navigateTo: getNavigationRoute(qrCode.qrType, payload),
            message: 'QR scanned successfully'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== MY QR CODES ====================

// Get all my QR codes
router.get('/my-codes', Auth.authenticate, async (req, res) => {
    try {
        const qrCodes = await QRCode.find({ ownerId: req.user.id, isActive: true })
            .sort({ createdAt: -1 });

        res.json({ success: true, qrCodes });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get scan history
router.get('/scan-history', Auth.authenticate, async (req, res) => {
    try {
        const history = await QRScanLog.find({ scannedBy: req.user.id })
            .sort({ timestamp: -1 })
            .limit(50);

        // Enrich with QR details
        const enrichedHistory = await Promise.all(
            history.map(async (scan) => {
                const qr = await QRCode.findOne({ id: scan.qrId });
                return {
                    ...scan.toObject(),
                    qrName: qr?.name,
                    qrType: qr?.qrType
                };
            })
        );

        res.json({ success: true, history: enrichedHistory });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete QR Code
router.delete('/:id', Auth.authenticate, async (req, res) => {
    try {
        const result = await QRCode.updateOne(
            { id: req.params.id, ownerId: req.user.id },
            { isActive: false }
        );

        if (result.modifiedCount === 0) {
            return res.status(404).json({ success: false, error: 'QR not found or not owned by you' });
        }

        res.json({ success: true, message: 'QR Code deleted' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== HELPERS ====================

function getActionForType(qrType) {
    const actions = {
        'SHOP': { action: 'NAVIGATE', screen: 'ShopDetail', button: 'View Shop' },
        'PAYMENT': { action: 'PAYMENT', screen: 'QuickPay', button: 'Pay Now' },
        'TICKET': { action: 'VALIDATE', screen: 'TicketDetail', button: 'View Ticket' },
        'PARCEL': { action: 'NAVIGATE', screen: 'ParcelTracking', button: 'Track Parcel' },
        'USER': { action: 'NAVIGATE', screen: 'UserProfile', button: 'View Profile' },
        'PRODUCT': { action: 'NAVIGATE', screen: 'ProductDetail', button: 'View Product' }
    };
    return actions[qrType] || { action: 'VIEW', screen: 'Unknown', button: 'View' };
}

function getNavigationRoute(qrType, payload) {
    const routes = {
        'SHOP': `/shop/${payload.id}`,
        'PAYMENT': `/pay/${payload.id}`,
        'TICKET': `/ticket/${payload.id}`,
        'PARCEL': `/track/${payload.id}`,
        'USER': `/profile/${payload.id}`,
        'PRODUCT': `/product/${payload.id}`
    };
    return routes[qrType] || '/';
}

export default router;
