/**
 * Ticket Routes
 * API endpoints for ticket verification and management
 */

import express from 'express';
import crypto from 'crypto';
import { Ticket, User, Route, DriverLocation, StopDemand, SystemSetting } from '../models.js';
import * as Auth from '../auth.js';

const router = express.Router();

// Haversine distance (km)
const haversineCalc = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// --- 1000x: FARE CALCULATOR ---
router.post('/calculate-fare', async (req, res) => {
  try {
    const { from, to } = req.body;
    if (!from || !to) return res.status(400).json({ error: 'from and to required' });

    const routes = await Route.find({ stops: { $all: [from, to] } }).lean();
    if (routes.length === 0) return res.status(404).json({ error: 'No route found between these stops' });

    const route = routes[0];
    const fromIndex = route.stops.indexOf(from);
    const toIndex = route.stops.indexOf(to);
    const startIdx = Math.min(fromIndex, toIndex);
    const endIdx = Math.max(fromIndex, toIndex);
    const stopsInBetween = route.stops.slice(startIdx, endIdx + 1);
    const totalStops = route.stops.length - 1;
    const segmentStops = endIdx - startIdx;
    const segmentDistance = route.totalDistance
      ? Math.round((route.totalDistance * segmentStops / totalStops) * 10) / 10
      : segmentStops * 3;

    let farePerKm = 1.5, baseFare = 10;
    try {
      const settings = await SystemSetting.findOne({ key: 'fare_config' }).lean();
      if (settings?.value) { farePerKm = settings.value.farePerKm || 1.5; baseFare = settings.value.baseFare || 10; }
    } catch (e) { }

    const fare = Math.ceil(baseFare + (segmentDistance * farePerKm));
    const estimatedTime = Math.round(segmentDistance * 2);

    const liveVehicles = await DriverLocation.find({ activeRouteId: route.id, isOnline: true }).lean();

    res.json({
      from, to,
      route: { id: route.id, name: route.name || `${route.from} → ${route.to}` },
      distance: `${segmentDistance} km`, distanceKm: segmentDistance,
      fare,
      fareBreakdown: { baseFare, distanceCharge: Math.ceil(segmentDistance * farePerKm), farePerKm },
      stops: stopsInBetween, stopCount: stopsInBetween.length,
      estimatedTime: `${estimatedTime} min`,
      availableVehicles: liveVehicles.map(v => ({
        driverId: v.driverId, driverName: v.driverName || 'Driver', vehicleType: v.vehicleType || 'BUS',
        seatsAvailable: (v.seatsTotal || 20) - (v.seatsOccupied || 0), currentStop: v.nextStopName || 'En route',
        location: { lat: v.location?.coordinates?.[1], lng: v.location?.coordinates?.[0] }
      })),
      vehicleCount: liveVehicles.length
    });
  } catch (error) {
    console.error('Fare calculation error:', error);
    res.status(500).json({ error: 'Failed to calculate fare' });
  }
});

// --- 1000x: BOOK TICKET ---
router.post('/book', Auth.authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { from, to, passengerCount, paymentMethod, routeId } = req.body;
    if (!from || !to) return res.status(400).json({ error: 'from and to required' });

    const passengers = passengerCount || 1;
    const payment = paymentMethod || 'CASH';
    const route = await Route.findOne(routeId ? { id: routeId } : { stops: { $all: [from, to] } }).lean();
    if (!route) return res.status(404).json({ error: 'No route found' });

    const fromIndex = route.stops.indexOf(from);
    const toIndex = route.stops.indexOf(to);
    const totalStops = route.stops.length - 1;
    const segmentStops = Math.abs(toIndex - fromIndex);
    const segmentDistance = route.totalDistance ? (route.totalDistance * segmentStops / totalStops) : segmentStops * 3;

    let farePerKm = 1.5, baseFare = 10;
    try {
      const settings = await SystemSetting.findOne({ key: 'fare_config' }).lean();
      if (settings?.value) { farePerKm = settings.value.farePerKm || 1.5; baseFare = settings.value.baseFare || 10; }
    } catch (e) { }

    const farePerPerson = Math.ceil(baseFare + (segmentDistance * farePerKm));
    const totalPrice = farePerPerson * passengers;

    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const raw = `${timestamp}${random}`;
    const TICKET_SECRET_KEY = process.env.TICKET_SECRET || 'VL_SECURE_TICKET_2026_xK9pL2mN';
    const checksum = crypto.createHash('md5').update(raw + TICKET_SECRET_KEY).digest('hex').substring(0, 4).toUpperCase();
    const ticketId = `TKT-${timestamp}-${random}-${checksum}`;

    const ticket = new Ticket({
      id: ticketId, userId, from, to, routeId: route.id,
      passengerCount: passengers, totalPrice, farePerPerson,
      paymentMethod: payment, status: payment === 'CASH' ? 'PENDING' : 'PAID',
      timestamp: Date.now()
    });
    await ticket.save();

    await StopDemand.findOneAndUpdate(
      { stopName: from, routeId: route.id },
      { $inc: { waitingPassengers: passengers }, lastUpdated: new Date() },
      { upsert: true }
    );

    const user = await User.findOne({ id: userId }).lean();
    console.log(`🎟️ Ticket booked: ${ticketId} | ${user?.name} | ${from} → ${to} | ₹${totalPrice} ${payment}`);

    const liveVehicles = await DriverLocation.find({ activeRouteId: route.id, isOnline: true }).lean();

    res.json({
      success: true,
      ticket: {
        id: ticketId, from, to, passengerCount: passengers, farePerPerson, totalPrice,
        paymentMethod: payment, status: ticket.status,
        route: route.name || `${route.from} → ${route.to}`, bookedAt: ticket.timestamp
      },
      vehicles: liveVehicles.map(v => ({
        driverId: v.driverId, driverName: v.driverName, vehicleType: v.vehicleType,
        seatsAvailable: (v.seatsTotal || 20) - (v.seatsOccupied || 0), currentStop: v.nextStopName,
        location: { lat: v.location?.coordinates?.[1], lng: v.location?.coordinates?.[0] }
      }))
    });
  } catch (error) {
    console.error('Booking error:', error);
    res.status(500).json({ error: 'Booking failed' });
  }
});

// --- 1000x: MY TICKETS ---
router.get('/my-tickets', Auth.authenticate, async (req, res) => {
  try {
    const tickets = await Ticket.find({ userId: req.user.id }).sort({ timestamp: -1 }).limit(parseInt(req.query.limit) || 20).lean();
    const active = tickets.filter(t => ['PENDING', 'PAID', 'BOARDED'].includes(t.status));
    const past = tickets.filter(t => ['COMPLETED', 'CANCELLED'].includes(t.status));
    res.json({ active, past, total: tickets.length });
  } catch (error) { res.status(500).json({ error: 'Failed to get tickets' }); }
});

// --- 1000x: LIVE VEHICLES ON TICKET ROUTE ---
router.get('/:id/vehicles', Auth.authenticate, async (req, res) => {
  try {
    const ticket = await Ticket.findOne({ id: req.params.id }).lean();
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const route = await Route.findOne(
      ticket.routeId ? { id: ticket.routeId } : { stops: { $all: [ticket.from, ticket.to] } }
    ).lean();
    if (!route) return res.json({ vehicles: [] });

    const vehicles = await DriverLocation.find({ activeRouteId: route.id, isOnline: true }).lean();

    res.json({
      ticket: { id: ticket.id, from: ticket.from, to: ticket.to, status: ticket.status },
      route: route.name || `${route.from} → ${route.to}`,
      vehicles: vehicles.map(v => ({
        driverId: v.driverId, driverName: v.driverName || 'Driver', vehicleType: v.vehicleType || 'BUS',
        seatsTotal: v.seatsTotal || 20, seatsOccupied: v.seatsOccupied || 0,
        seatsAvailable: (v.seatsTotal || 20) - (v.seatsOccupied || 0),
        currentStop: v.nextStopName,
        location: { lat: v.location?.coordinates?.[1], lng: v.location?.coordinates?.[0] },
        speed: v.speed || 0, heading: v.heading || 0, lastUpdated: v.lastUpdated
      }))
    });
  } catch (error) { res.status(500).json({ error: 'Failed to get vehicles' }); }
});

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
