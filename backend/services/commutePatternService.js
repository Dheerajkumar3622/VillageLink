/**
 * Commute Pattern Detection Service
 * Tracks driver movement patterns and helps users find regular vehicles
 */

import mongoose from 'mongoose';
const { Schema } = mongoose;

// --- COMMUTE PATTERN MODEL ---

const CommutePatternSchema = new Schema({
    driverId: { type: String, required: true, index: true },
    routeHash: { type: String, required: true }, // Hash of start/end coords
    startVillage: String,
    endVillage: String,
    startCoords: {
        lat: Number,
        lng: Number
    },
    endCoords: {
        lat: Number,
        lng: Number
    },
    averageArrivalHour: { type: Number, min: 0, max: 23 }, // 0-23
    averageArrivalMinute: { type: Number, min: 0, max: 59 },
    daysActive: [{ type: Number, min: 0, max: 6 }], // 0=Sun, 1=Mon, etc.
    villagesOnRoute: [String],
    occurrenceCount: { type: Number, default: 1 },
    lastSeen: { type: Date, default: Date.now },
    confidence: { type: Number, default: 0, min: 0, max: 100 }, // Pattern strength
    createdAt: { type: Date, default: Date.now }
});

CommutePatternSchema.index({ routeHash: 1, driverId: 1 }, { unique: true });
CommutePatternSchema.index({ 'startCoords.lat': 1, 'startCoords.lng': 1 });

export const CommutePattern = mongoose.model('CommutePattern', CommutePatternSchema);

// --- DRIVER PASS LOG (for tracking) ---

const DriverPassLogSchema = new Schema({
    driverId: { type: String, required: true },
    location: {
        lat: Number,
        lng: Number
    },
    villageName: String,
    timestamp: { type: Date, default: Date.now },
    dayOfWeek: { type: Number, min: 0, max: 6 },
    hour: { type: Number, min: 0, max: 23 }
});

DriverPassLogSchema.index({ driverId: 1, timestamp: -1 });
DriverPassLogSchema.index({ villageName: 1 });

export const DriverPassLog = mongoose.model('DriverPassLog', DriverPassLogSchema);

// --- SERVICE FUNCTIONS ---

/**
 * Record a driver passing through a location
 */
export const recordDriverPass = async (driverId, lat, lng, villageName) => {
    try {
        const now = new Date();

        await DriverPassLog.create({
            driverId,
            location: { lat, lng },
            villageName,
            timestamp: now,
            dayOfWeek: now.getDay(),
            hour: now.getHours()
        });

        // Try to detect patterns after recording
        await detectPatternsForDriver(driverId);

    } catch (error) {
        console.error('Error recording driver pass:', error);
    }
};

/**
 * Detect daily commute patterns for a driver
 */
export const detectPatternsForDriver = async (driverId) => {
    try {
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        // Get recent passes grouped by day and hour
        const passes = await DriverPassLog.aggregate([
            { $match: { driverId, timestamp: { $gte: oneWeekAgo } } },
            {
                $group: {
                    _id: {
                        village: '$villageName',
                        hour: '$hour',
                        dayOfWeek: '$dayOfWeek'
                    },
                    count: { $sum: 1 },
                    avgLat: { $avg: '$location.lat' },
                    avgLng: { $avg: '$location.lng' }
                }
            },
            { $match: { count: { $gte: 2 } } }, // At least 2 occurrences
            { $sort: { count: -1 } }
        ]);

        // Find repeating patterns (same village, same time, multiple days)
        const patterns = new Map();

        for (const pass of passes) {
            const key = `${pass._id.village}|${pass._id.hour}`;

            if (!patterns.has(key)) {
                patterns.set(key, {
                    village: pass._id.village,
                    hour: pass._id.hour,
                    days: [],
                    totalCount: 0,
                    avgLat: pass.avgLat,
                    avgLng: pass.avgLng
                });
            }

            const p = patterns.get(key);
            p.days.push(pass._id.dayOfWeek);
            p.totalCount += pass.count;
        }

        // Save detected patterns
        for (const [key, pattern] of patterns) {
            if (pattern.days.length >= 2 && pattern.totalCount >= 3) {
                const routeHash = `${driverId}|${pattern.village}|${pattern.hour}`;
                const confidence = Math.min(100, pattern.totalCount * 15);

                await CommutePattern.findOneAndUpdate(
                    { driverId, routeHash },
                    {
                        $set: {
                            startVillage: pattern.village,
                            averageArrivalHour: pattern.hour,
                            daysActive: [...new Set(pattern.days)],
                            confidence,
                            lastSeen: new Date(),
                            startCoords: { lat: pattern.avgLat, lng: pattern.avgLng }
                        },
                        $inc: { occurrenceCount: 1 }
                    },
                    { upsert: true }
                );
            }
        }

    } catch (error) {
        console.error('Pattern detection error:', error);
    }
};

/**
 * Find vehicles that regularly pass through a user's location
 */
export const findRegularVehiclesNear = async (lat, lng, preferredHour = null) => {
    try {
        const query = {
            confidence: { $gte: 50 } // Only confident patterns
        };

        // If preferred time specified, filter by hour (±1 hour tolerance)
        if (preferredHour !== null) {
            query.averageArrivalHour = {
                $in: [
                    (preferredHour - 1 + 24) % 24,
                    preferredHour,
                    (preferredHour + 1) % 24
                ]
            };
        }

        const patterns = await CommutePattern.find(query)
            .sort({ confidence: -1 })
            .limit(20)
            .lean();

        // Filter by distance (within 2km)
        const nearbyPatterns = patterns.filter(p => {
            if (!p.startCoords?.lat) return false;
            const dist = calculateDistance(lat, lng, p.startCoords.lat, p.startCoords.lng);
            return dist <= 2;
        });

        return nearbyPatterns.map(p => ({
            driverId: p.driverId,
            village: p.startVillage,
            arrivalTime: `${String(p.averageArrivalHour).padStart(2, '0')}:00`,
            daysActive: p.daysActive.map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]),
            confidence: p.confidence,
            lastSeen: p.lastSeen
        }));

    } catch (error) {
        console.error('Error finding regular vehicles:', error);
        return [];
    }
};

/**
 * Get a driver's regular schedule
 */
export const getDriverSchedule = async (driverId) => {
    try {
        const patterns = await CommutePattern.find({
            driverId,
            confidence: { $gte: 30 }
        })
            .sort({ averageArrivalHour: 1 })
            .lean();

        return patterns.map(p => ({
            village: p.startVillage,
            arrivalTime: `${String(p.averageArrivalHour).padStart(2, '0')}:00`,
            daysActive: p.daysActive.map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]),
            confidence: p.confidence
        }));

    } catch (error) {
        console.error('Error getting driver schedule:', error);
        return [];
    }
};

// --- HELPER ---

const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLng = (lng2 - lng1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};
