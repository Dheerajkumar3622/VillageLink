/**
 * Supply Chain Routes - Unified Marketplace API
 * USS v3.0
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as Auth from '../auth.js';
import {
    SupplyListing, SupplyBid, SupplyOrder, RouteCapacity,
    TransportPricing, PriceAudit
} from '../models/ussModels.js';
import { CargoRequest, DriverLocation, User } from '../models.js';

const router = express.Router();

// ==================== DELIVERY PRICING ====================

// Get delivery quote (upfront pricing)
router.get('/delivery-quote', async (req, res) => {
    try {
        const { fromLat, fromLng, toLat, toLng, weightKg = 1, vehicleType = 'AUTO' } = req.query;

        // Calculate distance
        const distance = calculateDistance(
            parseFloat(fromLat), parseFloat(fromLng),
            parseFloat(toLat), parseFloat(toLng)
        );

        // Get admin-controlled rates
        let pricing = await TransportPricing.findOne({ vehicleType, isActive: true });
        if (!pricing) {
            pricing = {
                baseFare: 20,
                perKmRate: 3,
                perKgRate: 0.5,
                freeWeightKg: 5,
                platformCommission: 10
            };
        }

        // Calculate price
        const weight = parseFloat(weightKg);
        const baseCost = pricing.baseFare;
        const distanceCost = distance * pricing.perKmRate;
        const weightCost = weight > pricing.freeWeightKg
            ? (weight - pricing.freeWeightKg) * pricing.perKgRate
            : 0;

        const subtotal = baseCost + distanceCost + weightCost;
        const platformFee = Math.round(subtotal * (pricing.platformCommission / 100));
        const total = Math.round(subtotal + platformFee);

        res.json({
            success: true,
            quote: {
                distanceKm: Math.round(distance * 10) / 10,
                weightKg: weight,
                vehicleType,
                breakdown: {
                    baseFare: Math.round(baseCost),
                    distanceCharge: Math.round(distanceCost),
                    weightCharge: Math.round(weightCost),
                    platformFee,
                    total
                },
                estimatedTime: Math.ceil(distance / 25 * 60) // minutes at 25km/h avg
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== LISTINGS ====================

// Create product listing
router.post('/listing', Auth.authenticate, async (req, res) => {
    try {
        const {
            productType, productName, variety, grade,
            quantity, unit, pricePerUnit, minOrderQuantity,
            location, harvestDate, expiryDate, organic,
            certifications, photos, deliveryOptions, trustChain
        } = req.body;

        const listing = new SupplyListing({
            id: `LST-${uuidv4().substring(0, 10).toUpperCase()}`,
            sellerId: req.user.id,
            sellerName: req.user.name,
            sellerPhone: req.user.phone,
            sellerType: req.body.sellerType || 'FARMER',
            productType,
            productName,
            variety,
            grade,
            quantity,
            unit: unit || 'KG',
            pricePerUnit,
            minOrderQuantity: minOrderQuantity || 1,
            location,
            harvestDate: harvestDate ? new Date(harvestDate) : null,
            expiryDate: expiryDate ? new Date(expiryDate) : null,
            organic: organic || false,
            certifications: certifications || [],
            photos: photos || [],
            deliveryOptions: deliveryOptions || [
                { type: 'PICKUP', available: true, additionalCost: 0 },
                { type: 'TRANSPORT_LINK', available: true, additionalCost: 0 }
            ],
            trustChain: trustChain || {},
            status: 'ACTIVE',
            listing,
            message: 'Product listed successfully'
        });
    } catch (error) {
        console.error('Listing creation error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Browse listings
router.get('/listings', async (req, res) => {
    try {
        const {
            productType, sellerType, district, organic,
            minPrice, maxPrice, sort, limit = 20, skip = 0
        } = req.query;

        let query = { status: 'ACTIVE' };

        if (productType) query.productType = productType;
        if (sellerType) query.sellerType = sellerType;
        if (district) query['location.district'] = district;
        if (organic === 'true') query.organic = true;
        if (minPrice) query.pricePerUnit = { $gte: parseFloat(minPrice) };
        if (maxPrice) query.pricePerUnit = { ...query.pricePerUnit, $lte: parseFloat(maxPrice) };

        let sortOption = { createdAt: -1 };
        if (sort === 'price_low') sortOption = { pricePerUnit: 1 };
        if (sort === 'price_high') sortOption = { pricePerUnit: -1 };

        const listings = await SupplyListing.find(query)
            .sort(sortOption)
            .skip(parseInt(skip))
            .limit(parseInt(limit));

        const total = await SupplyListing.countDocuments(query);

        res.json({ success: true, listings, total });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get listing details with delivery quote
router.get('/listing/:id', async (req, res) => {
    try {
        const listing = await SupplyListing.findOne({ id: req.params.id });

        if (!listing) {
            return res.status(404).json({ success: false, error: 'Listing not found' });
        }

        // Increment view count
        await SupplyListing.updateOne({ id: req.params.id }, { $inc: { viewCount: 1 } });

        res.json({ success: true, listing });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// My listings
router.get('/my-listings', Auth.authenticate, async (req, res) => {
    try {
        const listings = await SupplyListing.find({ sellerId: req.user.id })
            .sort({ createdAt: -1 });

        res.json({ success: true, listings });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== BIDDING ====================

// Place bid on listing
router.post('/bid', Auth.authenticate, async (req, res) => {
    try {
        const { listingId, quantity, offeredPrice, message, deliveryPreference } = req.body;

        const listing = await SupplyListing.findOne({ id: listingId, status: 'ACTIVE' });
        if (!listing) {
            return res.status(404).json({ success: false, error: 'Listing not found or not active' });
        }

        if (quantity < listing.minOrderQuantity) {
            return res.status(400).json({
                success: false,
                error: `Minimum order is ${listing.minOrderQuantity} ${listing.unit}`
            });
        }

        const bid = new SupplyBid({
            id: `BID-${uuidv4().substring(0, 10).toUpperCase()}`,
            listingId,
            sellerId: listing.sellerId,
            buyerId: req.user.id,
            buyerName: req.user.name,
            buyerPhone: req.user.phone,
            buyerType: req.body.buyerType || 'CUSTOMER',
            quantity,
            offeredPrice,
            totalAmount: quantity * offeredPrice,
            message,
            deliveryPreference,
            status: 'PENDING',
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
            createdAt: Date.now()
        });

        await bid.save();

        // Increment listing inquiry count
        await SupplyListing.updateOne({ id: listingId }, { $inc: { inquiryCount: 1 } });

        res.json({
            success: true,
            bid,
            message: 'Bid placed successfully'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Respond to bid (accept/reject/counter)
router.put('/bid/:id/respond', Auth.authenticate, async (req, res) => {
    try {
        const { response, counterPrice, counterMessage } = req.body;
        const bid = await SupplyBid.findOne({ id: req.params.id, sellerId: req.user.id });

        if (!bid) {
            return res.status(404).json({ success: false, error: 'Bid not found' });
        }

        if (bid.status !== 'PENDING') {
            return res.status(400).json({ success: false, error: 'Bid already responded' });
        }

        if (response === 'ACCEPT') {
            bid.status = 'ACCEPTED';
            bid.respondedAt = new Date();
            await bid.save();

            // Create order automatically
            const order = await createOrderFromBid(bid);

            res.json({ success: true, bid, order, message: 'Bid accepted, order created' });
        } else if (response === 'COUNTER') {
            bid.status = 'COUNTERED';
            bid.counterPrice = counterPrice;
            bid.counterMessage = counterMessage;
            bid.respondedAt = new Date();
            await bid.save();

            res.json({ success: true, bid, message: 'Counter offer sent' });
        } else {
            bid.status = 'REJECTED';
            bid.respondedAt = new Date();
            await bid.save();

            res.json({ success: true, bid, message: 'Bid rejected' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get bids on my listings
router.get('/bids/received', Auth.authenticate, async (req, res) => {
    try {
        const bids = await SupplyBid.find({ sellerId: req.user.id })
            .sort({ createdAt: -1 });

        res.json({ success: true, bids });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get my bids
router.get('/bids/sent', Auth.authenticate, async (req, res) => {
    try {
        const bids = await SupplyBid.find({ buyerId: req.user.id })
            .sort({ createdAt: -1 });

        res.json({ success: true, bids });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== ORDERS ====================

// Direct purchase (with auto-delivery)
router.post('/purchase', Auth.authenticate, async (req, res) => {
    try {
        const { listingId, quantity, deliveryMethod, deliveryLocation } = req.body;

        const listing = await SupplyListing.findOne({ id: listingId, status: 'ACTIVE' });
        if (!listing) {
            return res.status(404).json({ success: false, error: 'Listing not found' });
        }

        if (quantity > (listing.quantity - listing.reservedQuantity)) {
            return res.status(400).json({ success: false, error: 'Insufficient stock' });
        }

        // Calculate delivery cost
        let deliveryCost = 0;
        let deliveryDistance = 0;

        if (deliveryMethod === 'TRANSPORT_LINK' && deliveryLocation) {
            const quoteRes = await calculateDeliveryQuote(
                listing.location.lat, listing.location.lng,
                deliveryLocation.lat, deliveryLocation.lng,
                quantity
            );
            deliveryCost = quoteRes.total;
            deliveryDistance = quoteRes.distanceKm;
        }

        const subtotal = quantity * listing.pricePerUnit;
        const platformFee = Math.round(subtotal * 0.03); // 3%
        const totalAmount = subtotal + deliveryCost + platformFee;

        // Generate OTPs
        const pickupOTP = Math.random().toString().substring(2, 6);
        const deliveryOTP = Math.random().toString().substring(2, 6);

        const order = new SupplyOrder({
            id: `SO-${uuidv4().substring(0, 10).toUpperCase()}`,
            sellerId: listing.sellerId,
            sellerName: listing.sellerName,
            sellerPhone: listing.sellerPhone,
            buyerId: req.user.id,
            buyerName: req.user.name,
            buyerPhone: req.user.phone,
            listingId,
            items: [{
                productName: listing.productName,
                variety: listing.variety,
                quantity,
                unit: listing.unit,
                pricePerUnit: listing.pricePerUnit,
                subtotal
            }],
            subtotal,
            deliveryCost,
            platformFee,
            totalAmount,
            deliveryMethod,
            pickupLocation: {
                address: `${listing.location.village}, ${listing.location.district}`,
                lat: listing.location.lat,
                lng: listing.location.lng
            },
            deliveryLocation: deliveryLocation || null,
            deliveryDistance,
            pickupOTP,
            deliveryOTP,
            status: 'PLACED',
            paymentStatus: 'PENDING',
            createdAt: Date.now()
        });

        await order.save();

        // Reserve stock
        await SupplyListing.updateOne(
            { id: listingId },
            { $inc: { reservedQuantity: quantity } }
        );

        // If transport link, create cargo request and find driver
        if (deliveryMethod === 'TRANSPORT_LINK') {
            const cargoResult = await createCargoForOrder(order, listing, deliveryLocation);
            if (cargoResult.success) {
                order.cargoRequestId = cargoResult.cargoId;
                order.driverId = cargoResult.driverId;
                order.driverName = cargoResult.driverName;
                order.estimatedDeliveryTime = cargoResult.estimatedTime;
                await order.save();
            }
        }

        res.json({
            success: true,
            order,
            message: 'Order placed successfully',
            deliveryInfo: deliveryMethod === 'TRANSPORT_LINK' ? {
                driverAssigned: !!order.driverId,
                driverName: order.driverName,
                estimatedTime: order.estimatedDeliveryTime
            } : null
        });
    } catch (error) {
        console.error('Purchase error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get my orders (as buyer)
router.get('/orders/my', Auth.authenticate, async (req, res) => {
    try {
        const orders = await SupplyOrder.find({ buyerId: req.user.id })
            .sort({ createdAt: -1 });

        res.json({ success: true, orders });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get orders to fulfill (as seller)
router.get('/orders/received', Auth.authenticate, async (req, res) => {
    try {
        const orders = await SupplyOrder.find({ sellerId: req.user.id })
            .sort({ createdAt: -1 });

        res.json({ success: true, orders });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update order status
router.put('/order/:id/status', Auth.authenticate, async (req, res) => {
    try {
        const { status, otp } = req.body;
        const order = await SupplyOrder.findOne({ id: req.params.id });

        if (!order) {
            return res.status(404).json({ success: false, error: 'Order not found' });
        }

        // Validate OTP for pickup/delivery
        if (status === 'PICKED_UP' && otp !== order.pickupOTP) {
            return res.status(400).json({ success: false, error: 'Invalid pickup OTP' });
        }
        if (status === 'DELIVERED' && otp !== order.deliveryOTP) {
            return res.status(400).json({ success: false, error: 'Invalid delivery OTP' });
        }

        order.status = status;
        if (status === 'CONFIRMED') order.confirmedAt = new Date();
        if (status === 'PICKED_UP') order.pickedUpAt = new Date();
        if (status === 'DELIVERED') {
            order.deliveredAt = new Date();
            order.paymentStatus = 'PAID';

            // Update listing sold quantity
            for (const item of order.items) {
                await SupplyListing.updateOne(
                    { id: order.listingId },
                    {
                        $inc: { soldQuantity: item.quantity, reservedQuantity: -item.quantity }
                    }
                );
            }
        }

        await order.save();

        res.json({ success: true, order, message: `Order ${status.toLowerCase()}` });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== ROUTE CAPACITY (DRIVER) ====================

// Driver advertises cargo capacity
router.post('/route-capacity', Auth.authenticate, async (req, res) => {
    try {
        const {
            vehicleType, vehicleNumber, route,
            totalCapacity, acceptedCargoTypes, pricePerKg, pricePerKm
        } = req.body;

        const capacity = new RouteCapacity({
            id: `RC-${uuidv4().substring(0, 10).toUpperCase()}`,
            driverId: req.user.id,
            driverName: req.user.name,
            driverPhone: req.user.phone,
            vehicleType,
            vehicleNumber,
            route,
            totalCapacity,
            availableCapacity: { ...totalCapacity },
            acceptedCargoTypes: acceptedCargoTypes || ['ANY'],
            pricePerKg,
            pricePerKm,
            status: 'AVAILABLE',
            createdAt: Date.now()
        });

        await capacity.save();

        res.json({
            success: true,
            capacity,
            message: 'Route capacity published'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Find drivers for a route
router.get('/match-routes', async (req, res) => {
    try {
        const { fromLat, fromLng, toLat, toLng, weightKg = 1 } = req.query;

        // Find available route capacities
        const capacities = await RouteCapacity.find({
            status: { $in: ['AVAILABLE', 'PARTIAL'] },
            'route.departureTime': { $gte: new Date() },
            'availableCapacity.weightKg': { $gte: parseFloat(weightKg) }
        }).limit(20);

        // Score and filter by route compatibility
        const matches = capacities.map(cap => {
            // Simple distance check - could be improved with actual route matching
            const pickupDist = calculateDistance(
                parseFloat(fromLat), parseFloat(fromLng),
                cap.route.from.lat, cap.route.from.lng
            );
            const dropDist = calculateDistance(
                parseFloat(toLat), parseFloat(toLng),
                cap.route.to.lat, cap.route.to.lng
            );

            const detour = pickupDist + dropDist;
            const score = Math.max(0, 100 - detour * 5);

            return {
                ...cap.toObject(),
                detourKm: Math.round(detour * 10) / 10,
                score,
                estimatedCost: Math.round(cap.pricePerKg * parseFloat(weightKg) + cap.pricePerKm * detour)
            };
        }).filter(m => m.score > 30).sort((a, b) => b.score - a.score);

        res.json({ success: true, matches });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== HELPERS ====================

function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function calculateDeliveryQuote(fromLat, fromLng, toLat, toLng, weightKg) {
    const distance = calculateDistance(fromLat, fromLng, toLat, toLng);
    let pricing = await TransportPricing.findOne({ vehicleType: 'AUTO', isActive: true });

    if (!pricing) {
        pricing = { baseFare: 20, perKmRate: 3, perKgRate: 0.5, freeWeightKg: 5 };
    }

    const baseCost = pricing.baseFare;
    const distanceCost = distance * pricing.perKmRate;
    const weightCost = weightKg > pricing.freeWeightKg
        ? (weightKg - pricing.freeWeightKg) * pricing.perKgRate
        : 0;

    return {
        distanceKm: Math.round(distance * 10) / 10,
        total: Math.round(baseCost + distanceCost + weightCost)
    };
}

async function createOrderFromBid(bid) {
    const listing = await SupplyListing.findOne({ id: bid.listingId });

    const order = new SupplyOrder({
        id: `SO-${uuidv4().substring(0, 10).toUpperCase()}`,
        sellerId: bid.sellerId,
        buyerId: bid.buyerId,
        buyerName: bid.buyerName,
        buyerPhone: bid.buyerPhone,
        listingId: bid.listingId,
        bidId: bid.id,
        items: [{
            productName: listing.productName,
            variety: listing.variety,
            quantity: bid.quantity,
            unit: listing.unit,
            pricePerUnit: bid.offeredPrice,
            subtotal: bid.totalAmount
        }],
        subtotal: bid.totalAmount,
        totalAmount: bid.totalAmount,
        deliveryMethod: bid.deliveryPreference?.type || 'SELF_PICKUP',
        deliveryLocation: bid.deliveryPreference,
        pickupOTP: Math.random().toString().substring(2, 6),
        deliveryOTP: Math.random().toString().substring(2, 6),
        status: 'PLACED',
        createdAt: Date.now()
    });

    await order.save();
    return order;
}

async function createCargoForOrder(order, listing, deliveryLocation) {
    try {
        // Find available drivers going that direction
        const drivers = await DriverLocation.find({
            isOnline: true
        }).limit(10);

        if (drivers.length === 0) {
            return { success: false, message: 'No drivers available' };
        }

        // For now, just pick nearest driver
        // TODO: Implement proper route matching
        const driver = drivers[0];
        const user = await User.findOne({ id: driver.driverId });

        return {
            success: true,
            cargoId: `CARGO-${uuidv4().substring(0, 8)}`,
            driverId: driver.driverId,
            driverName: user?.name || 'Driver',
            estimatedTime: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours
        };
    } catch (error) {
        console.error('Create cargo error:', error);
        return { success: false, message: error.message };
    }
}

export default router;
