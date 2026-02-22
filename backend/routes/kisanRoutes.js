/**
 * Kisan Routes — Farmer Crop Marketplace
 * 
 * Endpoints for Kisan (farmer) operations:
 * - List crops for sale
 * - View active listings
 * - Manage procurement orders from vendors
 * - Dashboard with earnings
 */

import express from 'express';
import { CropListing, ProcurementOrder, User } from '../models.js';
import * as Auth from '../auth.js';

const router = express.Router();

/**
 * POST /api/kisan/crops
 * List a crop for sale
 */
router.post('/crops', Auth.authenticate, async (req, res) => {
  try {
    const kisanId = req.user.id;
    const { cropName, cropNameHi, category, quantity, unit, pricePerUnit, description, harvestDate, location } = req.body;

    if (!cropName || !quantity || !pricePerUnit) {
      return res.status(400).json({ error: 'cropName, quantity, pricePerUnit required' });
    }

    const kisan = await User.findOne({ id: kisanId }).lean();
    const id = `CROP-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const listing = new CropListing({
      id,
      kisanId,
      kisanName: kisan?.name,
      kisanPhone: kisan?.phone,
      cropName,
      cropNameHi: cropNameHi || cropName,
      category: category || 'VEGETABLE',
      quantity,
      unit: unit || 'KG',
      pricePerUnit,
      description,
      harvestDate,
      location: location || { name: kisan?.address, pincode: kisan?.pincode },
      status: 'ACTIVE'
    });
    await listing.save();

    console.log(`🌾 Crop listed: ${cropName} (${quantity} ${unit}) by ${kisan?.name} @ ₹${pricePerUnit}/${unit}`);

    res.json({ success: true, listing });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/kisan/crops
 * Get my crop listings
 */
router.get('/crops', Auth.authenticate, async (req, res) => {
  try {
    const kisanId = req.user.id;
    const { status } = req.query;
    const query = { kisanId };
    if (status) query.status = status;

    const crops = await CropListing.find(query).sort({ createdAt: -1 }).lean();
    res.json({ crops, total: crops.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/kisan/orders
 * Procurement orders from vendors
 */
router.get('/orders', Auth.authenticate, async (req, res) => {
  try {
    const kisanId = req.user.id;
    const { status } = req.query;
    const query = { kisanId };
    if (status) query.status = status;

    const orders = await ProcurementOrder.find(query).sort({ createdAt: -1 }).lean();
    res.json({ orders, total: orders.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/kisan/orders/:id/accept
 * Accept a procurement order
 */
router.put('/orders/:id/accept', Auth.authenticate, async (req, res) => {
  try {
    const order = await ProcurementOrder.findOneAndUpdate(
      { id: req.params.id, kisanId: req.user.id, status: 'PLACED' },
      { status: 'ACCEPTED', acceptedAt: Date.now(), updatedAt: Date.now() },
      { new: true }
    );

    if (!order) return res.status(404).json({ error: 'Order not found or already processed' });

    // Update crop listing status
    if (order.cropListingId) {
      await CropListing.findOneAndUpdate(
        { id: order.cropListingId },
        { status: 'RESERVED', reservedBy: order.vendorId, reservedAt: Date.now() }
      );
    }

    // Notify vendor via Firebase
    try {
      const { sendPushNotification } = await import('../services/firebaseNotificationService.js');
      const kisan = await User.findOne({ id: req.user.id }).lean();
      await sendPushNotification(order.vendorId,
        '✅ Order Accepted!',
        `${kisan?.name} ne aapka order accept kar liya. Pickup ready soon.`,
        { type: 'KISAN', orderId: order.id }
      );
    } catch (e) { console.error('Notify error:', e.message); }

    console.log(`✅ Kisan accepted order ${order.id} from vendor ${order.vendorName}`);
    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/kisan/orders/:id/reject
 */
router.put('/orders/:id/reject', Auth.authenticate, async (req, res) => {
  try {
    const order = await ProcurementOrder.findOneAndUpdate(
      { id: req.params.id, kisanId: req.user.id, status: 'PLACED' },
      { status: 'REJECTED', updatedAt: Date.now() },
      { new: true }
    );

    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/kisan/dashboard
 * Kisan earnings and stats
 */
router.get('/dashboard', Auth.authenticate, async (req, res) => {
  try {
    const kisanId = req.user.id;

    const [activeListings, totalOrders, deliveredOrders, allOrders] = await Promise.all([
      CropListing.countDocuments({ kisanId, status: 'ACTIVE' }),
      ProcurementOrder.countDocuments({ kisanId }),
      ProcurementOrder.countDocuments({ kisanId, status: 'DELIVERED' }),
      ProcurementOrder.find({ kisanId, status: 'DELIVERED' }).lean()
    ]);

    const totalEarnings = allOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    res.json({
      activeListings,
      totalOrders,
      deliveredOrders,
      pendingOrders: totalOrders - deliveredOrders,
      totalEarnings,
      recentOrders: allOrders.slice(0, 5)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/kisan/marketplace
 * Public: Browse all active crop listings (for vendors)
 */
router.get('/marketplace', async (req, res) => {
  try {
    const { category, search } = req.query;
    const query = { status: 'ACTIVE' };
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { cropName: { $regex: search, $options: 'i' } },
        { cropNameHi: { $regex: search, $options: 'i' } }
      ];
    }

    const listings = await CropListing.find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json({ listings, total: listings.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
