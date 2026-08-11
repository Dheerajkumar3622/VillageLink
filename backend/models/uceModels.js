import mongoose from 'mongoose';

// ============================================================================
// 1. UNIVERSAL CAPACITY OBJECT (UCO) SCHEMA
// ============================================================================
const CapacityObjectSchema = new mongoose.Schema({
  capacityId: { type: String, required: true, unique: true, index: true },
  ownerId: { type: String, required: true, index: true },
  vehicleId: { type: String, required: true, index: true },
  currentLocation: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    h3Index: { type: String, index: true }
  },
  destination: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    h3Index: { type: String, index: true }
  },
  intermediateStops: [{
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    stopName: { type: String },
    h3Index: { type: String }
  }],
  availableSeats: { type: Number, default: 0 },
  availableWeightKg: { type: Number, default: 0 },
  availableVolumeL: { type: Number, default: 0 },
  departureTime: { type: Number, required: true, index: true },
  arrivalTimeWindow: {
    start: { type: Number, required: true },
    end: { type: Number, required: true }
  },
  allowedCargoTypes: [{ type: String }],
  trustScore: { type: Number, default: 100 },
  insuranceLevel: { type: Number, default: 1 },
  pricePolicy: { type: String, default: 'FIXED' },
  status: {
    type: String,
    enum: ['Available', 'Reserved', 'Accepted', 'Loaded', 'Delivered', 'Closed'],
    default: 'Available',
    index: true
  },
  liveGps: {
    lat: { type: Number },
    lng: { type: Number },
    speed: { type: Number, default: 0 },
    bearing: { type: Number, default: 0 },
    timestamp: { type: Number, default: Date.now }
  },
  expiryTime: { type: Number, required: true, index: true }
}, { timestamps: true });

// PostGIS 2DSphere spatial indexing for real-time proximity lookups
CapacityObjectSchema.index({ "currentLocation": "2dsphere" });

// ============================================================================
// 2. UNIVERSAL DEMAND OBJECT (UDO) SCHEMA
// ============================================================================
const DemandObjectSchema = new mongoose.Schema({
  demandId: { type: String, required: true, unique: true, index: true },
  requesterId: { type: String, required: true, index: true },
  demandType: {
    type: String,
    enum: ['Passenger', 'Parcel', 'AgriculturalGoods', 'FoodDelivery', 'Medicine', 'Emergency'],
    required: true,
    index: true
  },
  pickupLocation: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    address: { type: String },
    h3Index: { type: String, index: true }
  },
  dropLocation: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    address: { type: String },
    h3Index: { type: String, index: true }
  },
  weightKg: { type: Number, default: 0 },
  volumeL: { type: Number, default: 0 },
  passengerCount: { type: Number, default: 1 },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium',
    index: true
  },
  deadlineWindow: {
    pickupBefore: { type: Number, required: true },
    dropBefore: { type: Number, required: true }
  },
  temperatureRequirement: { type: String },
  fragile: { type: Boolean, default: false },
  insuranceNeeded: { type: Boolean, default: false },
  bidAllowed: { type: Boolean, default: true },
  maxBudget: { type: Number, default: 0 },
  trustRequirement: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['Created', 'Matching', 'Assigned', 'Picked', 'InTransit', 'Delivered', 'Cancelled'],
    default: 'Created',
    index: true
  }
}, { timestamps: true });

DemandObjectSchema.index({ "pickupLocation": "2dsphere" });

// ============================================================================
// 3. CAPACITY EVENT STORE SCHEMA (Append-Only Event Log)
// ============================================================================
const CapacityEventSchema = new mongoose.Schema({
  eventId: { type: String, required: true, unique: true, index: true },
  entityId: { type: String, required: true, index: true },
  entityType: {
    type: String,
    enum: ['Capacity', 'Demand', 'CoordinationUnit'],
    required: true,
    index: true
  },
  eventType: { type: String, required: true, index: true },
  payload: { type: mongoose.Schema.Types.Mixed, required: true },
  timestamp: { type: Number, required: true, index: true },
  metadata: {
    deviceFingerprint: { type: String },
    ipAddress: { type: String },
    sequenceId: { type: Number }
  }
}, { timestamps: false });

// ============================================================================
// 4. COORDINATION UNIT SCHEMA (Active CQRS Match Projection)
// ============================================================================
const CoordinationUnitSchema = new mongoose.Schema({
  cuId: { type: String, required: true, unique: true, index: true },
  ucoId: { type: String, required: true, index: true },
  udoId: { type: String, required: true, index: true },
  matchScore: { type: Number, required: true },
  segmentMatch: {
    fromStop: { type: String },
    toStop: { type: String },
    overlapPercentage: { type: Number, default: 100 }
  },
  pricing: {
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    bidAllowed: { type: Boolean, default: false }
  },
  status: {
    type: String,
    enum: ['PROPOSED', 'CONFIRMED', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED'],
    default: 'PROPOSED',
    index: true
  }
}, { timestamps: true });

const CapacityObjectCollection = mongoose.models.CapacityObjectCollection || mongoose.model('CapacityObjectCollection', CapacityObjectSchema);
const DemandObjectCollection = mongoose.models.DemandObjectCollection || mongoose.model('DemandObjectCollection', DemandObjectSchema);
const CapacityEventCollection = mongoose.models.CapacityEventCollection || mongoose.model('CapacityEventCollection', CapacityEventSchema);
const CoordinationUnitCollection = mongoose.models.CoordinationUnitCollection || mongoose.model('CoordinationUnitCollection', CoordinationUnitSchema);

export {
  CapacityObjectCollection,
  DemandObjectCollection,
  CapacityEventCollection,
  CoordinationUnitCollection
};
