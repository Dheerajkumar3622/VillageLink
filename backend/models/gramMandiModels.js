/**
 * GramMandi Database Models
 * Complete Food Ecosystem - Farmer to Consumer
 */

import mongoose from 'mongoose';

// ==================== DAIRY FARMER ====================
const DairyFarmerSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    userId: { type: String, required: true }, // Link to main User
    name: String,
    phone: String,
    aadhaar: String,
    cattle: {
        cows: { type: Number, default: 0 },
        buffaloes: { type: Number, default: 0 }
    },
    location: {
        village: String,
        block: String,
        district: String,
        state: { type: String, default: 'Bihar' },
        pincode: String,
        coordinates: { lat: Number, lng: Number }
    },
    bankDetails: {
        accountNo: String,
        ifsc: String,
        bankName: String,
        upiId: String
    },
    collectionCenterId: String,
    status: { type: String, enum: ['PENDING', 'VERIFIED', 'SUSPENDED'], default: 'PENDING' },
    totalMilkSupplied: { type: Number, default: 0 }, // Liters
    totalEarnings: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
    createdAt: { type: Number, default: Date.now }
});

// ==================== MILK COLLECTION ====================
const MilkCollectionSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    farmerId: { type: String, required: true },
    centerId: String,
    date: { type: Date, default: Date.now },
    session: { type: String, enum: ['MORNING', 'EVENING'], required: true },
    quantity: { type: Number, required: true }, // Liters
    fatPercent: { type: Number, required: true },
    snfPercent: { type: Number, required: true },
    rate: { type: Number, required: true }, // Calculated ₹/Liter
    amount: { type: Number, required: true },
    collectedBy: String, // Operator userId
    status: { type: String, enum: ['COLLECTED', 'PROCESSED', 'PAID'], default: 'COLLECTED' },
    paymentRef: String,
    paymentDate: Number
});

// ==================== COLLECTION CENTER ====================
const CollectionCenterSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: String,
    village: String,
    block: String,
    district: String,
    managerId: String, // userId of manager
    hasChiller: { type: Boolean, default: false },
    capacity: { type: Number, default: 500 }, // Liters
    coordinates: { lat: Number, lng: Number },
    operatingHours: { open: String, close: String },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    totalFarmers: { type: Number, default: 0 },
    createdAt: { type: Number, default: Date.now }
});

// ==================== PRODUCE LISTING (Vegetables, Grains, etc.) ====================
const ProduceListingSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    farmerId: { type: String, required: true },
    farmerName: String,
    farmerPhone: String,
    category: { type: String, enum: ['VEGETABLE', 'FRUIT', 'GRAIN', 'DAIRY', 'SPICE', 'OTHER'], required: true },
    crop: { type: String, required: true }, // 'Onion', 'Tomato', 'Wheat', etc.
    variety: String, // 'Red Onion', 'Desi Tomato'
    grade: { type: String, enum: ['A', 'B', 'C'], default: 'B' },
    quantity: { type: Number, required: true },
    unit: { type: String, enum: ['KG', 'QUINTAL', 'TON', 'DOZEN', 'LITER'], default: 'KG' },
    pricePerUnit: { type: Number, required: true },
    minOrderQty: { type: Number, default: 1 },
    harvestDate: Date,
    shelfLife: { type: Number, default: 7 }, // Days
    availableUntil: Date,
    photos: [String],
    location: {
        village: String,
        block: String,
        district: String,
        pincode: String,
        coordinates: { lat: Number, lng: Number }
    },
    pickupType: { type: String, enum: ['FARM_PICKUP', 'COLLECTION_CENTER', 'SELF_DELIVERY'], default: 'FARM_PICKUP' },
    organic: { type: Boolean, default: false },
    status: { type: String, enum: ['ACTIVE', 'RESERVED', 'SOLD', 'EXPIRED'], default: 'ACTIVE' },
    views: { type: Number, default: 0 },
    orderCount: { type: Number, default: 0 },
    featured: { type: Boolean, default: false },
    createdAt: { type: Number, default: Date.now },
    updatedAt: { type: Number, default: Date.now }
});

// ==================== PRODUCE ORDER ====================
const ProduceOrderSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    buyerId: { type: String, required: true },
    buyerName: String,
    buyerPhone: String,
    buyerType: { type: String, enum: ['CONSUMER', 'RETAILER', 'RESTAURANT', 'WHOLESALER', 'PROCESSOR'], required: true },
    items: [{
        listingId: String,
        farmerId: String,
        farmerName: String,
        crop: String,
        quantity: Number,
        unit: String,
        pricePerUnit: Number,
        totalPrice: Number
    }],
    subtotal: { type: Number, required: true },
    deliveryCharge: { type: Number, default: 0 },
    platformFee: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    deliveryType: { type: String, enum: ['PICKUP', 'HOME_DELIVERY', 'COLLECTION_CENTER'], default: 'HOME_DELIVERY' },
    deliveryAddress: {
        line1: String,
        line2: String,
        city: String,
        pincode: String,
        coordinates: { lat: Number, lng: Number }
    },
    preferredDate: Date,
    preferredSlot: String, // 'MORNING', 'AFTERNOON', 'EVENING'
    status: {
        type: String,
        enum: ['PLACED', 'CONFIRMED', 'PICKING', 'PICKED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURNED'],
        default: 'PLACED'
    },
    paymentMethod: { type: String, enum: ['COD', 'UPI', 'WALLET', 'CREDIT'], default: 'COD' },
    paymentStatus: { type: String, enum: ['PENDING', 'PARTIAL', 'PAID', 'REFUNDED'], default: 'PENDING' },
    paymentRef: String,
    logisticsId: String, // Assigned trip
    driverId: String,
    pickupOtp: String,
    deliveryOtp: String,
    rating: Number,
    review: String,
    cancelReason: String,
    createdAt: { type: Number, default: Date.now },
    updatedAt: { type: Number, default: Date.now },
    deliveredAt: Number
});

// ==================== COLD STORAGE FACILITY ====================
const ColdStorageFacilitySchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    operatorId: { type: String, required: true }, // userId
    name: String,
    type: { type: String, enum: ['COLD_STORAGE', 'WAREHOUSE', 'RIPENING_CHAMBER', 'PACK_HOUSE'], default: 'COLD_STORAGE' },
    location: {
        address: String,
        city: String,
        district: String,
        pincode: String,
        coordinates: { lat: Number, lng: Number }
    },
    capacity: { type: Number, required: true }, // Tons
    availableCapacity: { type: Number, required: true },
    temperatureRange: { min: Number, max: Number }, // Celsius
    acceptedProduce: [String], // ['Potato', 'Onion', 'Apple']
    ratePerDay: { type: Number, required: true }, // ₹ per quintal per day
    ratePerMonth: Number,
    amenities: [String], // ['24x7 Security', 'CCTV', 'Insurance']
    photos: [String],
    rating: { type: Number, default: 0 },
    totalBookings: { type: Number, default: 0 },
    status: { type: String, enum: ['ACTIVE', 'FULL', 'MAINTENANCE', 'INACTIVE'], default: 'ACTIVE' },
    createdAt: { type: Number, default: Date.now }
});

// ==================== COLD STORAGE BOOKING ====================
const StorageBookingSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    facilityId: { type: String, required: true },
    facilityName: String,
    userId: { type: String, required: true }, // Farmer or Vendor
    userName: String,
    produce: String,
    quantity: { type: Number, required: true }, // Quintals
    inDate: { type: Date, required: true },
    expectedOutDate: Date,
    actualOutDate: Date,
    ratePerDay: Number,
    totalDays: Number,
    totalAmount: Number,
    status: { type: String, enum: ['BOOKED', 'STORED', 'PARTIAL_WITHDRAWN', 'WITHDRAWN', 'CANCELLED'], default: 'BOOKED' },
    paymentStatus: { type: String, enum: ['PENDING', 'PAID'], default: 'PENDING' },
    createdAt: { type: Number, default: Date.now }
});

// ==================== LOGISTICS TRIP ====================
const LogisticsTripSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    driverId: String,
    driverName: String,
    driverPhone: String,
    vehicleType: { type: String, enum: ['BIKE', 'AUTO', 'PICKUP', 'MINI_TRUCK', 'REEFER_TRUCK'], default: 'PICKUP' },
    vehicleNumber: String,
    isRefrigerated: { type: Boolean, default: false },
    pickups: [{
        farmerId: String,
        farmerName: String,
        location: { address: String, coordinates: { lat: Number, lng: Number } },
        orderId: String,
        items: [{ crop: String, quantity: Number }],
        scheduledTime: Date,
        actualTime: Date,
        status: { type: String, enum: ['PENDING', 'ARRIVED', 'LOADED', 'SKIPPED'], default: 'PENDING' },
        otp: String,
        photo: String
    }],
    deliveries: [{
        orderId: String,
        buyerId: String,
        buyerName: String,
        address: String,
        coordinates: { lat: Number, lng: Number },
        items: [{ crop: String, quantity: Number }],
        scheduledTime: Date,
        actualTime: Date,
        status: { type: String, enum: ['PENDING', 'ARRIVED', 'DELIVERED', 'FAILED'], default: 'PENDING' },
        otp: String,
        photo: String,
        signature: String
    }],
    totalDistance: Number, // KM
    estimatedDuration: Number, // Minutes
    route: [{ lat: Number, lng: Number }], // Polyline points
    currentLocation: { lat: Number, lng: Number },
    status: { type: String, enum: ['ASSIGNED', 'STARTED', 'PICKING', 'DELIVERING', 'COMPLETED', 'CANCELLED'], default: 'ASSIGNED' },
    startTime: Number,
    endTime: Number,
    earnings: Number,
    createdAt: { type: Number, default: Date.now }
});

// ==================== WHOLESALE BID ====================
const WholesaleBidSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    listingId: { type: String, required: true },
    farmerId: String,
    vendorId: { type: String, required: true },
    vendorName: String,
    bidQuantity: { type: Number, required: true },
    bidPricePerUnit: { type: Number, required: true },
    totalBidAmount: Number,
    message: String,
    status: { type: String, enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'WITHDRAWN'], default: 'PENDING' },
    expiresAt: Number,
    acceptedAt: Number,
    createdAt: { type: Number, default: Date.now }
});

// ==================== SUBSCRIPTION BOX ====================
const SubscriptionBoxSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    userId: { type: String, required: true },
    userName: String,
    planType: { type: String, enum: ['WEEKLY', 'BIWEEKLY', 'MONTHLY'], required: true },
    boxType: { type: String, enum: ['VEG_ONLY', 'FRUIT_ONLY', 'MIXED', 'ORGANIC'], default: 'MIXED' },
    budget: { type: Number, required: true }, // ₹ per delivery
    preferences: {
        mustInclude: [String], // Crops they always want
        exclude: [String], // Allergies or dislikes
        familySize: Number
    },
    deliveryAddress: {
        line1: String,
        city: String,
        pincode: String
    },
    preferredDay: { type: String, enum: ['MONDAY', 'WEDNESDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] },
    status: { type: String, enum: ['ACTIVE', 'PAUSED', 'CANCELLED'], default: 'ACTIVE' },
    nextDelivery: Date,
    totalDeliveries: { type: Number, default: 0 },
    createdAt: { type: Number, default: Date.now }
});

// ==================== MARKET PRICE ====================
const MarketPriceSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    crop: { type: String, required: true },
    market: String, // 'Patna Mandi', 'Rohtas Mandi'
    state: { type: String, default: 'Bihar' },
    date: { type: Date, required: true },
    minPrice: Number,
    maxPrice: Number,
    modalPrice: Number, // Most common price
    unit: { type: String, default: 'QUINTAL' },
    arrivals: Number, // Quantity arrived
    source: String, // 'AGMARKNET', 'MANUAL'
    createdAt: { type: Number, default: Date.now }
});

// ==================== GROUP BUY ====================
const GroupBuySchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    listingId: String,
    crop: String,
    targetQuantity: { type: Number, required: true },
    currentQuantity: { type: Number, default: 0 },
    pricePerUnit: Number,
    discountPercent: { type: Number, default: 10 },
    participants: [{
        userId: String,
        userName: String,
        quantity: Number,
        joinedAt: Number
    }],
    deliveryArea: String, // Pincode or area name
    deadline: Date,
    status: { type: String, enum: ['OPEN', 'FILLED', 'CONFIRMED', 'DELIVERED', 'CANCELLED'], default: 'OPEN' },
    createdAt: { type: Number, default: Date.now }
});

// Create models
export const DairyFarmer = mongoose.model('DairyFarmer', DairyFarmerSchema);
export const MilkCollection = mongoose.model('MilkCollection', MilkCollectionSchema);
export const CollectionCenter = mongoose.model('CollectionCenter', CollectionCenterSchema);
export const ProduceListing = mongoose.model('ProduceListing', ProduceListingSchema);
export const ProduceOrder = mongoose.model('ProduceOrder', ProduceOrderSchema);
export const ColdStorageFacility = mongoose.model('ColdStorageFacility', ColdStorageFacilitySchema);
export const StorageBooking = mongoose.model('StorageBooking', StorageBookingSchema);
export const LogisticsTrip = mongoose.model('LogisticsTrip', LogisticsTripSchema);
export const WholesaleBid = mongoose.model('WholesaleBid', WholesaleBidSchema);
export const SubscriptionBox = mongoose.model('SubscriptionBox', SubscriptionBoxSchema);
export const MarketPrice = mongoose.model('MarketPrice', MarketPriceSchema);
export const GroupBuy = mongoose.model('GroupBuy', GroupBuySchema);

export default {
    DairyFarmer,
    MilkCollection,
    CollectionCenter,
    ProduceListing,
    ProduceOrder,
    ColdStorageFacility,
    StorageBooking,
    LogisticsTrip,
    WholesaleBid,
    SubscriptionBox,
    MarketPrice,
    GroupBuy
};
