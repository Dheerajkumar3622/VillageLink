/**
 * Dashboard Routes — Unified role-based dashboards
 * 
 * Single API call per role returns all relevant data
 */

import express from 'express';
import { User, Ticket, DriverLocation, CropListing, ProcurementOrder, FoodOrder, Parcel, Notification } from '../models.js';
import * as Auth from '../auth.js';

const router = express.Router();

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
