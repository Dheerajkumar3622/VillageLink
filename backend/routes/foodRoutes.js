
import express from 'express';
import { User, Shop, FoodItem, FoodBooking, FoodSubscription } from '../models.js';
import * as Auth from '../auth.js';
import * as ML from '../services/mlService.js';
import crypto from 'crypto';

import { getRecommendations } from '../services/foodRecommendationService.js';

const router = express.Router();

// Get personalized recommendations
router.get('/recommendations', authenticateToken, async (req, res) => {
    try {
        const recommendations = await getRecommendations(req.user.id);
        res.json(recommendations);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- PUBLIC / PASSENGER ENDPOINTS ---

// Get nearby messes (optionally filtered by location)
router.get('/mess', async (req, res) => {
    try {
        const { pincode } = req.query;
        const query = { category: 'MESS' };

        if (pincode) {
            query.pincode = pincode;
        }

        const messes = await Shop.find(query);
        res.json(messes);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Get Menu for a specific Mess
router.get('/menu/:messId', async (req, res) => {
    try {
        const { messId } = req.params;
        const menu = await FoodItem.find({ messId, available: true });

        // Add ML Recommendation flag
        const recommendedIds = await ML.getSmartMenuSuggestions(messId);
        const enhancedMenu = menu.map(item => ({
            ...item.toObject(),
            isRecommended: recommendedIds.includes(item.id)
        }));

        res.json(enhancedMenu);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Book Food
router.post('/book', Auth.authenticate, async (req, res) => {
    try {
        const { messId, items, mealTime, scheduledDate, totalAmount } = req.body;

        // Generate Token
        const token = crypto.randomBytes(3).toString('hex').toUpperCase(); // 6 chars

        const booking = new FoodBooking({
            id: `BK-${Date.now()}`,
            userId: req.user.id,
            messId,
            items,
            mealTime,
            scheduledDate,
            totalAmount,
            token,
            status: 'PAID', // Assuming direct deduction or post-payment
            bookingTime: Date.now()
        });

        await booking.save();

        // Trigger ML Update Async
        ML.updateMessStats(messId, items);

        res.json({ success: true, booking });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Get My Bookings
router.get('/my-bookings', Auth.authenticate, async (req, res) => {
    try {
        const bookings = await FoodBooking.find({ userId: req.user.id }).sort({ bookingTime: -1 });
        res.json(bookings);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});


// --- MESS MANAGER ENDPOINTS ---

// Get Dashboard Data (ML Driven)
router.get('/manager/dashboard', Auth.authenticate, async (req, res) => {
    try {
        // Verify User is Manager of this Mess (Find Shop owned by User)
        // Simplification: We assume 1 User = 1 Mess for now
        const shop = await Shop.findOne({ ownerId: req.user.id, category: 'MESS' });
        if (!shop) return res.status(403).json({ error: "No Mess Found" });

        const today = new Date().toISOString().split('T')[0];

        // ML Prediction
        const prediction = await ML.predictDemand(shop.id);

        // Today's Bookings
        const todayBookings = await FoodBooking.find({
            messId: shop.id,
            scheduledDate: today
        });

        res.json({
            messId: shop.id,
            prediction,
            todayCount: todayBookings.length,
            revenue: todayBookings.reduce((sum, b) => sum + b.totalAmount, 0)
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Verify Token
router.post('/manager/verify', Auth.authenticate, async (req, res) => {
    try {
        const { token } = req.body;

        // Find booking
        const booking = await FoodBooking.findOne({ token });

        if (!booking) return res.status(404).json({ error: "Invalid Token" });
        if (booking.status === 'REDEEMED') return res.status(400).json({ error: "Token Already Used" });

        // Verify ownership
        const shop = await Shop.findOne({ ownerId: req.user.id, category: 'MESS' });
        if (!shop || shop.id !== booking.messId) return res.status(403).json({ error: "Booking belongs to another mess" });

        booking.status = 'REDEEMED';
        await booking.save();

        res.json({ success: true, message: "Meal Redeemed!", booking });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Manage Menu
router.post('/manager/menu', Auth.authenticate, async (req, res) => {
    try {
        const { name, price, type, description, messId } = req.body;
        // Verify ownership
        const shop = await Shop.findOne({ ownerId: req.user.id, category: 'MESS', id: messId });
        if (!shop) return res.status(403).json({ error: "Unauthorized" });

        const item = new FoodItem({
            id: `FD-${Date.now()}`,
            messId,
            name,
            price,
            type,
            description,
            available: true
        });
        await item.save();
        res.json({ success: true, item });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ================== FOODLINK: STALL DISCOVERY & ORDERING ==================

import { FoodVendor, VendorMenuItem, FoodOrder } from '../models.js';

// Get nearby stalls with filters
router.get('/stalls', async (req, res) => {
    try {
        const { pincode, category, pureVeg, lat, lng, maxDistance = 5000 } = req.query;

        let query = { status: 'VERIFIED' };

        if (pincode) query.pincode = pincode;
        if (category) query.stallCategory = category;
        if (pureVeg === 'true') query.isPureVeg = true;

        let stalls;

        // Geo query if coordinates provided
        if (lat && lng) {
            stalls = await FoodVendor.find({
                ...query,
                coordinates: {
                    $near: {
                        $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
                        $maxDistance: parseInt(maxDistance)
                    }
                }
            }).limit(50);
        } else {
            stalls = await FoodVendor.find(query).limit(50);
        }

        res.json(stalls);
    } catch (e) {
        console.error('Stalls fetch error:', e);
        res.status(500).json({ error: e.message });
    }
});

// Get stall details
router.get('/stalls/:stallId', async (req, res) => {
    try {
        const stall = await FoodVendor.findOne({ id: req.params.stallId });
        if (!stall) return res.status(404).json({ error: 'Stall not found' });
        res.json(stall);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Get stall menu
router.get('/stalls/:stallId/menu', async (req, res) => {
    try {
        const menu = await VendorMenuItem.find({
            vendorId: req.params.stallId,
            available: true
        }).sort({ isRecommended: -1, createdAt: -1 });
        res.json(menu);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Place order at stall
router.post('/stalls/order', Auth.authenticate, async (req, res) => {
    try {
        const { vendorId, items, orderType, scheduledFor, packagingCharges = 0 } = req.body;

        // Validate vendor
        const vendor = await FoodVendor.findOne({ id: vendorId, status: 'VERIFIED' });
        if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
        if (!vendor.isOpen && orderType === 'TAKEAWAY') {
            return res.status(400).json({ error: 'Stall is currently closed' });
        }

        // Calculate total
        const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0) + packagingCharges;

        // Generate token
        const token = crypto.randomBytes(3).toString('hex').toUpperCase();
        const qrPayload = `ORDER:${token}:${Date.now()}`;

        const order = new FoodOrder({
            id: `FO-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            userId: req.user.id,
            vendorId,
            vendorType: 'STALL',
            orderType: orderType || 'TAKEAWAY',
            items,
            totalAmount,
            packagingCharges,
            scheduledFor: scheduledFor || null,
            status: 'PLACED',
            token,
            qrPayload,
            createdAt: Date.now()
        });

        await order.save();

        res.json({
            success: true,
            order: {
                id: order.id,
                token: order.token,
                qrPayload: order.qrPayload,
                totalAmount: order.totalAmount,
                status: order.status
            }
        });
    } catch (e) {
        console.error('Order placement error:', e);
        res.status(500).json({ error: e.message });
    }
});

// Get order status
router.get('/order/:orderId', Auth.authenticate, async (req, res) => {
    try {
        const order = await FoodOrder.findOne({
            id: req.params.orderId,
            userId: req.user.id
        });
        if (!order) return res.status(404).json({ error: 'Order not found' });

        // Get vendor info
        const vendor = await FoodVendor.findOne({ id: order.vendorId });

        res.json({
            ...order.toObject(),
            vendorName: vendor?.stallName,
            vendorLocation: vendor?.location
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Get my orders
router.get('/my-orders', Auth.authenticate, async (req, res) => {
    try {
        const orders = await FoodOrder.find({ userId: req.user.id })
            .sort({ createdAt: -1 })
            .limit(50);
        res.json(orders);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Subscribe to meal pass (enhanced)
router.post('/subscribe', Auth.authenticate, async (req, res) => {
    try {
        const { messId, planName, type, startDate, durationDays, price } = req.body;

        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + (durationDays || 30));

        const subscription = new FoodSubscription({
            id: `SUB-${Date.now()}`,
            userId: req.user.id,
            messId,
            planName,
            type,
            startDate: new Date(startDate).getTime(),
            endDate: endDate.getTime(),
            price,
            status: 'ACTIVE'
        });

        await subscription.save();
        res.json({ success: true, subscription });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Get my subscriptions
router.get('/my-subscriptions', Auth.authenticate, async (req, res) => {
    try {
        const subscriptions = await FoodSubscription.find({ userId: req.user.id })
            .sort({ startDate: -1 });
        res.json(subscriptions);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ==================== TABLE BOOKING ====================

import { TableBooking, Restaurant, FoodReview, MessPass } from '../models.js';

// Book a table
router.post('/table-booking', Auth.authenticate, async (req, res) => {
    try {
        const { restaurantId, date, timeSlot, partySize, occasion, specialRequests, preOrderItems } = req.body;

        const confirmationCode = crypto.randomBytes(4).toString('hex').toUpperCase();

        const booking = new TableBooking({
            id: `TB-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            userId: req.user.id,
            restaurantId,
            date,
            timeSlot,
            partySize: partySize || 2,
            occasion,
            specialRequests,
            preOrderItems,
            status: 'PENDING',
            confirmationCode,
            createdAt: Date.now()
        });

        await booking.save();
        res.json({ success: true, booking });
    } catch (e) {
        console.error('Table booking error:', e);
        res.status(500).json({ error: e.message });
    }
});

// Get my table bookings
router.get('/my-table-bookings', Auth.authenticate, async (req, res) => {
    try {
        const bookings = await TableBooking.find({ userId: req.user.id })
            .sort({ createdAt: -1 });
        res.json(bookings);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Cancel table booking
router.put('/table-booking/:bookingId/cancel', Auth.authenticate, async (req, res) => {
    try {
        const booking = await TableBooking.findOneAndUpdate(
            { id: req.params.bookingId, userId: req.user.id },
            { status: 'CANCELLED' },
            { new: true }
        );
        if (!booking) return res.status(404).json({ error: 'Booking not found' });
        res.json({ success: true, booking });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Confirm booking (restaurant side)
router.put('/table-booking/:bookingId/confirm', Auth.authenticate, async (req, res) => {
    try {
        const booking = await TableBooking.findOneAndUpdate(
            { id: req.params.bookingId },
            { status: 'CONFIRMED' },
            { new: true }
        );
        res.json({ success: true, booking });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ==================== RESTAURANTS ====================

// Get restaurants with filters
router.get('/restaurants', async (req, res) => {
    try {
        const { pincode, category, budgetTier, cuisines, pureVeg, minRating, hasTableBooking } = req.query;

        let query = { isOpen: true };
        if (pincode) query.pincode = pincode;
        if (category) query.category = category;
        if (budgetTier) query.budgetTier = budgetTier;
        if (pureVeg === 'true') query.isPureVeg = true;
        if (minRating) query.starRating = { $gte: parseFloat(minRating) };
        if (hasTableBooking === 'true') query.hasTableBooking = true;

        const restaurants = await Restaurant.find(query).sort({ starRating: -1 }).limit(50);
        res.json(restaurants);
    } catch (e) {
        console.error('Restaurants fetch error:', e);
        res.status(500).json({ error: e.message });
    }
});

// Get restaurant details
router.get('/restaurants/:restaurantId', async (req, res) => {
    try {
        const restaurant = await Restaurant.findOne({ id: req.params.restaurantId });
        if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });
        res.json(restaurant);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ==================== REVIEWS ====================

// Submit a review
router.post('/reviews', Auth.authenticate, async (req, res) => {
    try {
        const { vendorId, vendorType, ratings, overallRating, comment, photos, orderedItems } = req.body;

        const user = await User.findOne({ id: req.user.id });

        const review = new FoodReview({
            id: `REV-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            userId: req.user.id,
            userName: user?.name || 'Anonymous',
            vendorId,
            vendorType,
            ratings,
            overallRating,
            comment,
            photos: photos || [],
            orderedItems: orderedItems || [],
            createdAt: Date.now(),
            helpfulCount: 0
        });

        await review.save();

        // Update vendor average rating
        const allReviews = await FoodReview.find({ vendorId });
        const avgRating = allReviews.reduce((sum, r) => sum + r.overallRating, 0) / allReviews.length;

        if (vendorType === 'STALL') {
            await FoodVendor.findOneAndUpdate({ id: vendorId }, { rating: Math.round(avgRating * 10) / 10 });
        } else {
            await Restaurant.findOneAndUpdate({ id: vendorId }, { starRating: Math.round(avgRating) });
        }

        res.json({ success: true, review });
    } catch (e) {
        console.error('Review error:', e);
        res.status(500).json({ error: e.message });
    }
});

// Get reviews for a vendor
router.get('/reviews/:vendorId', async (req, res) => {
    try {
        const reviews = await FoodReview.find({ vendorId: req.params.vendorId })
            .sort({ createdAt: -1 })
            .limit(50);
        res.json(reviews);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Mark review as helpful
router.put('/reviews/:reviewId/helpful', Auth.authenticate, async (req, res) => {
    try {
        const review = await FoodReview.findOneAndUpdate(
            { id: req.params.reviewId },
            { $inc: { helpfulCount: 1 } },
            { new: true }
        );
        res.json({ success: true, helpfulCount: review?.helpfulCount });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ==================== SUBSCRIPTION MANAGEMENT ====================

// Pause subscription
router.put('/subscription/:subscriptionId/pause', Auth.authenticate, async (req, res) => {
    try {
        const { pauseUntil } = req.body;
        const sub = await MessPass.findOneAndUpdate(
            { id: req.params.subscriptionId, userId: req.user.id },
            { status: 'PAUSED', pausedUntil: pauseUntil },
            { new: true }
        );
        if (!sub) return res.status(404).json({ error: 'Subscription not found' });
        res.json({ success: true, subscription: sub });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Resume subscription
router.put('/subscription/:subscriptionId/resume', Auth.authenticate, async (req, res) => {
    try {
        const sub = await MessPass.findOneAndUpdate(
            { id: req.params.subscriptionId, userId: req.user.id },
            { status: 'ACTIVE', pausedUntil: null },
            { new: true }
        );
        if (!sub) return res.status(404).json({ error: 'Subscription not found' });
        res.json({ success: true, subscription: sub });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Cancel subscription
router.put('/subscription/:subscriptionId/cancel', Auth.authenticate, async (req, res) => {
    try {
        const sub = await MessPass.findOneAndUpdate(
            { id: req.params.subscriptionId, userId: req.user.id },
            { status: 'CANCELLED' },
            { new: true }
        );
        if (!sub) return res.status(404).json({ error: 'Subscription not found' });
        res.json({ success: true, subscription: sub });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ==================== SMART FEATURES ====================

// Get trending dishes
router.get('/trending', async (req, res) => {
    try {
        // Aggregate popular items from recent orders
        const recentOrders = await FoodOrder.find({
            status: 'COMPLETED',
            createdAt: { $gte: Date.now() - 7 * 24 * 60 * 60 * 1000 }
        }).limit(100);

        const itemCounts = {};
        recentOrders.forEach(order => {
            order.items.forEach(item => {
                itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity;
            });
        });

        const trending = Object.entries(itemCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([name, count]) => ({ name, orderCount: count }));

        res.json(trending);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Get budget estimate
router.get('/budget-estimate', async (req, res) => {
    try {
        const { partySize, vendorId } = req.query;

        const menu = await VendorMenuItem.find({ vendorId });
        if (menu.length === 0) {
            return res.json({ min: 100, avg: 200, max: 500 });
        }

        const prices = menu.map(m => m.price);
        const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);

        const size = parseInt(partySize) || 2;
        const itemsPerPerson = 2;

        res.json({
            min: Math.round(minPrice * size * itemsPerPerson),
            avg: Math.round(avgPrice * size * itemsPerPerson),
            max: Math.round(maxPrice * size * itemsPerPerson)
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Get crowd level (mock for now)
router.get('/crowd-level/:vendorId', async (req, res) => {
    try {
        // In production, this would use real-time order data
        const levels = ['QUIET', 'MODERATE', 'BUSY', 'VERY_BUSY'];
        const randomLevel = levels[Math.floor(Math.random() * levels.length)];
        res.json({ level: randomLevel });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Get wait time estimate (mock for now)
router.get('/wait-time/:vendorId', async (req, res) => {
    try {
        // In production, this would use queue data
        const minutes = Math.floor(Math.random() * 20) + 5;
        res.json({ minutes });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ==================== SMART & SOCIAL FEATURES ====================

// Friends also ordered (Social Proof)
router.get('/social-proof/:vendorId', Auth.authenticate, async (req, res) => {
    try {
        const mockFriends = ['Rahul', 'Ankit', 'Sita', 'Priya'];
        const items = ['Special Thali', 'Masala Dosa', 'Paneer Butter Masala'];

        const socialData = items.map(name => ({
            itemName: name,
            friendName: mockFriends[Math.floor(Math.random() * mockFriends.length)],
            count: Math.floor(Math.random() * 5) + 1
        }));

        res.json(socialData);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ML Food Recommendations
router.get('/recommendations', Auth.authenticate, async (req, res) => {
    try {
        const recommendations = [
            { id: '1', name: 'Veg Biryani', reason: 'Because you liked Pulao', matchScore: 95 },
            { id: '2', name: 'Buttermilk', reason: 'Goes well with your spicy orders', matchScore: 88 }
        ];
        res.json(recommendations);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

export default router;


