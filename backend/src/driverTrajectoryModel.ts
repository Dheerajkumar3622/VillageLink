import mongoose from 'mongoose';

export interface IDriverTrajectory {
  driverId: string;
  tripId?: string;
  loc: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  speed: number;
  heading: number;
  timestamp: number;
  h3_r7?: string;
  h3_r9?: string;
}

const DriverTrajectorySchema = new mongoose.Schema({
  driverId: { type: String, required: true, index: true },
  tripId: { type: String, index: true },
  loc: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true }
  },
  speed: { type: Number, default: 0 },
  heading: { type: Number, default: 0 },
  timestamp: { type: Number, default: Date.now, index: true },
  h3_r7: { type: String, index: true },
  h3_r9: { type: String, index: true }
}, {
  timestamps: true
});

DriverTrajectorySchema.index({ loc: '2dsphere' });
DriverTrajectorySchema.index({ driverId: 1, timestamp: -1 });

export const DriverTrajectoryModel = mongoose.models.DriverTrajectory || mongoose.model('DriverTrajectory', DriverTrajectorySchema);
