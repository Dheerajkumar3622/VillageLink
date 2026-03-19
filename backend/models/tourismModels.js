import mongoose from 'mongoose';

// ==================== TOURISM SPOT ====================
const tourismSpotSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true }, // Keeping for backwards compatibility with frontend mapping string IDs like 'ts_01'
    name: { type: String, required: true },
    type: { type: String, enum: ['Temple', 'Museum', 'Nature', 'Historic', 'Waterfall', 'Other'], required: true },
    location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], required: true } // [longitude, latitude]
    },
    images: [{ type: String }],
    description: { type: String },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Enable Geospatial Queries
tourismSpotSchema.index({ location: '2dsphere' });

export const TourismSpot = mongoose.model('TourismSpot', tourismSpotSchema);


// ==================== TOURISM PACKAGE ====================
const tourismPackageSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true }, // string ID like 'p_01'
    spotId: { type: mongoose.Schema.Types.ObjectId, ref: 'TourismSpot', required: true },
    spotStringId: { type: String }, // For easier mapping while migrating
    title: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    includes: [{ type: String }],
    vendorTypeRequired: { type: String, enum: ['CAB_DRIVER', 'EXPERT_GUIDE', 'TICKET_AGENT', 'CAB_PLUS_GUIDE', 'NONE'], default: 'NONE' },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

export const TourismPackage = mongoose.model('TourismPackage', tourismPackageSchema);


// ==================== GUIDE / VENDOR PROFILE ====================
const guideProfileSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    capabilities: [{ type: String, enum: ['CAB_DRIVER', 'EXPERT_GUIDE', 'TICKET_AGENT', 'CAB_PLUS_GUIDE'] }],
    languages: [{ type: String }],
    rating: { type: Number, default: 5.0 },
    totalTours: { type: Number, default: 0 },
    isOnline: { type: Boolean, default: false },
    currentLocation: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number] } // [longitude, latitude]
    },
    socketId: { type: String },
    walletBalance: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

guideProfileSchema.index({ currentLocation: '2dsphere' });

export const GuideProfile = mongoose.model('GuideProfile', guideProfileSchema);


// ==================== TOURISM BOOKING ====================
const tourismBookingSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // The tourist
    packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'TourismPackage', required: true },
    amount: { type: Number, required: true },
    
    // Status Flow
    paymentStatus: { type: String, enum: ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'], default: 'PENDING' },
    bookingStatus: { type: String, enum: ['INITIATED', 'SEARCHING_GUIDE', 'ACCEPTED', 'ONGOING', 'COMPLETED', 'CANCELLED'], default: 'INITIATED' },
    
    assignedGuideId: { type: mongoose.Schema.Types.ObjectId, ref: 'GuideProfile', default: null },
    
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    
    scheduledDate: { type: Date, required: true },
    tourOtp: { type: String, required: true }, // 4 digit code tourist gives to guide to start
    
    createdAt: { type: Date, default: Date.now },
    completedAt: { type: Date }
});

export const TourismBooking = mongoose.model('TourismBooking', tourismBookingSchema);
