
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['PASSENGER', 'DRIVER', 'ADMIN', 'SHOPKEEPER', 'MESS_MANAGER', 'FOOD_VENDOR'], default: 'PASSENGER' },
  password: { type: String, required: true },
  email: String,
  phone: String,
  isCharterAvailable: { type: Boolean, default: false },
  walletBalance: { type: Number, default: 0 },
  did: String,
  isVerified: { type: Boolean, default: false },
  isBanned: { type: Boolean, default: false },
  referralCode: String,
  referredBy: String,
  creditLimit: { type: Number, default: 500 },
  creditUsed: { type: Number, default: 0 },
  // Mess Manager / Shopkeeper Fields
  address: String,
  pincode: String,
  // OTP Fields for Recovery
  resetOTP: String,
  resetOTPExpiry: Number,
  // Keypad Phone Support (v18.0)
  connectionType: { type: String, enum: ['APP', 'SMS', 'USSD', 'IVR'], default: 'APP' },
  smsSessionState: { type: String },
  lastCommandTimestamp: { type: Number },
  preferredLanguage: { type: String, enum: ['EN', 'HI', 'LOCAL'], default: 'HI' }
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  if (this.password.startsWith('$2a$') || this.password.startsWith('$2b$')) {
    return next();
  }

  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  const isHashed = this.password.startsWith('$2a$') || this.password.startsWith('$2b$');

  if (!isHashed) {
    if (this.password === candidatePassword) {
      this.password = await bcrypt.hash(candidatePassword, 10);
      await this.save();
      return true;
    }
    return false;
  }

  return await bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model('User', userSchema);

const locationSchema = new mongoose.Schema({
  name: String,
  code: String,
  district: String,
  geometry: {
    type: { type: String, enum: ['Point', 'Polygon', 'MultiPolygon'], required: true },
    coordinates: { type: mongoose.Schema.Types.Mixed, required: true }
  },
  properties: mongoose.Schema.Types.Mixed
}, {
  strict: false,
  collection: 'villages'
});

locationSchema.index({ geometry: '2dsphere' });
locationSchema.index({ name: 'text' });

export const Location = mongoose.model('Location', locationSchema);

export const Transaction = mongoose.model('Transaction', new mongoose.Schema({
  id: { type: String, unique: true },
  userId: String,
  amount: Number,
  type: { type: String, enum: ['CREDIT', 'DEBIT', 'EARN', 'SPEND'] },
  description: String,
  desc: String, // Keeping for backward compatibility
  timestamp: { type: Number, default: Date.now },
  status: { type: String, enum: ['PENDING', 'COMPLETED', 'FAILED'], default: 'COMPLETED' },
  blockchainHash: String,
  relatedEntityId: String
}));

export const Ticket = mongoose.model('Ticket', new mongoose.Schema({
  id: { type: String, unique: true },
  userId: String,
  driverId: String,
  from: String,
  to: String,
  fromDetails: String,
  toDetails: String,
  status: { type: String, default: 'PENDING' },
  paymentMethod: String,
  timestamp: Number,
  passengerCount: Number,
  totalPrice: Number,
  routePath: [String],
  digitalSignature: String,
  giftedBy: String,
  recipientPhone: String,
  transactionId: String
}));

export const Pass = mongoose.model('Pass', new mongoose.Schema({
  id: { type: String, unique: true },
  userId: String,
  userName: String,
  from: String,
  to: String,
  type: String,
  seatConfig: String,
  validityDays: Number,
  usedDates: [String],
  purchaseDate: Number,
  expiryDate: Number,
  price: Number,
  status: String,
  nftTokenId: String,
  giftedBy: String,
  transactionId: String
}));

export const RentalBooking = mongoose.model('RentalBooking', new mongoose.Schema({
  id: { type: String, unique: true },
  userId: String,
  userName: String,
  vehicleType: String,
  from: String,
  to: String,
  tripType: String,
  date: String,
  distanceKm: Number,
  totalFare: Number,
  status: String,
  driverId: String,
  bidAmount: Number,
  transactionId: String
}));

const trackingEventSchema = new mongoose.Schema({
  status: String,
  location: String,
  timestamp: Number,
  handlerId: String,
  description: String
});

export const Parcel = mongoose.model('Parcel', new mongoose.Schema({
  id: { type: String, unique: true },
  userId: String,
  from: String,
  to: String,
  itemType: String,
  weightKg: Number,
  price: Number,
  status: String,
  timestamp: Number,
  blockchainHash: String,
  trackingEvents: [trackingEventSchema],
  transactionId: String
}));

export const RoadReport = mongoose.model('RoadReport', new mongoose.Schema({
  id: { type: String, unique: true },
  userId: String,
  type: { type: String, enum: ['ACCIDENT', 'TRAFFIC', 'POLICE_CHECK', 'POTHOLE'] },
  location: String,
  timestamp: Number,
  upvotes: { type: Number, default: 0 }
}));

export const Route = mongoose.model('Route', new mongoose.Schema({
  id: { type: String, unique: true },
  name: String,
  from: String,
  to: String,
  stops: [String],
  totalDistance: Number
}));

export const Block = mongoose.model('Block', new mongoose.Schema({
  index: Number,
  timestamp: Number,
  data: mongoose.Schema.Types.Mixed,
  previousHash: String,
  hash: String,
  validator: String
}));

export const Job = mongoose.model('Job', new mongoose.Schema({
  id: String,
  title: String,
  location: String,
  wage: String,
  contact: String,
  type: String
}));

export const MarketItem = mongoose.model('MarketItem', new mongoose.Schema({
  id: String,
  name: String,
  price: Number,
  unit: String,
  supplier: String,
  inStock: Boolean,
  type: String,
  properties: mongoose.Schema.Types.Mixed
}));

export const NewsItem = mongoose.model('NewsItem', new mongoose.Schema({
  id: String,
  title: String,
  summary: String,
  location: String,
  timestamp: Number,
  videoUrl: String
}));

export const BugReport = mongoose.model('BugReport', new mongoose.Schema({
  userId: String,
  message: String,
  stackTrace: String,
  componentStack: String,
  timestamp: { type: Number, default: Date.now },
  userAgent: String,
  resolved: { type: Boolean, default: false }
}));

export const SystemSetting = mongoose.model('SystemSetting', new mongoose.Schema({
  key: { type: String, unique: true },
  value: mongoose.Schema.Types.Mixed,
  updatedBy: String,
  updatedAt: { type: Number, default: Date.now }
}));

export const Shop = mongoose.model('Shop', new mongoose.Schema({
  id: { type: String, unique: true },
  ownerId: String,
  name: String,
  category: String,
  location: String,
  rating: Number,
  isOpen: Boolean,
  themeColor: String,
  hasBatterySwap: Boolean,
  isTeleMedPoint: Boolean,
  pincode: String
}));

export const Product = mongoose.model('Product', new mongoose.Schema({
  id: { type: String, unique: true },
  shopId: String,
  name: String,
  price: Number,
  unit: String,
  image: String,
  available: Boolean,
  description: String
}));

export const ActivityLog = mongoose.model('ActivityLog', new mongoose.Schema({
  userId: String,
  action: String,
  details: mongoose.Schema.Types.Mixed,
  timestamp: { type: Number, default: Date.now },
  ipAddress: String
}));

export const TripLog = mongoose.model('TripLog', new mongoose.Schema({
  routeStart: String,
  routeEnd: String,
  actualDurationMin: Number,
  predictedDurationMin: Number,
  userRating: Number,
  deviationsDetected: Boolean,
  timestamp: { type: Number, default: Date.now }
}));

// --- FOOD / MESS SECTION MODELS ---

export const FoodItem = mongoose.model('FoodItem', new mongoose.Schema({
  id: { type: String, unique: true },
  messId: String,
  name: String,
  price: Number,
  type: { type: String, enum: ['VEG', 'NON_VEG', 'EGG'] },
  category: { type: String, enum: ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACKS'] },
  available: { type: Boolean, default: true },
  description: String,
  image: String, // URL or base64
  nutritionalInfo: String
}));

export const FoodBooking = mongoose.model('FoodBooking', new mongoose.Schema({
  id: { type: String, unique: true },
  userId: String,
  messId: String,
  items: [{
    itemId: String,
    name: String,
    price: Number,
    quantity: Number
  }],
  totalAmount: Number,
  status: { type: String, enum: ['PENDING', 'PAID', 'REDEEMED', 'CANCELLED'], default: 'PENDING' },
  paymentMethod: String,
  token: String, // Unique Booking Token (e.g., 6-digit alphanumeric)
  qrCode: String, // Could be same as token or separate
  bookingTime: { type: Number, default: Date.now },
  mealTime: { type: String, enum: ['LUNCH', 'DINNER', 'BREAKFAST'] },
  scheduledDate: String, // YYYY-MM-DD
  transactionId: String
}));

export const FoodSubscription = mongoose.model('FoodSubscription', new mongoose.Schema({
  id: { type: String, unique: true },
  userId: String,
  messId: String,
  planName: String, // e.g., "Monthly Unlimited"
  type: { type: String, enum: ['WEEKLY', 'MONTHLY'] },
  startDate: Number,
  endDate: Number,
  price: Number,
  status: { type: String, enum: ['ACTIVE', 'EXPIRED'] },
  mealsRemaining: Number, // For limited plans
  description: String,
  transactionId: String
}));

export const MessStats = mongoose.model('MessStats', new mongoose.Schema({
  messId: { type: String, unique: true },
  dailyFootfall: { type: Map, of: Number }, // "2023-10-27": 50
  popularItems: { type: Map, of: Number }, // "ItemId": count
  lastUpdated: { type: Number, default: Date.now }
}));

export const SMSLog = mongoose.model('SMSLog', new mongoose.Schema({
  id: { type: String, unique: true },
  driverId: String,
  direction: { type: String, enum: ['INCOMING', 'OUTGOING'] },
  phoneNumber: String,
  message: String,
  command: String,
  status: { type: String, enum: ['SENT', 'DELIVERED', 'FAILED', 'RECEIVED'], default: 'RECEIVED' },
  timestamp: { type: Number, default: Date.now }
}));

// --- REAL-TIME TRACKING MODELS (Route Allocation v1.0) ---

const driverLocationSchema = new mongoose.Schema({
  driverId: { type: String, required: true, unique: true },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true } // [lng, lat]
  },
  speed: { type: Number, default: 0 },           // km/h
  heading: { type: Number, default: 0 },         // degrees (0-360)
  accuracy: { type: Number, default: 100 },      // meters
  source: { type: String, enum: ['GPS', 'CELL_TOWER', 'IP_GEOLOCATION'], default: 'GPS' },
  isOnline: { type: Boolean, default: false },
  currentTripId: { type: String, default: null },
  vehicleType: { type: String, default: 'BUS' },
  lastUpdated: { type: Date, default: Date.now }
});

driverLocationSchema.index({ location: '2dsphere' });
driverLocationSchema.index({ driverId: 1 });
driverLocationSchema.index({ isOnline: 1, currentTripId: 1 });

export const DriverLocation = mongoose.model('DriverLocation', driverLocationSchema);

// Road Segment for traffic sensing
const roadSegmentSchema = new mongoose.Schema({
  segmentId: { type: String, unique: true },
  geometry: {
    type: { type: String, enum: ['LineString'], default: 'LineString' },
    coordinates: [[Number]] // Array of [lng, lat] pairs
  },
  osmWayId: String,
  roadName: String,
  normalSpeed: { type: Number, default: 40 },    // Expected avg speed (km/h)
  currentSpeed: { type: Number, default: 40 },   // Live crowdsourced speed
  trafficLevel: { type: String, enum: ['FREE', 'MODERATE', 'HEAVY', 'BLOCKED'], default: 'FREE' },
  sampleCount: { type: Number, default: 0 },      // Number of drivers contributing data
  lastUpdated: { type: Date, default: Date.now }
});

roadSegmentSchema.index({ geometry: '2dsphere' });
roadSegmentSchema.index({ segmentId: 1 });

export const RoadSegment = mongoose.model('RoadSegment', roadSegmentSchema);

// Active Trip for real-time tracking
const activeTripSchema = new mongoose.Schema({
  tripId: { type: String, required: true, unique: true },
  ticketId: String,
  driverId: String,
  passengerId: String,
  pickupLocation: {
    name: String,
    lat: Number,
    lng: Number
  },
  dropoffLocation: {
    name: String,
    lat: Number,
    lng: Number
  },
  routePolyline: [[Number]],     // Array of [lat, lng] for the planned route
  currentEtaMinutes: Number,
  originalEtaMinutes: Number,
  distanceKm: Number,
  status: { type: String, enum: ['SEARCHING', 'DRIVER_ASSIGNED', 'EN_ROUTE_PICKUP', 'TRIP_ACTIVE', 'COMPLETED', 'CANCELLED'], default: 'SEARCHING' },
  startTime: { type: Date },
  endTime: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

activeTripSchema.index({ tripId: 1 });
activeTripSchema.index({ driverId: 1, status: 1 });
activeTripSchema.index({ passengerId: 1, status: 1 });

export const ActiveTrip = mongoose.model('ActiveTrip', activeTripSchema);

// --- FOODLINK V18.0: VENDOR & RESTAURANT ECOSYSTEM ---

// Food Vendor Schema
const foodVendorSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  userId: String,
  // Personal Details
  name: String,
  phone: String,
  aadharNumber: String,
  photo: String,
  // Stall Details
  stallName: String,
  stallCategory: { type: String, enum: ['STREET_FOOD', 'JUICE_STALL', 'CHAT_CORNER', 'TEA_STALL', 'FOOD_CART', 'DHABA'] },
  location: String,
  coordinates: { lat: Number, lng: Number },
  pincode: String,
  isMobile: { type: Boolean, default: false },
  operatingHours: { open: String, close: String },
  // Verification
  fssaiLicense: String,
  status: { type: String, enum: ['PENDING', 'VERIFIED', 'SUSPENDED', 'REJECTED', 'UNDER_REVIEW'], default: 'PENDING' },
  verificationRemarks: String,
  documents: [{
    docType: { type: String }, // e.g., 'AADHAR', 'FSSAI_LICENSE', 'STALL_PHOTO'
    url: String,
    verified: { type: Boolean, default: false }
  }],
  verifiedAt: Date,
  verifiedBy: String,
  badges: [String],
  // Bank/Payment
  bankAccountNumber: String,
  ifscCode: String,
  upiId: String,
  // Stats
  rating: { type: Number, default: 0 },
  totalOrders: { type: Number, default: 0 },
  isOpen: { type: Boolean, default: false },
  isPureVeg: { type: Boolean, default: false },
  specialties: [String],
  images: [String],
  description: String,
  createdAt: { type: Number, default: Date.now }
});

foodVendorSchema.index({ 'coordinates': '2dsphere' });
foodVendorSchema.index({ status: 1, isOpen: 1 });

export const FoodVendor = mongoose.model('FoodVendor', foodVendorSchema);

// Restaurant Schema (for larger establishments)
const restaurantSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  ownerId: String,
  name: String,
  category: { type: String, enum: ['DHABA', 'MESS', 'FAST_FOOD', 'RESTAURANT', 'CAFE', 'STREET_STALL', 'FINE_DINING'] },
  budgetTier: { type: String, enum: ['BUDGET', 'MID_RANGE', 'PREMIUM', 'LUXURY'] },
  starRating: { type: Number, min: 1, max: 5, default: 3 },
  cuisines: [String],
  location: String,
  coordinates: { lat: Number, lng: Number },
  pincode: String,
  isOpen: { type: Boolean, default: true },
  openingTime: String,
  closingTime: String,
  avgCostForTwo: Number,
  hasTableBooking: { type: Boolean, default: false },
  hasParcel: { type: Boolean, default: true },
  hasSubscription: { type: Boolean, default: false },
  isPureVeg: { type: Boolean, default: false },
  images: [String],
  features: [String],
  description: String,
  phone: String,
  createdAt: { type: Number, default: Date.now }
});

restaurantSchema.index({ 'coordinates': '2dsphere' });
restaurantSchema.index({ category: 1, budgetTier: 1 });

export const Restaurant = mongoose.model('Restaurant', restaurantSchema);

// Table Booking Schema
export const TableBooking = mongoose.model('TableBooking', new mongoose.Schema({
  id: { type: String, unique: true },
  userId: String,
  restaurantId: String,
  date: String,
  timeSlot: String,
  partySize: Number,
  occasion: String,
  specialRequests: String,
  preOrderItems: [{ itemId: String, quantity: Number }],
  status: { type: String, enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW'], default: 'PENDING' },
  confirmationCode: String,
  createdAt: { type: Number, default: Date.now }
}));

// Enhanced Mess Pass Schema
export const MessPass = mongoose.model('MessPass', new mongoose.Schema({
  id: { type: String, unique: true },
  userId: String,
  vendorId: String,
  vendorType: { type: String, enum: ['RESTAURANT', 'STALL'] },
  planType: { type: String, enum: ['DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM'] },
  tier: { type: String, enum: ['BASIC', 'STANDARD', 'PREMIUM'] },
  meals: [String],
  startDate: Number,
  endDate: Number,
  pausedUntil: Number,
  price: Number,
  mealsUsed: { type: Number, default: 0 },
  mealsTotal: Number,
  status: { type: String, enum: ['ACTIVE', 'PAUSED', 'EXPIRED', 'CANCELLED'], default: 'ACTIVE' },
  transactionId: String
}));

// Food Order Schema
const foodOrderSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  userId: String,
  vendorId: String,
  vendorType: { type: String, enum: ['RESTAURANT', 'STALL'] },
  orderType: { type: String, enum: ['DINE_IN', 'TAKEAWAY', 'PRE_ORDER'] },
  items: [{
    itemId: String,
    name: String,
    price: Number,
    quantity: Number,
    customization: {
      spiceLevel: String,
      addOns: [{ name: String, price: Number }],
      exclusions: [String],
      specialInstructions: String
    }
  }],
  totalAmount: Number,
  packagingCharges: { type: Number, default: 0 },
  scheduledFor: Number,
  tableBookingId: String,
  status: { type: String, enum: ['PLACED', 'ACCEPTED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED', 'REJECTED'], default: 'PLACED' },
  token: String,
  qrPayload: String,
  estimatedReadyTime: Number,
  acceptedAt: Number,
  readyAt: Number,
  completedAt: Number,
  createdAt: { type: Number, default: Date.now }
});

foodOrderSchema.index({ vendorId: 1, status: 1 });
foodOrderSchema.index({ userId: 1, createdAt: -1 });

export const FoodOrder = mongoose.model('FoodOrder', foodOrderSchema);

// Food Review Schema
export const FoodReview = mongoose.model('FoodReview', new mongoose.Schema({
  id: { type: String, unique: true },
  userId: String,
  userName: String,
  vendorId: String,
  vendorType: { type: String, enum: ['RESTAURANT', 'STALL'] },
  ratings: {
    food: { type: Number, min: 1, max: 5 },
    service: { type: Number, min: 1, max: 5 },
    value: { type: Number, min: 1, max: 5 },
    hygiene: { type: Number, min: 1, max: 5 }
  },
  overallRating: Number,
  comment: String,
  photos: [String],
  orderedItems: [String],
  createdAt: { type: Number, default: Date.now },
  helpfulCount: { type: Number, default: 0 }
}));

// Vendor Menu Item Schema
export const VendorMenuItem = mongoose.model('VendorMenuItem', new mongoose.Schema({
  id: { type: String, unique: true },
  vendorId: String,
  vendorType: { type: String, enum: ['RESTAURANT', 'STALL'] },
  name: String,
  price: Number,
  type: { type: String, enum: ['VEG', 'NON_VEG', 'EGG'] },
  category: { type: String, enum: ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACKS', 'BEVERAGES', 'DESSERTS'] },
  description: String,
  image: String,
  available: { type: Boolean, default: true },
  isRecommended: { type: Boolean, default: false },
  spiceLevels: [String],
  addOns: [{ name: String, price: Number }],
  preparationTime: Number,
  createdAt: { type: Number, default: Date.now }
}));

// --- PAYMENT MODELS (FoodLink v18.0) ---

const paymentSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  razorpayOrderId: { type: String, unique: true },
  razorpayPaymentId: String,
  userId: String,
  orderId: String, // Internal FoodOrder id
  amount: Number,
  currency: { type: String, default: 'INR' },
  status: {
    type: String,
    enum: ['CREATED', 'PAID', 'FAILED', 'REFUNDED'],
    default: 'CREATED'
  },
  method: String,
  refundId: String,
  refundedAt: Number,
  createdAt: { type: Number, default: Date.now }
});

paymentSchema.index({ userId: 1 });
paymentSchema.index({ razorpayOrderId: 1 });
paymentSchema.index({ orderId: 1 });

export const Payment = mongoose.model('Payment', paymentSchema);
