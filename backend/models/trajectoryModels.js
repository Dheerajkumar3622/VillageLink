/**
 * Routing AI Models (Trajectory & Map Matching)
 * Stores driver trajectories to build a self-learning route map over time.
 */

import mongoose from 'mongoose';

// ==================== RAW GPS PING ====================
// A single coordinate emitted by a driver's phone
const GPSPingSchema = new mongoose.Schema({
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    timestamp: { type: Number, required: true },
    speed: { type: Number, default: 0 },
    heading: { type: Number, default: 0 },
    accuracy: { type: Number, default: 10 }
}, { _id: false });

// ==================== HISTORICAL TRAJECTORY ====================
// Represents a completed trip segment between two known points (villages/stations)
const TrajectorySchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    
    // The driver who drove this path
    driverId: { type: String, required: true },
    vehicleType: { type: String, enum: ['BUS', 'AUTO', 'CAR'], default: 'BUS' },
    
    // The logical start and end points of this segment
    startNode: { type: String, required: true }, // e.g. "Ataria"
    endNode: { type: String, required: true },   // e.g. "Itehar"
    
    // Time metrics
    startTime: { type: Number, required: true },
    endTime: { type: Number, required: true },
    durationSeconds: { type: Number, required: true },
    
    // The actual physical path taken
    rawPings: [GPSPingSchema], // The exact points recorded
    snappedPolyline: { type: String }, // The encoded polyline after Map Matching
    distanceMeters: { type: Number, required: true },
    
    // ML Metrics
    confidenceScore: { type: Number, default: 1.0 }, // How reliable is this path?
    isAnomaly: { type: Boolean, default: false }, // Did they take a weird detour?
    weatherCondition: { type: String, default: 'CLEAR' },
    
    createdAt: { type: Number, default: Date.now }
});

// Indexes for fast spatial/temporal querying later
TrajectorySchema.index({ startNode: 1, endNode: 1 });
TrajectorySchema.index({ driverId: 1, startTime: -1 });

export const Trajectory = mongoose.model('Trajectory', TrajectorySchema);

export default {
    Trajectory
};
