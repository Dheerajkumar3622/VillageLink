/**
 * GramMandi API Routes
 * Complete Food Ecosystem - Farm to Consumer
 */

import express from 'express';
import crypto from 'crypto';
import * as Auth from '../auth.js';
import {
    DairyFarmer, MilkCollection, CollectionCenter,
    ProduceListing, ProduceOrder, ColdStorageFacility,
    StorageBooking, LogisticsTrip, WholesaleBid,
    SubscriptionBox, MarketPrice, GroupBuy
} from '../models/gramMandiModels.js';
import { JobOpportunity, PilgrimagePackage } from '../models/extraModels.js';
import { NewsItem } from '../models.js';

const router = express.Router();

// ==================== DAIRY FARMER APIs ====================

// Register as dairy farmer
router.post('/dairy/farmer/register', Auth.authenticate, async (req, res) => {
    try {
        const { aadhaar, cattle, location, bankDetails, collectionCenterId } = req.body;

        const farmer = new DairyFarmer({
            id: `DF-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            userId: req.user.id,
            name: req.user.name,
            phone: req.user.phone,
            aadhaar,
            cattle: cattle || { cows: 0, buffaloes: 0 },
            location,
            bankDetails,
            collectionCenterId,
            status: 'PENDING',
            createdAt: Date.now()
        });

        await farmer.save();
        res.json({ success: true, farmer });
    } catch (e) {
        console.error('Dairy farmer registration error:', e);
        res.status(500).json({ error: e.message });
    }
});

// Get farmer profile
router.get('/dairy/farmer/profile', Auth.authenticate, async (req, res) => {
    try {
        const farmer = await DairyFarmer.findOne({ userId: req.user.id });
        if (!farmer) return res.status(404).json({ error: 'Farmer profile not found' });
        res.json(farmer);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Log milk collection
router.post('/dairy/collection', Auth.authenticate, async (req, res) => {
    try {
        const { farmerId, session, quantity, fatPercent, snfPercent, centerId } = req.body;

        // Calculate rate based on fat and SNF (Standard formula)
        // Rate = (Fat × 0.5) + (SNF × 0.25) + Base Rate
        const baseRate = 25; // Base ₹25 per liter
        const rate = Math.round((fatPercent * 0.5) + (snfPercent * 0.25) + baseRate);
        const amount = Math.round(quantity * rate);

        const collection = new MilkCollection({
            id: `MC-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            farmerId,
            centerId,
            date: new Date(),
            session,
            quantity,
            fatPercent,
            snfPercent,
            rate,
            amount,
            collectedBy: req.user.id,
            status: 'COLLECTED'
        });

        await collection.save();

        // Update farmer totals
        await DairyFarmer.findOneAndUpdate(
            { id: farmerId },
            { $inc: { totalMilkSupplied: quantity, totalEarnings: amount } }
        );

        res.json({ success: true, collection, message: `₹${amount} for ${quantity}L @ ₹${rate}/L` });
    } catch (e) {
        console.error('Milk collection error:', e);
        res.status(500).json({ error: e.message });
    }
});

// Get farmer's collection history
router.get('/dairy/farmer/:farmerId/history', async (req, res) => {
    try {
        const collections = await MilkCollection.find({ farmerId: req.params.farmerId })
            .sort({ date: -1 })
            .limit(100);
        res.json(collections);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Get center's today collections
router.get('/dairy/center/:centerId/today', async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const collections = await MilkCollection.find({
            centerId: req.params.centerId,
            date: { $gte: today }
        }).sort({ date: -1 });

        const summary = {
            totalLiters: collections.reduce((sum, c) => sum + c.quantity, 0),
            totalAmount: collections.reduce((sum, c) => sum + c.amount, 0),
            farmerCount: new Set(collections.map(c => c.farmerId)).size,
            collections
        };

        res.json(summary);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ==================== PRODUCE LISTING APIs ====================

// Create produce listing
router.post('/produce/listing', Auth.authenticate, async (req, res) => {
    try {
        const { category, crop, variety, grade, quantity, unit, pricePerUnit, minOrderQty, harvestDate, shelfLife, availableUntil, photos, location, pickupType, organic } = req.body;

        const listing = new ProduceListing({
            id: `PL-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            farmerId: req.user.id,
            farmerName: req.user.name,
            farmerPhone: req.user.phone,
            category,
            crop,
            variety,
            grade: grade || 'B',
            quantity,
            unit: unit || 'KG',
            pricePerUnit,
            minOrderQty: minOrderQty || 1,
            harvestDate: harvestDate ? new Date(harvestDate) : new Date(),
            shelfLife: shelfLife || 7,
            availableUntil: availableUntil ? new Date(availableUntil) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            photos: photos || [],
            location,
            pickupType: pickupType || 'FARM_PICKUP',
            organic: organic || false,
            status: 'ACTIVE',
            createdAt: Date.now()
        });

        await listing.save();
        res.json({ success: true, listing });
    } catch (e) {
        console.error('Produce listing error:', e);
        res.status(500).json({ error: e.message });
    }
});

// Browse listings (for buyers)
router.get('/produce/listings', async (req, res) => {
    try {
        const { category, crop, grade, organic, pincode, minPrice, maxPrice, sort } = req.query;

        let query = { status: 'ACTIVE' };
        if (category) query.category = category;
        if (crop) query.crop = new RegExp(crop, 'i');
        if (grade) query.grade = grade;
        if (organic === 'true') query.organic = true;
        if (pincode) query['location.pincode'] = pincode;
        if (minPrice) query.pricePerUnit = { $gte: parseFloat(minPrice) };
        if (maxPrice) query.pricePerUnit = { ...query.pricePerUnit, $lte: parseFloat(maxPrice) };

        let sortOption = { createdAt: -1 };
        if (sort === 'price_low') sortOption = { pricePerUnit: 1 };
        if (sort === 'price_high') sortOption = { pricePerUnit: -1 };
        if (sort === 'newest') sortOption = { harvestDate: -1 };

        const listings = await ProduceListing.find(query).sort(sortOption).limit(100);
        res.json(listings);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Get my listings (farmer)
router.get('/produce/my-listings', Auth.authenticate, async (req, res) => {
    try {
        const listings = await ProduceListing.find({ farmerId: req.user.id }).sort({ createdAt: -1 });
        res.json(listings);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Update listing
router.put('/produce/listing/:listingId', Auth.authenticate, async (req, res) => {
    try {
        const listing = await ProduceListing.findOneAndUpdate(
            { id: req.params.listingId, farmerId: req.user.id },
            { ...req.body, updatedAt: Date.now() },
            { new: true }
        );
        if (!listing) return res.status(404).json({ error: 'Listing not found' });
        res.json({ success: true, listing });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ==================== ORDER APIs ====================

// Place order (consumer/buyer)
router.post('/order', Auth.authenticate, async (req, res) => {
    try {
        const { items, deliveryType, deliveryAddress, preferredDate, preferredSlot, paymentMethod } = req.body;

        // Calculate totals
        let subtotal = 0;
        const orderItems = [];

        for (const item of items) {
            const listing = await ProduceListing.findOne({ id: item.listingId });
            if (!listing) continue;
            if (listing.quantity < item.quantity) {
                return res.status(400).json({ error: `Not enough ${listing.crop} available` });
            }

            const itemTotal = listing.pricePerUnit * item.quantity;
            subtotal += itemTotal;

            orderItems.push({
                listingId: listing.id,
                farmerId: listing.farmerId,
                farmerName: listing.farmerName,
                crop: listing.crop,
                quantity: item.quantity,
                unit: listing.unit,
                pricePerUnit: listing.pricePerUnit,
                totalPrice: itemTotal
            });

            // Reserve quantity
            await ProduceListing.findOneAndUpdate(
                { id: listing.id },
                { $inc: { quantity: -item.quantity, orderCount: 1 } }
            );
        }

        const deliveryCharge = deliveryType === 'HOME_DELIVERY' ? 30 : 0;
        const platformFee = Math.round(subtotal * 0.03); // 3% platform fee
        const totalAmount = subtotal + deliveryCharge + platformFee;

        const order = new ProduceOrder({
            id: `PO-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            buyerId: req.user.id,
            buyerName: req.user.name,
            buyerPhone: req.user.phone,
            buyerType: req.body.buyerType || 'CONSUMER',
            items: orderItems,
            subtotal,
            deliveryCharge,
            platformFee,
            totalAmount,
            deliveryType: deliveryType || 'HOME_DELIVERY',
            deliveryAddress,
            preferredDate: preferredDate ? new Date(preferredDate) : new Date(Date.now() + 24 * 60 * 60 * 1000),
            preferredSlot: preferredSlot || 'MORNING',
            status: 'PLACED',
            paymentMethod: paymentMethod || 'COD',
            paymentStatus: paymentMethod === 'COD' ? 'PENDING' : 'PENDING',
            pickupOtp: Math.random().toString().substring(2, 6),
            deliveryOtp: Math.random().toString().substring(2, 6),
            createdAt: Date.now()
        });

        await order.save();
        res.json({ success: true, order });
    } catch (e) {
        console.error('Order placement error:', e);
        res.status(500).json({ error: e.message });
    }
});

// Get my orders (buyer)
router.get('/orders/my', Auth.authenticate, async (req, res) => {
    try {
        const orders = await ProduceOrder.find({ buyerId: req.user.id }).sort({ createdAt: -1 });
        res.json(orders);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Get orders for farmer
router.get('/orders/farmer', Auth.authenticate, async (req, res) => {
    try {
        const orders = await ProduceOrder.find({ 'items.farmerId': req.user.id }).sort({ createdAt: -1 });
        res.json(orders);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Update order status
router.put('/order/:orderId/status', Auth.authenticate, async (req, res) => {
    try {
        const { status } = req.body;
        const order = await ProduceOrder.findOneAndUpdate(
            { id: req.params.orderId },
            { status, updatedAt: Date.now() },
            { new: true }
        );
        if (!order) return res.status(404).json({ error: 'Order not found' });
        res.json({ success: true, order });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ==================== COLD STORAGE APIs ====================

// Register cold storage facility
router.post('/storage/facility', Auth.authenticate, async (req, res) => {
    try {
        const { name, type, location, capacity, temperatureRange, acceptedProduce, ratePerDay, ratePerMonth, amenities, photos } = req.body;

        const facility = new ColdStorageFacility({
            id: `CS-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            operatorId: req.user.id,
            name,
            type: type || 'COLD_STORAGE',
            location,
            capacity,
            availableCapacity: capacity,
            temperatureRange,
            acceptedProduce: acceptedProduce || [],
            ratePerDay,
            ratePerMonth,
            amenities: amenities || [],
            photos: photos || [],
            status: 'ACTIVE',
            createdAt: Date.now()
        });

        await facility.save();
        res.json({ success: true, facility });
    } catch (e) {
        console.error('Cold storage registration error:', e);
        res.status(500).json({ error: e.message });
    }
});

// Browse cold storage facilities
router.get('/storage/facilities', async (req, res) => {
    try {
        const { district, produce, minCapacity } = req.query;

        let query = { status: { $in: ['ACTIVE', 'FULL'] } };
        if (district) query['location.district'] = new RegExp(district, 'i');
        if (produce) query.acceptedProduce = produce;
        if (minCapacity) query.availableCapacity = { $gte: parseInt(minCapacity) };

        const facilities = await ColdStorageFacility.find(query).sort({ ratePerDay: 1 });
        res.json(facilities);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Book storage
router.post('/storage/book', Auth.authenticate, async (req, res) => {
    try {
        const { facilityId, produce, quantity, inDate, expectedOutDate } = req.body;

        const facility = await ColdStorageFacility.findOne({ id: facilityId });
        if (!facility) return res.status(404).json({ error: 'Facility not found' });
        if (facility.availableCapacity < quantity) {
            return res.status(400).json({ error: 'Not enough capacity available' });
        }

        const booking = new StorageBooking({
            id: `SB-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            facilityId,
            facilityName: facility.name,
            userId: req.user.id,
            userName: req.user.name,
            produce,
            quantity,
            inDate: new Date(inDate),
            expectedOutDate: expectedOutDate ? new Date(expectedOutDate) : null,
            ratePerDay: facility.ratePerDay,
            status: 'BOOKED',
            createdAt: Date.now()
        });

        await booking.save();

        // Reduce available capacity
        await ColdStorageFacility.findOneAndUpdate(
            { id: facilityId },
            { $inc: { availableCapacity: -quantity, totalBookings: 1 } }
        );

        res.json({ success: true, booking });
    } catch (e) {
        console.error('Storage booking error:', e);
        res.status(500).json({ error: e.message });
    }
});

// Get my storage bookings
router.get('/storage/my-bookings', Auth.authenticate, async (req, res) => {
    try {
        const bookings = await StorageBooking.find({ userId: req.user.id }).sort({ createdAt: -1 });
        res.json(bookings);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ==================== LOGISTICS APIs ====================

// Create logistics trip
router.post('/logistics/trip', Auth.authenticate, async (req, res) => {
    try {
        const { driverName, driverPhone, vehicleType, vehicleNumber, isRefrigerated, pickups, deliveries } = req.body;

        const trip = new LogisticsTrip({
            id: `LT-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            driverId: req.user.id,
            driverName,
            driverPhone,
            vehicleType: vehicleType || 'PICKUP',
            vehicleNumber,
            isRefrigerated: isRefrigerated || false,
            pickups: pickups || [],
            deliveries: deliveries || [],
            status: 'ASSIGNED',
            createdAt: Date.now()
        });

        await trip.save();
        res.json({ success: true, trip });
    } catch (e) {
        console.error('Logistics trip error:', e);
        res.status(500).json({ error: e.message });
    }
});

// Update trip status
router.put('/logistics/trip/:tripId/status', Auth.authenticate, async (req, res) => {
    try {
        const { status, currentLocation } = req.body;
        const update = { status };
        if (currentLocation) update.currentLocation = currentLocation;
        if (status === 'STARTED') update.startTime = Date.now();
        if (status === 'COMPLETED') update.endTime = Date.now();

        const trip = await LogisticsTrip.findOneAndUpdate(
            { id: req.params.tripId },
            update,
            { new: true }
        );
        if (!trip) return res.status(404).json({ error: 'Trip not found' });
        res.json({ success: true, trip });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ==================== WHOLESALE BID APIs ====================

// Place bid on listing
router.post('/wholesale/bid', Auth.authenticate, async (req, res) => {
    try {
        const { listingId, bidQuantity, bidPricePerUnit, message } = req.body;

        const listing = await ProduceListing.findOne({ id: listingId });
        if (!listing) return res.status(404).json({ error: 'Listing not found' });

        const bid = new WholesaleBid({
            id: `BID-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            listingId,
            farmerId: listing.farmerId,
            vendorId: req.user.id,
            vendorName: req.user.name,
            bidQuantity,
            bidPricePerUnit,
            totalBidAmount: bidQuantity * bidPricePerUnit,
            message,
            status: 'PENDING',
            expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
            createdAt: Date.now()
        });

        await bid.save();
        res.json({ success: true, bid });
    } catch (e) {
        console.error('Bid placement error:', e);
        res.status(500).json({ error: e.message });
    }
});

// Get bids on my listings (farmer)
router.get('/wholesale/bids/received', Auth.authenticate, async (req, res) => {
    try {
        const bids = await WholesaleBid.find({ farmerId: req.user.id, status: 'PENDING' }).sort({ createdAt: -1 });
        res.json(bids);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Accept/Reject bid
router.put('/wholesale/bid/:bidId', Auth.authenticate, async (req, res) => {
    try {
        const { action } = req.body; // 'accept' or 'reject'
        const status = action === 'accept' ? 'ACCEPTED' : 'REJECTED';

        const bid = await WholesaleBid.findOneAndUpdate(
            { id: req.params.bidId, farmerId: req.user.id },
            { status, acceptedAt: action === 'accept' ? Date.now() : null },
            { new: true }
        );
        if (!bid) return res.status(404).json({ error: 'Bid not found' });
        res.json({ success: true, bid });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ==================== SUBSCRIPTION BOX APIs ====================

// Create subscription
router.post('/subscription', Auth.authenticate, async (req, res) => {
    try {
        const { planType, boxType, budget, preferences, deliveryAddress, preferredDay } = req.body;

        const subscription = new SubscriptionBox({
            id: `SUB-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            userId: req.user.id,
            userName: req.user.name,
            planType,
            boxType: boxType || 'MIXED',
            budget,
            preferences: preferences || {},
            deliveryAddress,
            preferredDay: preferredDay || 'SATURDAY',
            status: 'ACTIVE',
            nextDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            createdAt: Date.now()
        });

        await subscription.save();
        res.json({ success: true, subscription });
    } catch (e) {
        console.error('Subscription error:', e);
        res.status(500).json({ error: e.message });
    }
});

// Get my subscriptions
router.get('/subscription/my', Auth.authenticate, async (req, res) => {
    try {
        const subscriptions = await SubscriptionBox.find({ userId: req.user.id });
        res.json(subscriptions);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ==================== GROUP BUY APIs ====================

// Create group buy
router.post('/group-buy', Auth.authenticate, async (req, res) => {
    try {
        const { listingId, targetQuantity, discountPercent, deliveryArea, deadline } = req.body;

        const listing = await ProduceListing.findOne({ id: listingId });

        const groupBuy = new GroupBuy({
            id: `GB-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            listingId,
            crop: listing?.crop,
            targetQuantity,
            currentQuantity: 0,
            pricePerUnit: listing?.pricePerUnit,
            discountPercent: discountPercent || 10,
            participants: [],
            deliveryArea,
            deadline: new Date(deadline),
            status: 'OPEN',
            createdAt: Date.now()
        });

        await groupBuy.save();
        res.json({ success: true, groupBuy });
    } catch (e) {
        console.error('Group buy error:', e);
        res.status(500).json({ error: e.message });
    }
});

// Join group buy
router.post('/group-buy/:groupId/join', Auth.authenticate, async (req, res) => {
    try {
        const { quantity } = req.body;

        const groupBuy = await GroupBuy.findOneAndUpdate(
            { id: req.params.groupId, status: 'OPEN' },
            {
                $push: { participants: { userId: req.user.id, userName: req.user.name, quantity, joinedAt: Date.now() } },
                $inc: { currentQuantity: quantity }
            },
            { new: true }
        );

        if (!groupBuy) return res.status(404).json({ error: 'Group buy not found or closed' });

        // Check if target reached
        if (groupBuy.currentQuantity >= groupBuy.targetQuantity) {
            await GroupBuy.findOneAndUpdate({ id: req.params.groupId }, { status: 'FILLED' });
        }

        res.json({ success: true, groupBuy });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Get active group buys
router.get('/group-buy/active', async (req, res) => {
    try {
        const groupBuys = await GroupBuy.find({ status: 'OPEN' }).sort({ deadline: 1 });
        res.json(groupBuys);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ==================== MARKET PRICE APIs ====================

// Get market prices
router.get('/market/prices', async (req, res) => {
    try {
        const { crop, state, days } = req.query;
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - (parseInt(days) || 7));

        let query = { date: { $gte: fromDate } };
        if (crop) query.crop = new RegExp(crop, 'i');
        if (state) query.state = state;

        const prices = await MarketPrice.find(query).sort({ date: -1 });
        res.json(prices);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Add market price (admin/system)
router.post('/market/price', Auth.authenticate, async (req, res) => {
    try {
        const { crop, market, state, minPrice, maxPrice, modalPrice, arrivals } = req.body;

        const price = new MarketPrice({
            id: `MP-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            crop,
            market,
            state: state || 'Bihar',
            date: new Date(),
            minPrice,
            maxPrice,
            modalPrice,
            unit: 'QUINTAL',
            arrivals,
            source: 'MANUAL',
            createdAt: Date.now()
        });

        await price.save();
        res.json({ success: true, price });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ==================== DASHBOARD APIs ====================

// Farmer dashboard stats
router.get('/dashboard/farmer', Auth.authenticate, async (req, res) => {
    try {
        const listings = await ProduceListing.find({ farmerId: req.user.id });
        const orders = await ProduceOrder.find({ 'items.farmerId': req.user.id });
        const bids = await WholesaleBid.find({ farmerId: req.user.id, status: 'PENDING' });
        const dairyProfile = await DairyFarmer.findOne({ userId: req.user.id });

        const stats = {
            activeListings: listings.filter(l => l.status === 'ACTIVE').length,
            totalListings: listings.length,
            pendingOrders: orders.filter(o => ['PLACED', 'CONFIRMED', 'PICKING'].includes(o.status)).length,
            completedOrders: orders.filter(o => o.status === 'DELIVERED').length,
            totalRevenue: orders.filter(o => o.paymentStatus === 'PAID').reduce((sum, o) => {
                const farmerItems = o.items.filter(i => i.farmerId === req.user.id);
                return sum + farmerItems.reduce((s, i) => s + i.totalPrice, 0);
            }, 0),
            pendingBids: bids.length,
            dairyEarnings: dairyProfile?.totalEarnings || 0,
            milkSupplied: dairyProfile?.totalMilkSupplied || 0
        };

        res.json(stats);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Consumer dashboard
router.get('/dashboard/consumer', Auth.authenticate, async (req, res) => {
    try {
        const orders = await ProduceOrder.find({ buyerId: req.user.id });
        const subscriptions = await SubscriptionBox.find({ userId: req.user.id, status: 'ACTIVE' });

        const stats = {
            totalOrders: orders.length,
            activeOrders: orders.filter(o => !['DELIVERED', 'CANCELLED'].includes(o.status)).length,
            totalSpent: orders.filter(o => o.status === 'DELIVERED').reduce((sum, o) => sum + o.totalAmount, 0),
            activeSubscriptions: subscriptions.length
        };

        res.json(stats);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ==================== JOBS & TRAVEL APIs (REAL IMPLEMENTATION) ====================

// --- JOBS ---

// Get all jobs
router.get('/jobs', async (req, res) => {
    try {
        const jobs = await JobOpportunity.find({ isActive: true }).sort({ createdAt: -1 });
        res.json(jobs);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Post a job
router.post('/jobs', Auth.authenticate, async (req, res) => {
    try {
        const { title, location, wage, contact, type, description } = req.body;
        const job = new JobOpportunity({
            id: `JOB-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            title,
            location,
            wage,
            contact,
            type,
            description,
            postedBy: req.user.id
        });
        await job.save();
        res.json({ success: true, job });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- TRAVEL PACKAGES ---

// Get all packages
router.get('/travel/packages', async (req, res) => {
    try {
        const packages = await PilgrimagePackage.find({ isActive: true }).sort({ price: 1 });
        res.json(packages);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Add a package (Operator/Admin)
router.post('/travel/packages', Auth.authenticate, async (req, res) => {
    try {
        const { name, locations, price, duration, image, description, nextDate } = req.body;
        const pkg = new PilgrimagePackage({
            id: `PKG-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            name,
            locations,
            price,
            duration,
            image,
            description,
            nextDate,
            operatorId: req.user.id
        });
        await pkg.save();
        res.json({ success: true, package: pkg });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- LOGISTICS RATES ---

// Get dynamic logistics rates
router.get('/logistics/rates', async (req, res) => {
    try {
        // In a real system, this might query a Rates table or 3rd party API
        // For now, we standardize the logic here instead of client-side
        const rates = {
            'BOX_SMALL': 20,
            'SACK_GRAIN': 15,
            'DOCUMENT': 30,
            'DEFAULT': 18,
            'perKgMultiplier': 2
        };
        res.json(rates);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- MARKET RATES ---
router.get('/market/rates', async (req, res) => {
    try {
        const rates = await MarketPrice.find().sort({ commodity: 1 });
        res.json(rates);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- WEATHER & NEWS ---

router.get('/weather', async (req, res) => {
    try {
        // Fallback real-looking data for Rohtas region
        // In a real app, this would call an API like OpenWeatherMap
        const weather = {
            location: "Sasaram, Rohtas",
            temp: 24,
            condition: "Sunny",
            humidity: 45,
            forecast: [
                { day: "Tomorrow", temp: 26, condition: "Partly Cloudy" },
                { day: "Monday", temp: 23, condition: "Rain" }
            ],
            advisory: "Favorable conditions for Wheat sowing. Ensure proper irrigation."
        };
        res.json(weather);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/news', async (req, res) => {
    try {
        const news = await NewsItem.find().sort({ timestamp: -1 }).limit(10);
        res.json(news);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
