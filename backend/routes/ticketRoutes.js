/**
 * Ticket Routes
 * API endpoints for ticket verification and management
 */

import express from 'express';
import crypto from 'crypto';
import { Ticket, User } from '../models.js';
import * as Auth from '../auth.js';

const router = express.Router();

// Secret key for HMAC (should match ticketService.ts)
const TICKET_SECRET = process.env.TICKET_SECRET || 'VL_SECURE_TICKET_2026_xK9pL2mN';

// In-memory scan tracking
const scanHistory = new Map();

// --- HELPER FUNCTIONS ---

const createTicketSignature = (ticket) => {
    const data = `${ticket.id}|${ticket.userId}|${ticket.from}|${ticket.to}|${ticket.totalPrice}|${ticket.timestamp}`;
    return crypto.createHmac('sha256', TICKET_SECRET).update(data).digest('hex');
};

const validateTicketIdFormat = (ticketId) => {
    const parts = ticketId.split('-');
    if (parts.length !== 4 || parts[0] !== 'TKT') return false;

    const [, timestamp, random, checksum] = parts;
    const raw = `${timestamp}${random}`;
    const expectedChecksum = crypto
        .createHash('md5')
        .update(raw + TICKET_SECRET)
        .digest('hex')
        .substring(0, 4)
        .toUpperCase();

    return checksum === expectedChecksum;
};

const decodeQRPayload = (qrString) => {
    try {
        const decoded = Buffer.from(qrString, 'base64url').toString('utf-8');
        return JSON.parse(decoded);
    } catch {
        return null;
    }
};

// --- ROUTES ---

/**
 * POST /api/ticket/verify
 * Verify a scanned ticket QR code
 */
router.post('/verify', Auth.authenticate, async (req, res) => {
    try {
        const { qrPayload, deviceId } = req.body;
        const driverId = req.user.id;

        if (!qrPayload) {
            return res.status(400).json({ valid: false, error: 'QR payload required' });
        }

        // 1. Decode QR payload
        const qrData = decodeQRPayload(qrPayload);
        if (!qrData) {
            return res.status(400).json({ valid: false, error: 'Invalid QR code format' });
        }

        // 2. Check QR expiry
        if (Date.now() > qrData.e) {
            return res.json({
                valid: false,
                error: 'QR code expired. Ask passenger to refresh.',
                needsRefresh: true
            });
        }

        // 3. Validate ticket ID format
        if (!validateTicketIdFormat(qrData.t)) {
            return res.json({
                valid: false,
                error: 'Invalid ticket ID',
                fraudReason: 'FORGED_ID'
            });
        }

        // 4. Fetch ticket from database
        const ticket = await Ticket.findOne({ id: qrData.t });
        if (!ticket) {
            return res.json({ valid: false, error: 'Ticket not found' });
        }

        // 5. Check ticket status
        if (ticket.status === 'COMPLETED') {
            return res.json({ valid: false, error: 'Ticket already used' });
        }
        if (ticket.status === 'CANCELLED') {
            return res.json({ valid: false, error: 'Ticket was cancelled' });
        }

        // 6. Verify signature
        const fullSignature = createTicketSignature(ticket);
        if (!fullSignature.startsWith(qrData.s)) {
            return res.json({
                valid: false,
                error: 'Signature mismatch',
                fraudReason: 'FORGED_SIGNATURE'
            });
        }

        // 7. Check scan history
        const scanKey = qrData.t;
        const scanRecord = scanHistory.get(scanKey);

        if (scanRecord) {
            const timeSinceLastScan = Date.now() - scanRecord.lastScan;

            // Same ticket scanned by different device within 2 minutes
            if (timeSinceLastScan < 120000 && scanRecord.deviceId !== deviceId && scanRecord.driverId !== driverId) {
                return res.json({
                    valid: false,
                    error: 'Duplicate scan detected!',
                    fraudReason: 'DUPLICATE_SCAN'
                });
            }

            // Too many scans
            if (scanRecord.count >= 3) {
                return res.json({
                    valid: false,
                    error: 'Too many scans for this ticket',
                    fraudReason: 'EXCESSIVE_SCANS'
                });
            }
        }

        // 8. Record this scan
        scanHistory.set(scanKey, {
            count: (scanRecord?.count || 0) + 1,
            lastScan: Date.now(),
            deviceId,
            driverId
        });

        // 9. Update ticket status to BOARDED
        await Ticket.findOneAndUpdate(
            { id: qrData.t },
            {
                status: 'BOARDED',
                scannedAt: Date.now(),
                scannedByDriverId: driverId,
                scanCount: (ticket.scanCount || 0) + 1
            }
        );

        // 10. Return success with ticket details
        const user = await User.findOne({ id: ticket.userId });

        res.json({
            valid: true,
            ticket: {
                id: ticket.id,
                from: ticket.from,
                to: ticket.to,
                passengerCount: ticket.passengerCount,
                totalPrice: ticket.totalPrice,
                status: 'BOARDED',
                paymentMethod: ticket.paymentMethod,
                passengerName: user?.name || 'Passenger',
                bookedAt: ticket.timestamp
            }
        });

    } catch (error) {
        console.error('Ticket verification error:', error);
        res.status(500).json({ valid: false, error: 'Verification failed' });
    }
});

/**
 * POST /api/ticket/generate-qr
 * Generate/refresh QR payload for a ticket
 */
router.post('/generate-qr', Auth.authenticate, async (req, res) => {
    try {
        const { ticketId } = req.body;
        const userId = req.user.id;

        // Fetch ticket
        const ticket = await Ticket.findOne({ id: ticketId, userId });
        if (!ticket) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        // Generate signature
        const signature = createTicketSignature(ticket);

        // Create QR payload
        const qrData = {
            t: ticketId,
            s: signature.substring(0, 16),
            e: Date.now() + 5 * 60 * 1000, // 5 min validity
            v: 1
        };
        const qrPayload = Buffer.from(JSON.stringify(qrData)).toString('base64url');

        // Update ticket with new QR data
        await Ticket.findOneAndUpdate(
            { id: ticketId },
            {
                qrPayload,
                signature,
                expiresAt: qrData.e
            }
        );

        res.json({
            qrPayload,
            expiresAt: qrData.e,
            expiresIn: 300 // seconds
        });

    } catch (error) {
        console.error('QR generation error:', error);
        res.status(500).json({ error: 'Failed to generate QR' });
    }
});

/**
 * GET /api/ticket/:id/status
 * Get ticket status (for real-time updates)
 */
router.get('/:id/status', Auth.authenticate, async (req, res) => {
    try {
        const ticket = await Ticket.findOne({ id: req.params.id });
        if (!ticket) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        res.json({
            id: ticket.id,
            status: ticket.status,
            scannedAt: ticket.scannedAt,
            scannedByDriverId: ticket.scannedByDriverId,
            scanCount: ticket.scanCount || 0
        });

    } catch (error) {
        res.status(500).json({ error: 'Failed to get status' });
    }
});

/**
 * POST /api/ticket/:id/complete
 * Mark ticket as completed (end of journey)
 */
router.post('/:id/complete', Auth.authenticate, async (req, res) => {
    try {
        const driverId = req.user.id;
        const ticketId = req.params.id;

        const ticket = await Ticket.findOneAndUpdate(
            { id: ticketId, scannedByDriverId: driverId },
            {
                status: 'COMPLETED',
                completedAt: Date.now()
            },
            { new: true }
        );

        if (!ticket) {
            return res.status(404).json({ error: 'Ticket not found or not scanned by you' });
        }

        // Clear scan history
        scanHistory.delete(ticketId);

        res.json({ success: true, message: 'Trip completed' });

    } catch (error) {
        res.status(500).json({ error: 'Failed to complete trip' });
    }
});

/**
 * GET /api/ticket/driver/today
 * Get today's scanned tickets for driver dashboard
 */
router.get('/driver/today', Auth.authenticate, async (req, res) => {
    try {
        const driverId = req.user.id;
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const tickets = await Ticket.find({
            scannedByDriverId: driverId,
            scannedAt: { $gte: startOfDay.getTime() }
        }).sort({ scannedAt: -1 }).lean();

        const summary = {
            totalTickets: tickets.length,
            totalPassengers: tickets.reduce((sum, t) => sum + t.passengerCount, 0),
            totalCash: tickets
                .filter(t => t.paymentMethod === 'CASH')
                .reduce((sum, t) => sum + t.totalPrice, 0),
            totalOnline: tickets
                .filter(t => t.paymentMethod !== 'CASH')
                .reduce((sum, t) => sum + t.totalPrice, 0)
        };

        res.json({ tickets, summary });

    } catch (error) {
        res.status(500).json({ error: 'Failed to get tickets' });
    }
});

export default router;
