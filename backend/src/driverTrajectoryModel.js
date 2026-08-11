/**
 * MongoDB Schema for Driver GPS Trajectory Probe Telemetry
 */

import mongoose from 'mongoose';

const DriverTrajectorySchema = new mongoose.Schema({
  driverId: { type: String, required: true, index: true },
  tripId: { type: String, index: true },
  loc: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true } // [lng, lat]
  },
  speed: { type: Number, default: 0 },
  heading: { type: Number, default: 0 }, // Bearing angle 0..360
  timestamp: { type: Number, default: Date.now, index: true },
  h3_r7: { type: String, index: true },
  h3_r9: { type: String, index: true }
}, {
  timestamps: true
});

DriverTrajectorySchema.index({ loc: '2dsphere' });
DriverTrajectorySchema.index({ driverId: 1, timestamp: -1 });

export const DriverTrajectoryModel = mongoose.models.DriverTrajectory || mongoose.model('DriverTrajectory', DriverTrajectorySchema);
