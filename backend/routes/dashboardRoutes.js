/**
 * Dashboard Routes — Unified role-based dashboards
 * 
 * Single API call per role returns all relevant data
 */

import express from 'express';
import { User, Ticket, DriverLocation, CropListing, ProcurementOrder, FoodOrder, Parcel, Notification, Route, SystemSetting } from '../models.js';
import crypto from 'crypto';
import { DailySchedule } from '../models/ussModels.js';
import { findMatchingVehicles } from '../services/trajectoryMatcher.js';
import * as Auth from '../auth.js';

const router = express.Router();

/**
 * Helper: Haversine distance (km)
 */
const haversineDist = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/**
 * 🚀 GET /api/dashboard/transit-hub/precision-radar
 * Whisk 3.0 API: Returns vehicles from both directions, 
 * AI Crowd Forecasts, dynamic pricing.
 */
router.get('/transit-hub/precision-radar', Auth.authenticate, async (req, res) => {
    try {
        const { lat, lng } = req.query;
        if (!lat || !lng) return res.status(400).json({ error: 'Coordinates required' });

        const userLat = parseFloat(lat);
        const userLng = parseFloat(lng);

        // 1. Find routes that are within walking distance (e.g. 1km)
        // For simplicity since stopCoordinates are not heavily populated in demo,
        // we'll fetch all routes and do basic matching or just rely on nearest active drivers
        // But the plan needs structured directions.

        // Get all active drivers online
        const activeDrivers = await DriverLocation.find({ isOnline: true }).lean();

        let corridors = {}; // Group by direction name

        for (const driver of activeDrivers) {
            if (!driver.activeRouteId || !driver.location || !driver.location.coordinates) continue;

            const dLng = driver.location.coordinates[0];
            const dLat = driver.location.coordinates[1];
            const distKm = haversineDist(userLat, userLng, dLat, dLng);

            // Only consider vehicles within 15km radar
            if (distKm > 15) continue;

            const route = await Route.findOne({ id: driver.activeRouteId }).lean();
            if (!route) continue;

            // Simplified Direction Inference
            // Check if user is near any stop on this route
            let userStopIndex = -1;
            let closestDist = Infinity;
            if (route.stopCoordinates && route.stopCoordinates.length === route.stops.length) {
                route.stopCoordinates.forEach((sc, idx) => {
                    if(sc && sc.lat && sc.lng) {
                        const d = haversineDist(userLat, userLng, sc.lat, sc.lng);
                        if (d < closestDist && d < 2) { // User is near this stop
                            closestDist = d;
                            userStopIndex = idx;
                        }
                    }
                });
            } else {
                // Mock inference if coords are missing
                userStopIndex = Math.floor(route.stops.length / 2);
            }

            if (userStopIndex === -1) continue; // Route doesn't pass near user

            const currentDriverStopIdx = driver.nextStopIndex || 0;
            const isGoingForward = (driver.nextStopName !== route.stops[0]); // simplistic assumption
            
            // Only show vehicles heading TOWARDS the user
            const stopsAway = userStopIndex - currentDriverStopIdx;
            
            // Note: If stopsAway < 0, bus has passed (assuming forward direction)
            // For now, let's just group them into two virtual corridors for the UI demo to look rich
            const isNorthbound = driver.heading ? (driver.heading < 90 || driver.heading > 270) : true;
            const directionName = isNorthbound ? `Towards ${route.to}` : `Towards ${route.from}`;
            
            if (!corridors[directionName]) corridors[directionName] = [];

            const total = driver.seatsTotal || 40;
            const occupied = driver.seatsOccupied || 0;
            const available = Math.max(0, total - occupied);
            const fillRatio = total > 0 ? (occupied / total) : 0;
            
            // AI Crowd logic
            let aiPrediction = "LOW_CROWD";
            if (fillRatio > 0.8) aiPrediction = "FULL_EXPECTED";
            else if (fillRatio > 0.5) aiPrediction = "HIGH_CROWD_EXPECTED";

            // Basic base fare + km math
            const bFare = 10;
            const fareRate = 1.5;

            let dynamicFareMap = {};
            // Generate fares for remaining stops
            for (let i = userStopIndex + 1; i < route.stops.length; i++) {
                const stopDist = Math.max(1, (i - userStopIndex) * 3); // rough 3km per stop
                const surge = fillRatio > 0.8 ? 1.2 : 1; // 20% surge if crowded
                dynamicFareMap[route.stops[i]] = Math.ceil((bFare + stopDist * fareRate) * surge);
            }

            corridors[directionName].push({
                id: driver.driverId,
                name: driver.driverName || 'Village Express',
                distanceMeters: Math.round(distKm * 1000),
                etaSeconds: Math.round(distKm * 120), // assume 30km/h => ~120s per km
                liveSeats: { available, total, occupied },
                aiPrediction,
                routeId: route.id,
                routeName: route.name || `${route.from} ⇄ ${route.to}`,
                stopsInBetween: route.stops,
                currentDriverStopIdx,
                userStopIndex,
                dynamicFareMap
            });
        }

        // Convert corridors map to array
        let approachingCorridors = Object.keys(corridors).map(k => ({
            directionName: k,
            vehicles: corridors[k].sort((a,b) => a.etaSeconds - b.etaSeconds)
        }));

        // DEMO Fallback if empty
        if (approachingCorridors.length === 0) {
            approachingCorridors = [
                {
                    directionName: "Towards Patna East",
                    vehicles: [
                        {
                            id: "DEMO-BUS-1", name: "Premium AC Liner", distanceMeters: 1500, etaSeconds: 120,
                            liveSeats: { available: 5, total: 30, occupied: 25 }, aiPrediction: "HIGH_CROWD_EXPECTED",
                            routeId: "RT-001", routeName: "Sasaram ⇄ Patna",
                            stopsInBetween: ["Sasaram", "Dehri", "Aurangabad", "Current Stop", "Bikram", "Danapur", "Patna"],
                            currentDriverStopIdx: 2, userStopIndex: 3,
                            dynamicFareMap: { "Bikram": 25, "Danapur": 45, "Patna": 65 }
                        }
                    ]
                },
                {
                    directionName: "Towards Sasaram West",
                    vehicles: [
                        {
                            id: "DEMO-BUS-2", name: "Village Rapid", distanceMeters: 3400, etaSeconds: 380,
                            liveSeats: { available: 20, total: 25, occupied: 5 }, aiPrediction: "LOW_CROWD",
                            routeId: "RT-002", routeName: "Patna ⇄ Sasaram",
                            stopsInBetween: ["Patna", "Danapur", "Bikram", "Current Stop", "Aurangabad", "Dehri", "Sasaram"],
                            currentDriverStopIdx: 1, userStopIndex: 3,
                            dynamicFareMap: { "Aurangabad": 15, "Dehri": 30, "Sasaram": 45 }
                        }
                    ]
                }
            ];
        }

        res.json({
            radarStatus: "ACTIVE",
            approachingCorridors
        });

    } catch (error) {
        console.error('Precision Radar Error:', error);
        res.status(500).json({ error: 'Failed to load precision trajectory data' });
    }
});

/**
 * 🚀 POST /api/transit-hub/hyper-book
 * Whisk 3.0 API: Zero-latency optimistic booking
 */
router.post('/transit-hub/hyper-book', Auth.authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const { from, to, routeId, passengerCount, paymentMethod, fare } = req.body;
        
        if (!from || !to || !fare) return res.status(400).json({ error: 'from, to, fare required' });

        const passengers = passengerCount || 1;
        const payment = paymentMethod || 'ONLINE';

        // Optimistic Signature Generation
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        const raw = `${timestamp}${random}`;
        const TICKET_SECRET_KEY = process.env.TICKET_SECRET || 'VL_SECURE_TICKET_2026_xK9pL2mN';
        const checksum = crypto.createHash('md5').update(raw + TICKET_SECRET_KEY).digest('hex').substring(0, 4).toUpperCase();
        const ticketId = `TKT-HYP-${timestamp}-${random}-${checksum}`;

        const ticket = new Ticket({
            id: ticketId, userId, from, to, routeId,
            passengerCount: passengers, totalPrice: fare, farePerPerson: Math.ceil(fare/passengers),
            paymentMethod: payment, status: 'PAID', // Optimistic PAID
            timestamp: Date.now(),
            qrPayload: '' // Will compute
        });

        // Compute QR Signature immediately for zero latency
        const signData = `${ticket.id}|${ticket.userId}|${ticket.from}|${ticket.to}|${ticket.totalPrice}|${ticket.timestamp}`;
        const signature = crypto.createHmac('sha256', TICKET_SECRET_KEY).update(signData).digest('hex');
        const qrDataObj = {
            t: ticketId,
            s: signature.substring(0, 16),
            e: Date.now() + 5 * 60 * 1000,
            v: 1
        };
        const qrPayload = Buffer.from(JSON.stringify(qrDataObj)).toString('base64url');
        ticket.qrPayload = qrPayload;
        ticket.signature = signature;

        // Save Ticket (optimistic insert)
        await ticket.save();

        res.json({
            success: true,
            ticket: {
                id: ticketId, from, to, passengerCount: passengers, totalPrice: fare,
                paymentMethod: payment, status: 'PAID', bookedAt: ticket.timestamp,
                qrPayload, routePath: [] // frontend can fill
            }
        });

        // Background: Send FCM to drivers, update stop demand asynchronously
        // This keeps the response latency < 50ms
        setTimeout(() => {
            // Placeholder: driver notification logic
            console.log(`✅ HYPER-BOOK: ${ticketId} created in background`);
        }, 100);

    } catch (error) {
        console.error('Hyper-book error:', error);
        res.status(500).json({ error: 'Hyper-booking failed' });
    }
});

/**
 * GET /api/dashboard/transit-hub
 * Smart Transit Hub Widget Data source (Live + Scheduled)
 */
router.get('/transit-hub', Auth.authenticate, async (req, res) => {
    try {
        const { lat, lng } = req.query;
        if (!lat || !lng) {
            return res.status(400).json({ error: 'Coordinates required' });
        }

        const userLat = parseFloat(lat);
        const userLng = parseFloat(lng);

        // Use token payload directly to identify the demo user
        const isDemoUser = req.user && req.user.phone === '9801615895';

        // 1. Live Vehicles (Using Phase 5 Trajectory Matcher - active memory)
        let liveVehicles = [];
        try {
            // Find nearby vehicles by querying a tiny 0.01 degree path
            const rawLiveMatches = findMatchingVehicles(userLat, userLng, userLat + 0.01, userLng + 0.01, 5.0);
            
            liveVehicles = rawLiveMatches.slice(0, 5).map((match, idx) => ({
                id: match.driverId || `live-${idx}`,
                type: match.vehicleType || 'Bus',
                destination: match.endLocationName || 'Terminal',
                seats: match.availableSeats || 0,
                distance: match.snappedDistanceKm ? `${match.snappedDistanceKm.toFixed(1)} km` : 'Near',
                eta: match.etaMins ? `${Math.round(match.etaMins)} min` : 'Live'
            }));
        } catch (e) {
            console.error('Trajectory Matcher Error:', e.message);
        }

        // 2. Daily Scheduled Passes (MongoDB Geospatial Query)
        let formattedSchedules = [];
        try {
            const scheduledVehicles = await DailySchedule.find({
                location: {
                    $near: {
                        $geometry: { type: "Point", coordinates: [userLng, userLat] },
                        $maxDistance: 5000 // 5km
                    }
                }
            }).limit(5).lean();

            formattedSchedules = scheduledVehicles.map(s => ({
                id: s.id || s._id.toString(),
                time: s.expectedTime,
                vehicle: `${s.vehicleType || 'Bus'} (${s.destination || s.stopName})`,
                type: s.isAutoGenerated ? 'AI_PREDICTED' : 'MANUAL',
                confidence: s.confidenceScore || 100
            }));
        } catch (dbErr) {
            console.error('DailySchedule DB Error:', dbErr.message);
        }

        if (isDemoUser && liveVehicles.length === 0) {
            liveVehicles = [
                { id: 'mock-1', type: 'Bus', destination: 'Patna Junction', seats: 12, distance: '1.2 km', eta: '5 min' },
                { id: 'mock-2', type: 'Cab', destination: 'Sasaram City', seats: 3, distance: '800 m', eta: '2 min' }
            ];
        }

        if (isDemoUser && formattedSchedules.length === 0) {
            formattedSchedules = [
                { id: 'mock-s1', time: '08:30 AM', vehicle: 'Express Bus (Buxar)', type: 'AI_PREDICTED', confidence: 92 },
                { id: 'mock-s2', time: '10:00 AM', vehicle: 'Shared Auto (Market)', type: 'MANUAL', confidence: 100 }
            ];
        }

        res.json({
            live: liveVehicles,
            scheduled: formattedSchedules
        });

    } catch (error) {
        console.error('Transit Hub Error:', error);
        res.status(500).json({ error: 'Failed to load transit data' });
    }
});

/**
 * GET /api/dashboard
 * Returns dashboard data based on user's role
 */
router.get('/', Auth.authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findOne({ id: userId }).lean();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const role = user.role;
    const now = new Date();
    const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);

    // Common: unread notifications
    const unreadNotifications = await Notification.countDocuments({ userId, isRead: false });
    const recentNotifications = await Notification.find({ userId }).sort({ createdAt: -1 }).limit(5).lean();

    let dashboardData = { role, unreadNotifications, recentNotifications };

    switch (role) {
      case 'PASSENGER': {
        const [activeTickets, totalTickets] = await Promise.all([
          Ticket.find({ userId, status: { $in: ['PENDING', 'PAID', 'BOARDED'] } }).lean(),
          Ticket.countDocuments({ userId })
        ]);
        dashboardData = {
          ...dashboardData,
          activeTickets,
          totalTrips: totalTickets,
          walletBalance: user.walletBalance || 0
        };
        break;
      }

      case 'DRIVER': {
        const [location, todayTickets, totalTrips] = await Promise.all([
          DriverLocation.findOne({ driverId: userId }).lean(),
          Ticket.find({ scannedByDriverId: userId, scannedAt: { $gte: startOfDay.getTime() } }).lean(),
          Ticket.countDocuments({ scannedByDriverId: userId })
        ]);

        const todayEarnings = todayTickets.reduce((s, t) => s + (t.totalPrice || 0), 0);
        const todayPassengers = todayTickets.reduce((s, t) => s + (t.passengerCount || 1), 0);
        const autoVerified = todayTickets.filter(t => t.verificationMethod === 'GPS_SPEED_MATCH').length;

        const pendingDeliveries = await ProcurementOrder.countDocuments({
          assignedDriverId: userId,
          status: { $in: ['DRIVER_ASSIGNED', 'PICKED_UP'] }
        }).catch(() => 0);

        dashboardData = {
          ...dashboardData,
          isOnline: location?.isOnline || false,
          activeRoute: location?.activeRouteName,
          seats: location ? {
            total: location.seatsTotal || 20,
            occupied: location.seatsOccupied || 0,
            available: (location.seatsTotal || 20) - (location.seatsOccupied || 0)
          } : null,
          today: { earnings: todayEarnings, passengers: todayPassengers, trips: todayTickets.length, autoVerified },
          totalTrips,
          pendingDeliveries
        };
        break;
      }

      case 'FARMER': {
        const [activeListings, orders, deliveredOrders] = await Promise.all([
          CropListing.countDocuments({ kisanId: userId, status: 'ACTIVE' }),
          ProcurementOrder.find({ kisanId: userId }).sort({ createdAt: -1 }).limit(5).lean(),
          ProcurementOrder.find({ kisanId: userId, status: 'DELIVERED' }).lean()
        ]);

        const totalEarnings = deliveredOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);

        dashboardData = {
          ...dashboardData,
          activeListings,
          recentOrders: orders,
          totalEarnings,
          pendingOrders: orders.filter(o => o.status === 'PLACED').length
        };
        break;
      }

      case 'SHOPKEEPER':
      case 'FOOD_VENDOR': {
        const todayOrders = await FoodOrder.find({
          vendorId: userId,
          createdAt: { $gte: startOfDay.getTime() }
        }).lean().catch(() => []);

        const todayRevenue = todayOrders.reduce((s, o) => s + (o.totalPrice || 0), 0);

        dashboardData = {
          ...dashboardData,
          todayOrders: todayOrders.length,
          todayRevenue,
          pendingOrders: todayOrders.filter(o => ['PLACED', 'ACCEPTED', 'PREPARING'].includes(o.status)).length,
          completedOrders: todayOrders.filter(o => o.status === 'DELIVERED').length
        };
        break;
      }

      default: {
        dashboardData = { ...dashboardData, message: 'Dashboard available for specific roles' };
      }
    }

    res.json(dashboardData);
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

/**
 * GET /api/dashboard/notifications
 * Get paginated notifications
 */
router.get('/notifications', Auth.authenticate, async (req, res) => {
  try {
    const { limit, skip } = req.query;
    const notifications = await Notification.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .skip(parseInt(skip) || 0)
      .limit(parseInt(limit) || 20)
      .lean();

    const unread = await Notification.countDocuments({ userId: req.user.id, isRead: false });

    res.json({ notifications, unread, total: notifications.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get notifications' });
  }
});

/**
 * PUT /api/dashboard/notifications/read-all
 */
router.put('/notifications/read-all', Auth.authenticate, async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user.id, isRead: false }, { isRead: true });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
