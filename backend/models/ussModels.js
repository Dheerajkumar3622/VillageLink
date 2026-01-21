/**
 * Supply Chain & Platform Extended Models
 * USS v3.0 - Unified Supply Chain System
 * 
 * Models for:
 * - Admin Pricing Control
 * - QR Codes
 * - Supply Chain (Listings, Bids, Orders)
 * - Reels
 * - Chat
 */

import mongoose from 'mongoose';

// ==================== ADMIN PRICING CONTROL ====================

const transportPricingSchema = new mongoose.Schema({
    id: { type: String, unique: true },
    vehicleType: {
        type: String,
        enum: ['BUS', 'AUTO', 'CAR', 'TRUCK', 'BIKE', 'TEMPO', 'TRAVELER'],
        required: true,
        unique: true
    },
    baseFare: { type: Number, default: 20 },           // ₹20 minimum
    perKmRate: { type: Number, default: 3 },           // ₹3/km
    perKgRate: { type: Number, default: 0.5 },         // For cargo: ₹0.5/kg
    freeWeightKg: { type: Number, default: 5 },        // 5kg free
    nightChargePercent: { type: Number, default: 25 }, // 25% extra after 10pm
    surgeMax: { type: Number, default: 1.5 },          // Max 1.5x
    platformCommission: { type: Number, default: 10 }, // 10% of fare
    waitingChargePerMin: { type: Number, default: 2 }, // ₹2/min waiting
    isActive: { type: Boolean, default: true },
    updatedBy: String,
    updatedAt: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now }
});

transportPricingSchema.index({ vehicleType: 1 });

export const TransportPricing = mongoose.model('TransportPricing', transportPricingSchema);

// Price calculation audit log
const priceAuditSchema = new mongoose.Schema({
    id: { type: String, unique: true },
    orderId: String,
    orderType: { type: String, enum: ['TICKET', 'CARGO', 'RENTAL', 'SUPPLY_CHAIN'] },
    vehicleType: String,
    distanceKm: Number,
    weightKg: Number,
    appliedRates: {
        baseFare: Number,
        perKmRate: Number,
        perKgRate: Number,
        surgeMultiplier: Number,
        nightCharge: Boolean
    },
    breakdown: {
        base: Number,
        distance: Number,
        weight: Number,
        surge: Number,
        night: Number,
        platform: Number,
        total: Number
    },
    calculatedAt: { type: Date, default: Date.now }
});

priceAuditSchema.index({ orderId: 1 });
priceAuditSchema.index({ calculatedAt: -1 });

export const PriceAudit = mongoose.model('PriceAudit', priceAuditSchema);

// ==================== UNIVERSAL QR CODES ====================

const qrCodeSchema = new mongoose.Schema({
    id: { type: String, unique: true },
    ownerId: { type: String, required: true },
    ownerType: {
        type: String,
        enum: ['USER', 'SHOP', 'MESS', 'VENDOR', 'FARMER', 'DRIVER', 'PRODUCT', 'TICKET', 'PARCEL'],
        required: true
    },
    qrType: {
        type: String,
        enum: ['SHOP', 'PAYMENT', 'TICKET', 'PARCEL', 'USER', 'PRODUCT', 'CHECKIN'],
        required: true
    },
    payload: { type: String, required: true },  // JSON string with QR data
    name: String,                                // Display name
    description: String,
    imageUrl: String,                           // QR image if pre-generated
    scanCount: { type: Number, default: 0 },
    lastScannedAt: Date,
    lastScannedBy: String,
    isActive: { type: Boolean, default: true },
    expiresAt: Date,                            // Optional expiry
    createdAt: { type: Date, default: Date.now }
});

qrCodeSchema.index({ ownerId: 1 });
qrCodeSchema.index({ qrType: 1, isActive: 1 });

export const QRCode = mongoose.model('QRCode', qrCodeSchema);

// QR Scan Log
const qrScanLogSchema = new mongoose.Schema({
    id: { type: String, unique: true },
    qrId: { type: String, required: true },
    qrType: String,
    scannedBy: { type: String, required: true },
    scannedByName: String,
    action: {
        type: String,
        enum: ['VIEW', 'PAYMENT', 'BOOKING', 'VALIDATE', 'CHECKIN', 'NAVIGATE'],
        required: true
    },
    resultOrderId: String,          // If booking was created
    resultAmount: Number,           // If payment was made
    location: {
        lat: Number,
        lng: Number,
        address: String
    },
    deviceInfo: String,
    timestamp: { type: Date, default: Date.now }
});

qrScanLogSchema.index({ qrId: 1 });
qrScanLogSchema.index({ scannedBy: 1, timestamp: -1 });

export const QRScanLog = mongoose.model('QRScanLog', qrScanLogSchema);

// ==================== SUPPLY CHAIN ====================

// Supply Listing - Products from Farmers/Vendors
const supplyListingSchema = new mongoose.Schema({
    id: { type: String, unique: true },
    sellerId: { type: String, required: true },
    sellerName: String,
    sellerPhone: String,
    sellerType: {
        type: String,
        enum: ['FARMER', 'VENDOR', 'IMPORTER', 'WHOLESALER'],
        required: true
    },

    // Product Details
    productType: {
        type: String,
        enum: ['VEGETABLE', 'FRUIT', 'GRAIN', 'DAIRY', 'POULTRY', 'SPICE', 'OTHER'],
        required: true
    },
    productName: { type: String, required: true },
    variety: String,                              // e.g., "Desi Tomato"
    grade: { type: String, enum: ['A', 'B', 'C', 'PREMIUM'] },

    // Quantity & Pricing
    quantity: { type: Number, required: true },
    unit: {
        type: String,
        enum: ['KG', 'QUINTAL', 'TON', 'PIECE', 'DOZEN', 'LITRE', 'BUNDLE'],
        default: 'KG'
    },
    pricePerUnit: { type: Number, required: true },
    minOrderQuantity: { type: Number, default: 1 },
    maxOrderQuantity: Number,

    // Location
    location: {
        village: String,
        district: String,
        state: String,
        pincode: String,
        lat: Number,
        lng: Number
    },

    // Quality & Certification
    harvestDate: Date,
    expiryDate: Date,
    organic: { type: Boolean, default: false },
    certifications: [String],                     // ['FSSAI', 'ORGANIC', 'GAP']
    photos: [String],

    // Delivery Options
    deliveryOptions: [{
        type: { type: String, enum: ['PICKUP', 'SELLER_DELIVERY', 'TRANSPORT_LINK'] },
        available: Boolean,
        additionalCost: Number
    }],

    // Status
    status: {
        type: String,
        enum: ['DRAFT', 'ACTIVE', 'RESERVED', 'SOLD', 'EXPIRED', 'CANCELLED'],
        default: 'ACTIVE'
    },
    reservedQuantity: { type: Number, default: 0 },
    soldQuantity: { type: Number, default: 0 },

    // Engagement
    viewCount: { type: Number, default: 0 },
    inquiryCount: { type: Number, default: 0 },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

supplyListingSchema.index({ sellerId: 1 });
supplyListingSchema.index({ productType: 1, status: 1 });
supplyListingSchema.index({ 'location.district': 1 });
supplyListingSchema.index({ sellerType: 1 });

export const SupplyListing = mongoose.model('SupplyListing', supplyListingSchema);

// Supply Bid - Price negotiations
const supplyBidSchema = new mongoose.Schema({
    id: { type: String, unique: true },
    listingId: { type: String, required: true },
    sellerId: String,

    // Buyer Details
    buyerId: { type: String, required: true },
    buyerName: String,
    buyerPhone: String,
    buyerType: {
        type: String,
        enum: ['RETAILER', 'VENDOR', 'MESS', 'CUSTOMER', 'RESTAURANT'],
        required: true
    },

    // Bid Details
    quantity: { type: Number, required: true },
    offeredPrice: { type: Number, required: true },  // Per unit
    totalAmount: Number,
    message: String,

    // Counter Offer
    counterPrice: Number,
    counterMessage: String,

    // Delivery Preference
    deliveryPreference: {
        type: { type: String, enum: ['PICKUP', 'DELIVERY', 'TRANSPORT_LINK'] },
        address: String,
        lat: Number,
        lng: Number,
        preferredDate: Date
    },

    // Status
    status: {
        type: String,
        enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'COUNTERED', 'EXPIRED', 'WITHDRAWN'],
        default: 'PENDING'
    },
    expiresAt: Date,

    respondedAt: Date,
    createdAt: { type: Date, default: Date.now }
});

supplyBidSchema.index({ listingId: 1, status: 1 });
supplyBidSchema.index({ buyerId: 1 });
supplyBidSchema.index({ sellerId: 1 });

export const SupplyBid = mongoose.model('SupplyBid', supplyBidSchema);

// Supply Order - Confirmed transactions
const supplyOrderSchema = new mongoose.Schema({
    id: { type: String, unique: true },

    // Parties
    sellerId: { type: String, required: true },
    sellerName: String,
    sellerPhone: String,
    buyerId: { type: String, required: true },
    buyerName: String,
    buyerPhone: String,

    // Source
    listingId: String,
    bidId: String,

    // Items
    items: [{
        productName: String,
        variety: String,
        quantity: Number,
        unit: String,
        pricePerUnit: Number,
        subtotal: Number
    }],

    // Pricing
    subtotal: Number,
    deliveryCost: Number,
    platformFee: Number,
    totalAmount: { type: Number, required: true },

    // Delivery
    deliveryMethod: {
        type: String,
        enum: ['SELF_PICKUP', 'SELLER_DELIVERY', 'TRANSPORT_LINK'],
        required: true
    },
    pickupLocation: {
        address: String,
        lat: Number,
        lng: Number
    },
    deliveryLocation: {
        address: String,
        lat: Number,
        lng: Number
    },
    deliveryDistance: Number,  // km

    // Transport Link Integration
    cargoRequestId: String,    // Links to CargoRequest when TRANSPORT_LINK
    driverId: String,
    driverName: String,
    estimatedDeliveryTime: Date,

    // OTPs
    pickupOTP: String,
    deliveryOTP: String,

    // Status
    status: {
        type: String,
        enum: ['PLACED', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED', 'DISPUTED'],
        default: 'PLACED'
    },

    // Payment
    paymentStatus: {
        type: String,
        enum: ['PENDING', 'PARTIAL', 'PAID', 'REFUNDED'],
        default: 'PENDING'
    },
    paymentMethod: String,
    transactionId: String,

    // Timestamps
    confirmedAt: Date,
    pickedUpAt: Date,
    deliveredAt: Date,
    cancelledAt: Date,
    createdAt: { type: Date, default: Date.now }
});

supplyOrderSchema.index({ sellerId: 1, status: 1 });
supplyOrderSchema.index({ buyerId: 1, status: 1 });
supplyOrderSchema.index({ cargoRequestId: 1 });

export const SupplyOrder = mongoose.model('SupplyOrder', supplyOrderSchema);

// Route Capacity - Driver's available cargo space
const routeCapacitySchema = new mongoose.Schema({
    id: { type: String, unique: true },
    driverId: { type: String, required: true },
    driverName: String,
    driverPhone: String,
    vehicleType: String,
    vehicleNumber: String,

    // Route
    route: {
        from: { name: String, lat: Number, lng: Number },
        to: { name: String, lat: Number, lng: Number },
        stops: [{ name: String, lat: Number, lng: Number, estimatedTime: Date }],
        departureTime: Date,
        estimatedArrival: Date,
        distanceKm: Number
    },

    // Capacity
    totalCapacity: {
        weightKg: Number,
        volumeLiters: Number,
        seats: Number            // For passengers
    },
    availableCapacity: {
        weightKg: Number,
        volumeLiters: Number,
        seats: Number
    },

    // Preferences
    acceptedCargoTypes: [{
        type: String,
        enum: ['PRODUCE', 'GOODS', 'FOOD', 'FRAGILE', 'DOCUMENTS', 'ANY']
    }],
    pricePerKg: Number,
    pricePerKm: Number,

    // Status
    status: {
        type: String,
        enum: ['SCHEDULED', 'AVAILABLE', 'PARTIAL', 'FULL', 'DEPARTED', 'COMPLETED', 'CANCELLED'],
        default: 'SCHEDULED'
    },

    // Matched Cargo
    acceptedCargos: [{
        cargoId: String,
        supplyOrderId: String,
        weightKg: Number,
        pickupStop: String,
        dropoffStop: String,
        earnings: Number
    }],

    createdAt: { type: Date, default: Date.now }
});

routeCapacitySchema.index({ driverId: 1 });
routeCapacitySchema.index({ status: 1, 'route.departureTime': 1 });

export const RouteCapacity = mongoose.model('RouteCapacity', routeCapacitySchema);

// ==================== REELS ====================

const reelSchema = new mongoose.Schema({
    id: { type: String, unique: true },
    creatorId: { type: String, required: true },
    creatorName: String,
    creatorAvatar: String,
    creatorType: {
        type: String,
        enum: ['SHOP', 'FARMER', 'VENDOR', 'MESS', 'RESTAURANT', 'USER'],
        required: true
    },
    shopId: String,              // If posted by a shop

    // Media
    videoUrl: { type: String, required: true },
    thumbnailUrl: String,
    duration: Number,            // seconds
    aspectRatio: String,         // "9:16"

    // Content
    caption: String,
    hashtags: [String],

    // Music
    musicId: String,
    musicTitle: String,
    musicArtist: String,

    // Location
    locationTag: {
        name: String,
        lat: Number,
        lng: Number
    },

    // Product Tags (tap to buy)
    productTags: [{
        productId: String,
        productName: String,
        price: Number,
        xPercent: Number,          // Position on video (0-100)
        yPercent: Number
    }],

    // Engagement
    viewCount: { type: Number, default: 0 },
    likeCount: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },
    shareCount: { type: Number, default: 0 },
    saveCount: { type: Number, default: 0 },

    // Promotion
    isPromoted: { type: Boolean, default: false },
    promotionBudget: Number,
    promotionReach: Number,

    // Status
    status: {
        type: String,
        enum: ['PROCESSING', 'ACTIVE', 'HIDDEN', 'REMOVED', 'REPORTED'],
        default: 'PROCESSING'
    },

    createdAt: { type: Date, default: Date.now }
});

reelSchema.index({ creatorId: 1 });
reelSchema.index({ status: 1, createdAt: -1 });
reelSchema.index({ hashtags: 1 });
reelSchema.index({ shopId: 1 });

export const Reel = mongoose.model('Reel', reelSchema);

// Reel Interactions
const reelInteractionSchema = new mongoose.Schema({
    id: { type: String, unique: true },
    reelId: { type: String, required: true },
    userId: { type: String, required: true },

    type: {
        type: String,
        enum: ['VIEW', 'LIKE', 'UNLIKE', 'COMMENT', 'SHARE', 'SAVE', 'UNSAVE', 'REPORT'],
        required: true
    },

    // For comments
    comment: String,
    replyToCommentId: String,

    // For views
    watchDuration: Number,       // seconds watched
    watchPercent: Number,        // 0-100

    // For reports
    reportReason: String,

    timestamp: { type: Date, default: Date.now }
});

reelInteractionSchema.index({ reelId: 1, type: 1 });
reelInteractionSchema.index({ userId: 1, type: 1 });
reelInteractionSchema.index({ reelId: 1, userId: 1, type: 1 });

export const ReelInteraction = mongoose.model('ReelInteraction', reelInteractionSchema);

// ==================== CHAT ====================

const conversationSchema = new mongoose.Schema({
    id: { type: String, unique: true },

    // Participants
    participants: [{
        userId: String,
        name: String,
        avatar: String,
        role: String,              // 'BUYER', 'SELLER', 'DRIVER', etc.
        joinedAt: Date,
        lastReadAt: Date
    }],

    type: {
        type: String,
        enum: ['DIRECT', 'GROUP', 'ORDER_CHAT', 'SUPPORT'],
        default: 'DIRECT'
    },

    // For order-specific chats
    orderId: String,
    orderType: String,           // 'SUPPLY', 'FOOD', 'TICKET', 'CARGO'

    // Last Message Preview
    lastMessage: {
        text: String,
        senderId: String,
        senderName: String,
        type: String,
        timestamp: Date
    },

    // Unread counts per user
    unreadCount: {
        type: Map,
        of: Number,
        default: {}
    },

    // Status
    isActive: { type: Boolean, default: true },
    isPinned: { type: Boolean, default: false },
    isMuted: { type: Boolean, default: false },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

conversationSchema.index({ 'participants.userId': 1 });
conversationSchema.index({ orderId: 1 });
conversationSchema.index({ updatedAt: -1 });

export const Conversation = mongoose.model('Conversation', conversationSchema);

// Messages
const messageSchema = new mongoose.Schema({
    id: { type: String, unique: true },
    conversationId: { type: String, required: true },

    // Sender
    senderId: { type: String, required: true },
    senderName: String,
    senderAvatar: String,

    // Content
    type: {
        type: String,
        enum: ['TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'LOCATION', 'PRODUCT', 'ORDER', 'PAYMENT', 'VOICE_NOTE', 'DOCUMENT'],
        default: 'TEXT'
    },
    content: String,              // Text content

    // Media
    mediaUrl: String,
    mediaThumbnail: String,
    mediaDuration: Number,        // For audio/video

    // For product shares
    productData: {
        productId: String,
        name: String,
        price: Number,
        image: String
    },

    // For location shares
    locationData: {
        lat: Number,
        lng: Number,
        address: String,
        name: String
    },

    // For order shares
    orderData: {
        orderId: String,
        orderType: String,
        status: String,
        amount: Number
    },

    // Reply
    replyToMessageId: String,
    replyToContent: String,

    // Read status
    readBy: [{
        userId: String,
        readAt: Date
    }],

    // Delivery status
    status: {
        type: String,
        enum: ['SENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED'],
        default: 'SENDING'
    },

    // Reactions
    reactions: [{
        userId: String,
        emoji: String,
        timestamp: Date
    }],

    // Flags
    isDeleted: { type: Boolean, default: false },
    isEdited: { type: Boolean, default: false },
    editedAt: Date,

    timestamp: { type: Date, default: Date.now }
});

messageSchema.index({ conversationId: 1, timestamp: -1 });
messageSchema.index({ senderId: 1 });

export const Message = mongoose.model('Message', messageSchema);

// ==================== USER EXTENSION FOR MULTI-ROLE ====================

// This will be used to extend the existing User model
export const userExtensionFields = {
    // App Type
    appType: {
        type: String,
        enum: ['USER', 'PROVIDER', 'BOTH'],
        default: 'USER'
    },

    // Multiple Roles for Providers
    providerRoles: [{
        roleType: {
            type: String,
            enum: ['DRIVER', 'FARMER', 'VENDOR', 'RETAILER', 'MESS_OWNER', 'SHOPKEEPER', 'LOGISTICS', 'RESTAURANT_OWNER']
        },
        status: {
            type: String,
            enum: ['PENDING', 'VERIFIED', 'SUSPENDED', 'REJECTED'],
            default: 'PENDING'
        },
        documents: [{
            docType: String,
            url: String,
            verified: { type: Boolean, default: false },
            verifiedAt: Date,
            rejectionReason: String
        }],
        businessName: String,
        businessAddress: String,
        registeredAt: Date,
        verifiedAt: Date,
        verifiedBy: String
    }],

    // Currently Active Role
    activeRole: {
        type: String,
        enum: ['USER', 'DRIVER', 'FARMER', 'VENDOR', 'RETAILER', 'MESS_OWNER', 'SHOPKEEPER', 'LOGISTICS', 'RESTAURANT_OWNER'],
        default: 'USER'
    },

    // QR Codes owned by user
    qrCodes: [{
        qrId: String,
        type: String,
        name: String
    }],

    // Social
    followersCount: { type: Number, default: 0 },
    followingCount: { type: Number, default: 0 },
    reelsCount: { type: Number, default: 0 }
};

export default {
    TransportPricing,
    PriceAudit,
    QRCode,
    QRScanLog,
    SupplyListing,
    SupplyBid,
    SupplyOrder,
    RouteCapacity,
    Reel,
    ReelInteraction,
    Conversation,
    Message
};
