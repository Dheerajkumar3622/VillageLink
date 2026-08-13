import mongoose from 'mongoose';

/**
 * 1. Administrative Village Schema (LGD Directory)
 */
const VillageSchema = new mongoose.Schema({
  villageId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true, index: true },
  localNameHindi: { type: String },
  district: { type: String, index: true },
  block: { type: String },
  state: { type: String, index: true },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true } // [lng, lat]
  },
  h3_r7: { type: String, index: true },
  h3_r9: { type: String, index: true },
  populationEst: { type: Number, default: 1000 }
}, { timestamps: true });

VillageSchema.index({ location: '2dsphere' });

/**
 * 2. Physical Highway Access Node Schema (OSM / Feeder Chowk)
 */
const AccessNodeSchema = new mongoose.Schema({
  nodeId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  nodeType: { 
    type: String, 
    enum: ['ORIGIN_TERMINAL', 'DESTINATION_TERMINAL', 'T_JUNCTION', 'Y_JUNCTION', 'FEEDER_APPROACH_CHOWK', 'STANDARD_STOP'],
    default: 'FEEDER_APPROACH_CHOWK'
  },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true } // [lng, lat]
  },
  degree: { type: Number, default: 3 }, // Number of connecting roads
  vehicleAccessLevel: { type: String, enum: ['BUS_ACCESSIBLE', 'AUTO_ACCESSIBLE', 'WALK_ONLY'], default: 'BUS_ACCESSIBLE' },
  h3_r7: { type: String, index: true },
  h3_r9: { type: String, index: true }
}, { timestamps: true });

AccessNodeSchema.index({ location: '2dsphere' });

/**
 * 3. Village-Node Relational Schema (Multi-Criteria Mapping)
 */
const VillageNodeRelSchema = new mongoose.Schema({
  relId: { type: String, required: true, unique: true, index: true },
  villageId: { type: String, required: true, index: true },
  nodeId: { type: String, required: true, index: true },
  relationship: { type: String, enum: ['PRIMARY', 'SECONDARY'], default: 'PRIMARY' },
  straightDistanceKm: { type: Number, required: true },
  roadDistanceKm: { type: Number, required: true },
  approachType: { type: String, enum: ['ON_HIGHWAY', 'T_JUNCTION_WALK', 'Y_JUNCTION_FEEDER_AUTO'], default: 'T_JUNCTION_WALK' },
  confidenceScorePct: { type: Number, default: 90 }, // 0 to 100%
  verificationStatus: { type: String, enum: ['CANDIDATE', 'ALGORITHMICALLY_VERIFIED', 'OPERATIONALLY_VERIFIED'], default: 'ALGORITHMICALLY_VERIFIED' }
}, { timestamps: true });

/**
 * 4. Route-Node Sequence Schema
 */
const RouteNodeSequenceSchema = new mongoose.Schema({
  routeId: { type: String, required: true, index: true },
  nodeId: { type: String, required: true, index: true },
  sequenceOrder: { type: Number, required: true },
  cumulativeDistKm: { type: Number, required: true },
  etaMinutes: { type: Number },
  approachDirection: { type: String }
}, { timestamps: true });

export const Village = mongoose.models.Village || mongoose.model('Village', VillageSchema);
export const AccessNode = mongoose.models.AccessNode || mongoose.model('AccessNode', AccessNodeSchema);
export const VillageNodeRel = mongoose.models.VillageNodeRel || mongoose.model('VillageNodeRel', VillageNodeRelSchema);
export const RouteNodeSequence = mongoose.models.RouteNodeSequence || mongoose.model('RouteNodeSequence', RouteNodeSequenceSchema);
