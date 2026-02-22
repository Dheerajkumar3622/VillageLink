/**
 * Driver Routes — 1000x Smart Driver Panel
 * 
 * Endpoints for driver operations:
 * - Go online with vehicle/route selection
 * - AI-suggested routes based on real demand
 * - Ahead-vehicles with live seat counts
 * - Per-stop demand (passengers + parcels waiting)
 * - Earnings, delivery management, profile
 */

import express from 'express';
import { DriverLocation, Route, Ticket, User, StopDemand, Parcel, ProcurementOrder, ActiveTrip, Transaction } from '../models.js';
import * as Auth from '../auth.js';
import { getHotRoutesNearDriver, calculateRouteDemand } from '../services/routeDemandService.js';
import { resetSeats, getSeatInfo, getRouteVehicles } from '../services/seatTrackingService.js';

const router = express.Router();

// Haversine distance calculation (km)
const haversine = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/**
 * POST /api/driver/go-online
 * Driver goes online with start location and vehicle info
 */
router.post('/go-online', Auth.authenticate, async (req, res) => {
  try {
    const driverId = req.user.id;
    const { lat, lng, locationName, vehicleType, vehicleCapacity } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'Location (lat, lng) required' });
    }

    const user = await User.findOne({ id: driverId }).lean();
    const capacity = vehicleCapacity || user?.vehicleCapacity || 20;
    const vType = vehicleType || user?.vehicleType || 'BUS';

    // Update/create driver location
    await DriverLocation.findOneAndUpdate(
      { driverId },
      {
        location: { type: 'Point', coordinates: [lng, lat] },
        isOnline: true,
        vehicleType: vType,
        seatsTotal: capacity,
        seatsOccupied: 0,
        parcelsOnboard: 0,
        currentTripId: null,
        activeRouteId: null,
        startLocation: { name: locationName || 'Current Location', lat, lng },
        driverName: user?.name,
        driverPhone: user?.phone,
        lastUpdated: new Date()
      },
      { upsert: true, new: true }
    );

    // Find admin-defined routes that pass through nearby stops
    const allRoutes = await Route.find({}).lean();
    const nearbyRoutes = [];

    for (const route of allRoutes) {
      // Check if any stop is near the driver's location
      if (route.stopCoordinates && Array.isArray(route.stopCoordinates)) {
        for (let i = 0; i < route.stopCoordinates.length; i++) {
          const stop = route.stopCoordinates[i];
          if (stop?.lat && stop?.lng) {
            const dist = haversine(lat, lng, stop.lat, stop.lng);
            if (dist <= 5) { // Within 5km
              nearbyRoutes.push({
                routeId: route.id,
                routeName: route.name || `${route.from} → ${route.to}`,
                from: route.from,
                to: route.to,
                stops: route.stops,
                totalDistance: route.totalDistance,
                nearestStop: route.stops?.[i] || route.from,
                distanceToStop: Math.round(dist * 10) / 10
              });
              break;
            }
          }
        }
      } else if (route.stops && route.stops.length > 0) {
        // Fallback if no coordinates: just return all routes
        nearbyRoutes.push({
          routeId: route.id,
          routeName: route.name || `${route.from} → ${route.to}`,
          from: route.from,
          to: route.to,
          stops: route.stops,
          totalDistance: route.totalDistance,
          nearestStop: route.from,
          distanceToStop: 0
        });
      }
    }

    // Get hot routes (demand-based)
    const hotRoutes = await getHotRoutesNearDriver(lat, lng);

    // Enrich nearby routes with demand data
    const enrichedRoutes = await Promise.all(nearbyRoutes.map(async (route) => {
      // Count pending tickets for this route direction
      const pendingTickets = await Ticket.countDocuments({
        from: { $in: route.stops || [] },
        to: { $in: route.stops || [] },
        status: { $in: ['PENDING', 'PAID'] },
        timestamp: { $gte: Date.now() - 3600000 }
      });

      // Count pending parcels
      const pendingParcels = await Parcel.countDocuments({
        status: { $in: ['PENDING', 'ACCEPTED'] },
        from: { $in: route.stops || [] }
      }).catch(() => 0);

      // Count pending crop pickups
      const pendingCropOrders = await ProcurementOrder.countDocuments({
        status: { $in: ['ACCEPTED', 'DRIVER_ASSIGNED'] },
        'pickupLocation.name': { $in: route.stops || [] }
      }).catch(() => 0);

      // Count competition (other drivers on same route)
      const competingDrivers = await DriverLocation.countDocuments({
        activeRouteId: route.routeId,
        isOnline: true,
        driverId: { $ne: driverId }
      });

      // Estimate earnings from pending fares
      const pendingFares = await Ticket.aggregate([
        {
          $match: {
            from: { $in: route.stops || [] },
            to: { $in: route.stops || [] },
            status: { $in: ['PENDING', 'PAID'] },
            timestamp: { $gte: Date.now() - 3600000 }
          }
        },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } }
      ]);

      const totalDemand = pendingTickets + pendingParcels + pendingCropOrders;
      const competition = competingDrivers || 0;

      // AI Score: demand-to-competition ratio (0-100)
      const demandScore = totalDemand > 0
        ? Math.min(100, Math.round((totalDemand / Math.max(1, competition + 1)) * 25))
        : 0;

      return {
        ...route,
        pendingPassengers: pendingTickets,
        pendingParcels,
        pendingCropPickups: pendingCropOrders,
        competingDrivers: competition,
        estimatedEarning: pendingFares[0]?.total || 0,
        demandScore,
        aiSuggestion: demandScore >= 70 ? 'HOT 🔥' : demandScore >= 40 ? 'GOOD 👍' : 'NORMAL',
        reason: buildReasonString(pendingTickets, pendingParcels, pendingCropOrders, competition)
      };
    }));

    // Sort by demand score (highest first)
    enrichedRoutes.sort((a, b) => b.demandScore - a.demandScore);

    console.log(`🟢 Driver ${user?.name} online at ${locationName || `${lat},${lng}`} | ${enrichedRoutes.length} routes available`);

    res.json({
      success: true,
      message: `Online! ${enrichedRoutes.length} routes available`,
      driverId,
      vehicleType: vType,
      vehicleCapacity: capacity,
      suggestedRoutes: enrichedRoutes.slice(0, 10),
      hotRoutes: hotRoutes || []
    });

  } catch (error) {
    console.error('Go online error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper: Build human-readable reason
const buildReasonString = (passengers, parcels, crops, competition) => {
  const parts = [];
  if (passengers > 0) parts.push(`${passengers} passengers waiting`);
  if (parcels > 0) parts.push(`${parcels} parcels`);
  if (crops > 0) parts.push(`${crops} crop pickups`);
  if (competition === 0) parts.push('no competition!');
  else parts.push(`${competition} vehicles already`);
  return parts.join(' + ');
};

/**
 * POST /api/driver/select-route
 * Driver selects a route to operate on
 */
router.post('/select-route', Auth.authenticate, async (req, res) => {
  try {
    const driverId = req.user.id;
    const { routeId } = req.body;

    if (!routeId) return res.status(400).json({ error: 'routeId required' });

    const route = await Route.findOne({ id: routeId }).lean();
    if (!route) return res.status(404).json({ error: 'Route not found' });

    // Reset seats and set active route
    await DriverLocation.findOneAndUpdate(
      { driverId },
      {
        activeRouteId: routeId,
        activeRouteName: route.name || `${route.from} → ${route.to}`,
        seatsOccupied: 0,
        parcelsOnboard: 0,
        nextStopIndex: 0,
        nextStopName: route.stops?.[0] || route.from
      },
      { new: true }
    );

    // Get demand per stop for this route
    const stopDemands = await Promise.all(
      (route.stops || []).map(async (stopName) => {
        const passengers = await Ticket.countDocuments({
          from: stopName,
          status: { $in: ['PENDING', 'PAID'] },
          timestamp: { $gte: Date.now() - 3600000 }
        });
        
        const parcels = await Parcel.countDocuments({
          from: stopName,
          status: { $in: ['PENDING', 'ACCEPTED'] }
        }).catch(() => 0);

        return {
          stopName,
          waitingPassengers: passengers,
          pendingParcels: parcels
        };
      })
    );

    console.log(`📍 Driver ${driverId} selected route: ${route.name || route.from + ' → ' + route.to}`);

    res.json({
      success: true,
      route: {
        id: route.id,
        name: route.name || `${route.from} → ${route.to}`,
        from: route.from,
        to: route.to,
        stops: route.stops,
        totalDistance: route.totalDistance
      },
      stopDemands
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/driver/ahead-vehicles
 * See vehicles ahead on the same route with REAL seat counts
 */
router.get('/ahead-vehicles', Auth.authenticate, async (req, res) => {
  try {
    const driverId = req.user.id;
    const myLocation = await DriverLocation.findOne({ driverId }).lean();

    if (!myLocation?.activeRouteId) {
      return res.json({ vehicles: [], message: 'Select a route first' });
    }

    // Get all other drivers on same route
    const otherDrivers = await DriverLocation.find({
      activeRouteId: myLocation.activeRouteId,
      isOnline: true,
      driverId: { $ne: driverId }
    }).lean();

    const myLat = myLocation.location?.coordinates?.[1];
    const myLng = myLocation.location?.coordinates?.[0];

    const vehicles = otherDrivers.map(d => {
      const dLat = d.location?.coordinates?.[1];
      const dLng = d.location?.coordinates?.[0];
      const distance = (myLat && myLng && dLat && dLng)
        ? Math.round(haversine(myLat, myLng, dLat, dLng) * 10) / 10
        : null;

      return {
        driverId: d.driverId,
        driverName: d.driverName || 'Driver',
        vehicleType: d.vehicleType || 'BUS',
        seatsTotal: d.seatsTotal || 20,
        seatsOccupied: d.seatsOccupied || 0,
        seatsAvailable: (d.seatsTotal || 20) - (d.seatsOccupied || 0),
        parcelsOnboard: d.parcelsOnboard || 0,
        currentStop: d.nextStopName || 'En route',
        nextStopIndex: d.nextStopIndex || 0,
        location: { lat: dLat, lng: dLng },
        speed: d.speed || 0,
        distanceAhead: distance ? `${distance} km` : 'Unknown',
        distanceKm: distance
      };
    });

    // Sort by distance (closest first)
    vehicles.sort((a, b) => (a.distanceKm || 999) - (b.distanceKm || 999));

    res.json({
      myRoute: myLocation.activeRouteName,
      mySeats: {
        total: myLocation.seatsTotal || 20,
        occupied: myLocation.seatsOccupied || 0,
        available: (myLocation.seatsTotal || 20) - (myLocation.seatsOccupied || 0)
      },
      vehicles
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/driver/route-demand
 * Per-stop demand on selected route
 */
router.get('/route-demand', Auth.authenticate, async (req, res) => {
  try {
    const driverId = req.user.id;
    const myLocation = await DriverLocation.findOne({ driverId }).lean();

    if (!myLocation?.activeRouteId) {
      return res.json({ stops: [], message: 'Select a route first' });
    }

    const route = await Route.findOne({ id: myLocation.activeRouteId }).lean();
    if (!route) return res.json({ stops: [] });

    const stops = await Promise.all(
      (route.stops || []).map(async (stopName, index) => {
        const passengers = await Ticket.countDocuments({
          from: stopName,
          status: { $in: ['PENDING', 'PAID'] },
          timestamp: { $gte: Date.now() - 3600000 }
        });

        const parcels = await Parcel.countDocuments({
          from: stopName,
          status: { $in: ['PENDING', 'ACCEPTED'] }
        }).catch(() => 0);

        return {
          index,
          stopName,
          waitingPassengers: passengers,
          pendingParcels: parcels,
          totalDemand: passengers + parcels,
          isPassed: index < (myLocation.nextStopIndex || 0)
        };
      })
    );

    res.json({
      route: myLocation.activeRouteName,
      stops,
      totalPassengersWaiting: stops.reduce((s, st) => s + st.waitingPassengers, 0),
      totalParcels: stops.reduce((s, st) => s + st.pendingParcels, 0)
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/driver/earnings
 * Today/weekly/monthly earnings
 */
router.get('/earnings', Auth.authenticate, async (req, res) => {
  try {
    const driverId = req.user.id;
    const now = new Date();
    
    const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay()); startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [todayTickets, weekTickets, monthTickets] = await Promise.all([
      Ticket.find({ scannedByDriverId: driverId, scannedAt: { $gte: startOfDay.getTime() } }).lean(),
      Ticket.find({ scannedByDriverId: driverId, scannedAt: { $gte: startOfWeek.getTime() } }).lean(),
      Ticket.find({ scannedByDriverId: driverId, scannedAt: { $gte: startOfMonth.getTime() } }).lean()
    ]);

    const calcEarnings = (tickets) => ({
      total: tickets.reduce((s, t) => s + (t.totalPrice || 0), 0),
      cash: tickets.filter(t => t.paymentMethod === 'CASH').reduce((s, t) => s + (t.totalPrice || 0), 0),
      online: tickets.filter(t => t.paymentMethod !== 'CASH').reduce((s, t) => s + (t.totalPrice || 0), 0),
      passengers: tickets.reduce((s, t) => s + (t.passengerCount || 1), 0),
      trips: tickets.length,
      autoVerified: tickets.filter(t => t.verificationMethod === 'GPS_SPEED_MATCH').length
    });

    res.json({
      today: calcEarnings(todayTickets),
      thisWeek: calcEarnings(weekTickets),
      thisMonth: calcEarnings(monthTickets)
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/driver/deliveries
 * Pending delivery assignments (parcels + crop orders)
 */
router.get('/deliveries', Auth.authenticate, async (req, res) => {
  try {
    const driverId = req.user.id;

    const [parcels, cropOrders] = await Promise.all([
      Parcel.find({
        driverId,
        status: { $in: ['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'] }
      }).sort({ timestamp: -1 }).lean().catch(() => []),
      ProcurementOrder.find({
        assignedDriverId: driverId,
        status: { $in: ['DRIVER_ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'] }
      }).sort({ createdAt: -1 }).lean().catch(() => [])
    ]);

    res.json({
      parcels: parcels.map(p => ({
        id: p.id,
        type: 'PARCEL',
        from: p.from,
        to: p.to,
        status: p.status,
        senderName: p.senderName,
        weight: p.weight,
        timestamp: p.timestamp
      })),
      cropOrders: cropOrders.map(o => ({
        id: o.id,
        type: 'CROP_ORDER',
        vendor: o.vendorName,
        kisan: o.kisanName,
        items: o.items,
        status: o.status,
        pickup: o.pickupLocation,
        delivery: o.deliveryLocation,
        totalAmount: o.totalAmount,
        pickupOTP: o.pickupOTP,
        createdAt: o.createdAt
      })),
      totalPending: parcels.length + cropOrders.length
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/driver/deliveries/:id/accept
 */
router.put('/deliveries/:id/accept', Auth.authenticate, async (req, res) => {
  try {
    const driverId = req.user.id;
    const deliveryId = req.params.id;

    // Try parcel first
    let delivery = await Parcel.findOneAndUpdate(
      { id: deliveryId },
      { driverId, status: 'ACCEPTED' },
      { new: true }
    );

    if (!delivery) {
      delivery = await ProcurementOrder.findOneAndUpdate(
        { id: deliveryId },
        { assignedDriverId: driverId, status: 'DRIVER_ASSIGNED', updatedAt: Date.now() },
        { new: true }
      );
    }

    if (!delivery) return res.status(404).json({ error: 'Delivery not found' });

    res.json({ success: true, delivery });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/driver/deliveries/:id/pickup
 */
router.put('/deliveries/:id/pickup', Auth.authenticate, async (req, res) => {
  try {
    const deliveryId = req.params.id;

    let delivery = await Parcel.findOneAndUpdate(
      { id: deliveryId, status: 'ACCEPTED' },
      { status: 'PICKED_UP' },
      { new: true }
    );

    if (!delivery) {
      delivery = await ProcurementOrder.findOneAndUpdate(
        { id: deliveryId, status: 'DRIVER_ASSIGNED' },
        { status: 'PICKED_UP', pickedUpAt: Date.now(), updatedAt: Date.now() },
        { new: true }
      );
    }

    if (!delivery) return res.status(404).json({ error: 'Delivery not found or wrong status' });

    // Increment parcels onboard
    const { onParcelLoaded } = await import('../services/seatTrackingService.js');
    await onParcelLoaded(req.user.id);

    res.json({ success: true, delivery });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/driver/deliveries/:id/deliver
 */
router.put('/deliveries/:id/deliver', Auth.authenticate, async (req, res) => {
  try {
    const deliveryId = req.params.id;

    let delivery = await Parcel.findOneAndUpdate(
      { id: deliveryId, status: 'PICKED_UP' },
      { status: 'DELIVERED', deliveredAt: Date.now() },
      { new: true }
    );

    if (!delivery) {
      delivery = await ProcurementOrder.findOneAndUpdate(
        { id: deliveryId, status: { $in: ['PICKED_UP', 'IN_TRANSIT'] } },
        { status: 'DELIVERED', deliveredAt: Date.now(), updatedAt: Date.now() },
        { new: true }
      );
    }

    if (!delivery) return res.status(404).json({ error: 'Delivery not found or wrong status' });

    // Decrement parcels onboard
    const { onParcelDelivered } = await import('../services/seatTrackingService.js');
    await onParcelDelivered(req.user.id);

    res.json({ success: true, delivery });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/driver/profile
 * Driver profile with vehicle info and rating  
 */
router.get('/profile', Auth.authenticate, async (req, res) => {
  try {
    const driverId = req.user.id;
    const [user, location, todayTickets] = await Promise.all([
      User.findOne({ id: driverId }).lean(),
      DriverLocation.findOne({ driverId }).lean(),
      Ticket.countDocuments({ scannedByDriverId: driverId, scannedAt: { $gte: new Date().setHours(0, 0, 0, 0) } })
    ]);

    if (!user) return res.status(404).json({ error: 'Driver not found' });

    res.json({
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      role: user.role,
      vehicleType: location?.vehicleType || user.vehicleType || 'BUS',
      vehicleCapacity: location?.seatsTotal || user.vehicleCapacity || 20,
      vehicleNumber: user.vehicleNumber,
      isOnline: location?.isOnline || false,
      activeRoute: location?.activeRouteName || null,
      heroLevel: user.heroLevel,
      heroPoints: user.heroPoints,
      isVerified: user.isVerified,
      todayTrips: todayTickets,
      currentSeats: location ? {
        total: location.seatsTotal || 20,
        occupied: location.seatsOccupied || 0,
        available: (location.seatsTotal || 20) - (location.seatsOccupied || 0)
      } : null
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/driver/go-offline
 */
router.post('/go-offline', Auth.authenticate, async (req, res) => {
  try {
    const driverId = req.user.id;
    
    await DriverLocation.findOneAndUpdate(
      { driverId },
      {
        isOnline: false,
        currentTripId: null,
        activeRouteId: null,
        activeRouteName: null,
        seatsOccupied: 0,
        parcelsOnboard: 0
      }
    );

    console.log(`⚫ Driver ${driverId} went offline`);
    res.json({ success: true, message: 'You are now offline' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/driver/my-seats
 * Quick check of current seat status
 */
router.get('/my-seats', Auth.authenticate, async (req, res) => {
  try {
    const seatInfo = await getSeatInfo(req.user.id);
    if (!seatInfo) return res.json({ error: 'Not online' });
    res.json(seatInfo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/driver/verify-cash
 * Manual cash ticket verification (driver enters ticket ID)
 */
router.post('/verify-cash', Auth.authenticate, async (req, res) => {
  try {
    const driverId = req.user.id;
    const { ticketId } = req.body;

    if (!ticketId) return res.status(400).json({ error: 'ticketId required' });

    const ticket = await Ticket.findOneAndUpdate(
      { id: ticketId, status: { $in: ['PENDING', 'PAID'] } },
      {
        status: 'BOARDED',
        scannedAt: Date.now(),
        scannedByDriverId: driverId,
        verificationMethod: 'MANUAL_CASH',
        scanCount: 1
      },
      { new: true }
    );

    if (!ticket) return res.status(404).json({ error: 'Ticket not found or already used' });

    // Update seats
    const { onPassengerBoard } = await import('../services/seatTrackingService.js');
    const updatedLoc = await onPassengerBoard(driverId, ticket.passengerCount || 1);

    const passenger = await User.findOne({ id: ticket.userId }).lean();

    res.json({
      success: true,
      ticket: {
        id: ticket.id,
        from: ticket.from,
        to: ticket.to,
        passengerCount: ticket.passengerCount,
        totalPrice: ticket.totalPrice,
        paymentMethod: ticket.paymentMethod,
        passengerName: passenger?.name || 'Passenger',
        verificationMethod: 'MANUAL_CASH'
      },
      seats: updatedLoc ? {
        occupied: updatedLoc.seatsOccupied,
        total: updatedLoc.seatsTotal,
        available: updatedLoc.seatsTotal - updatedLoc.seatsOccupied
      } : null
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/driver/history
 * Fetch detailed trip history for the driver
 */
router.get('/history', Auth.authenticate, async (req, res) => {
  try {
    const driverId = req.user.id;
    
    // Fetch tickets handled by this driver
    const tickets = await Ticket.find({
      $or: [
        { driverId: driverId },
        { scannedByDriverId: driverId }
      ],
      status: { $in: ['BOARDED', 'COMPLETED'] }
    }).sort({ timestamp: -1, scannedAt: -1 }).lean();

    // Fetch parcel deliveries handled by this driver
    const parcels = await Parcel.find({
      driverId: driverId,
      status: 'DELIVERED'
    }).sort({ deliveredAt: -1, timestamp: -1 }).lean();

    // Fetch transactions (Earnings) related to tickets and parcels
    const transactions = await Transaction.find({
      userId: driverId,
      type: { $in: ['EARN', 'SPEND'] } // Include both earning and platform fees
    }).sort({ timestamp: -1 }).lean();

    res.json({ success: true, tickets, parcels, transactions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
