/**
 * Traffic Aggregator Service
 * Aggregates driver speeds by road segment, detects slowdowns,
 * and provides real-time traffic data for routing and visualization
 */

import { RoadSegment, DriverLocation } from '../models.js';

// --- CONSTANTS ---

const SEGMENT_LENGTH_METERS = 500; // Length of each road segment for aggregation
const SPEED_HISTORY_WINDOW_MS = 300000; // 5 minutes of speed data
const SLOWDOWN_THRESHOLD_PERCENT = 40; // 40% slower than average = slowdown
const JAM_THRESHOLD_PERCENT = 70; // 70% slower = traffic jam
const MIN_SAMPLES_FOR_RELIABLE_DATA = 3; // Minimum driver updates for reliable segment speed

// Congestion level enum
const CONGESTION_LEVELS = {
    FREE: 'FREE',
    SLOW: 'SLOW',
    HEAVY: 'HEAVY',
    JAM: 'JAM'
};

// In-memory speed cache (for high-frequency updates)
const segmentSpeedCache = new Map();

// Historical average speeds per road segment (baseline)
const historicalBaselines = new Map();

// --- CORE FUNCTIONS ---

/**
 * Process a driver location update and aggregate speed data
 * @param {Object} locationData - Driver location update
 * @returns {Object|null} Updated segment info or null
 */
export const processDriverLocation = async (locationData) => {
    const { driverId, lat, lng, speed, heading, timestamp } = locationData;

    // Skip if no speed data or very low speed (likely stationary)
    if (!speed || speed < 1) return null;

    try {
        // Find the road segment this location belongs to
        const segmentId = calculateSegmentId(lat, lng);

        // Get or initialize segment cache
        if (!segmentSpeedCache.has(segmentId)) {
            segmentSpeedCache.set(segmentId, {
                speedSamples: [],
                lastUpdate: 0
            });
        }

        const cache = segmentSpeedCache.get(segmentId);

        // Add speed sample
        cache.speedSamples.push({
            speed,
            heading,
            driverId,
            timestamp: timestamp || Date.now()
        });

        // Clean old samples (older than SPEED_HISTORY_WINDOW_MS)
        const cutoff = Date.now() - SPEED_HISTORY_WINDOW_MS;
        cache.speedSamples = cache.speedSamples.filter(s => s.timestamp > cutoff);

        // Calculate current average speed for segment
        const avgSpeed = calculateAverageSpeed(cache.speedSamples);

        // Determine congestion level
        const congestionLevel = determineCongestion(segmentId, avgSpeed);

        cache.lastUpdate = Date.now();
        cache.currentSpeed = avgSpeed;
        cache.congestionLevel = congestionLevel;

        // Persist to database periodically (every 30 seconds per segment)
        if (Date.now() - (cache.lastDbUpdate || 0) > 30000) {
            await persistSegmentData(segmentId, lat, lng, avgSpeed, congestionLevel);
            cache.lastDbUpdate = Date.now();
        }

        return {
            segmentId,
            avgSpeed,
            congestionLevel,
            sampleCount: cache.speedSamples.length
        };
    } catch (error) {
        console.error('❌ Traffic aggregation error:', error);
        return null;
    }
};

/**
 * Calculate a segment ID from coordinates
 * Uses a grid-based approach for simplicity
 */
const calculateSegmentId = (lat, lng) => {
    // Round to create grid cells (approximately 50m x 50m at mid-latitudes)
    const gridLat = Math.round(lat * 2000) / 2000;
    const gridLng = Math.round(lng * 2000) / 2000;
    return `SEG_${gridLat}_${gridLng}`;
};

/**
 * Calculate average speed from samples
 */
const calculateAverageSpeed = (samples) => {
    if (samples.length === 0) return 0;

    // Use weighted average favoring recent samples
    let totalWeight = 0;
    let weightedSum = 0;
    const now = Date.now();

    samples.forEach(sample => {
        const age = (now - sample.timestamp) / 1000; // Age in seconds
        const weight = Math.max(0.1, 1 - (age / 300)); // Decay over 5 minutes
        weightedSum += sample.speed * weight;
        totalWeight += weight;
    });

    return Math.round(weightedSum / totalWeight);
};

/**
 * Determine congestion level for a segment
 */
const determineCongestion = (segmentId, currentSpeed) => {
    // Get historical baseline (or use default)
    const baseline = historicalBaselines.get(segmentId) || 40; // Default 40 km/h

    if (currentSpeed >= baseline * 0.8) {
        return CONGESTION_LEVELS.FREE;
    } else if (currentSpeed >= baseline * 0.5) {
        return CONGESTION_LEVELS.SLOW;
    } else if (currentSpeed >= baseline * 0.25) {
        return CONGESTION_LEVELS.HEAVY;
    } else {
        return CONGESTION_LEVELS.JAM;
    }
};

/**
 * Persist segment data to MongoDB
 */
const persistSegmentData = async (segmentId, lat, lng, avgSpeed, congestionLevel) => {
    try {
        await RoadSegment.findOneAndUpdate(
            { segmentId },
            {
                geometry: {
                    type: 'LineString',
                    coordinates: [[lng, lat], [lng + 0.0005, lat + 0.0005]] // Approximate segment
                },
                currentSpeed: avgSpeed,
                congestionLevel,
                lastSpeedUpdate: new Date(),
                $push: {
                    speedHistory: {
                        $each: [{ speed: avgSpeed, timestamp: new Date() }],
                        $slice: -100 // Keep last 100 readings
                    }
                }
            },
            { upsert: true, new: true }
        );
    } catch (error) {
        console.error('❌ Segment persist error:', error);
    }
};

/**
 * Get traffic data for a bounding box (for map overlay)
 * @param {Object} bounds - { north, south, east, west }
 * @returns {Array} Traffic segments
 */
export const getTrafficInBounds = async (bounds) => {
    try {
        const segments = await RoadSegment.find({
            'geometry.coordinates.0.0': { $gte: bounds.west, $lte: bounds.east },
            'geometry.coordinates.0.1': { $gte: bounds.south, $lte: bounds.north },
            lastSpeedUpdate: { $gte: new Date(Date.now() - 600000) } // Updated in last 10 mins
        }).lean();

        return segments.map(seg => ({
            segmentId: seg.segmentId,
            start: {
                lat: seg.geometry.coordinates[0][1],
                lng: seg.geometry.coordinates[0][0]
            },
            end: {
                lat: seg.geometry.coordinates[1][1],
                lng: seg.geometry.coordinates[1][0]
            },
            speedKmh: seg.currentSpeed,
            congestionLevel: seg.congestionLevel || 'FREE'
        }));
    } catch (error) {
        console.error('❌ Get traffic error:', error);
        return [];
    }
};

/**
 * Get traffic along a specific route
 * @param {Array} routeCoordinates - Array of {lat, lng} points
 * @returns {Array} Traffic segments along route
 */
export const getTrafficAlongRoute = async (routeCoordinates) => {
    if (!routeCoordinates || routeCoordinates.length < 2) return [];

    try {
        // Get segment IDs for each point in route
        const segmentIds = routeCoordinates.map(coord => calculateSegmentId(coord.lat, coord.lng));
        const uniqueSegmentIds = [...new Set(segmentIds)];

        // Query all segments at once
        const segments = await RoadSegment.find({
            segmentId: { $in: uniqueSegmentIds }
        }).lean();

        // Create lookup map
        const segmentMap = new Map(segments.map(s => [s.segmentId, s]));

        // Build route traffic segments
        const trafficSegments = [];

        for (let i = 0; i < routeCoordinates.length - 1; i++) {
            const start = routeCoordinates[i];
            const end = routeCoordinates[i + 1];
            const segId = calculateSegmentId(start.lat, start.lng);
            const segData = segmentMap.get(segId);

            trafficSegments.push({
                start,
                end,
                speedKmh: segData?.currentSpeed || null,
                congestionLevel: segData?.congestionLevel || 'FREE'
            });
        }

        return trafficSegments;
    } catch (error) {
        console.error('❌ Route traffic error:', error);
        return routeCoordinates.slice(0, -1).map((start, i) => ({
            start,
            end: routeCoordinates[i + 1],
            congestionLevel: 'FREE'
        }));
    }
};

/**
 * Detect significant slowdowns for active trips
 * @param {string} tripId - Trip ID
 * @param {Array} routeCoordinates - Expected route
 * @returns {Object|null} Slowdown info if detected
 */
export const detectSlowdownsOnRoute = async (routeCoordinates) => {
    const trafficSegments = await getTrafficAlongRoute(routeCoordinates);

    // Count problematic segments
    let jamCount = 0;
    let heavyCount = 0;
    let slowCount = 0;

    trafficSegments.forEach(seg => {
        if (seg.congestionLevel === 'JAM') jamCount++;
        else if (seg.congestionLevel === 'HEAVY') heavyCount++;
        else if (seg.congestionLevel === 'SLOW') slowCount++;
    });

    // Calculate delay estimate
    const totalSegments = trafficSegments.length;
    const delayMinutes = Math.round(
        (jamCount * 3 + heavyCount * 1.5 + slowCount * 0.5) / Math.max(1, totalSegments) * 5
    );

    if (jamCount > 0 || heavyCount > 2) {
        return {
            hasSlowdown: true,
            severity: jamCount > 0 ? 'SEVERE' : 'MODERATE',
            estimatedDelayMinutes: delayMinutes,
            affectedSegments: trafficSegments.filter(s => s.congestionLevel !== 'FREE')
        };
    }

    return { hasSlowdown: false, estimatedDelayMinutes: 0 };
};

/**
 * Update historical baseline speeds (call periodically, e.g., daily)
 */
export const updateHistoricalBaselines = async () => {
    try {
        const segments = await RoadSegment.find({
            'speedHistory.0': { $exists: true }
        }).lean();

        segments.forEach(seg => {
            if (seg.speedHistory && seg.speedHistory.length >= 10) {
                const speeds = seg.speedHistory.map(h => h.speed);
                const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
                historicalBaselines.set(seg.segmentId, avgSpeed);
            }
        });

        console.log(`📊 Updated baselines for ${historicalBaselines.size} segments`);
    } catch (error) {
        console.error('❌ Baseline update error:', error);
    }
};

/**
 * Get traffic weight for OSRM routing (higher = slower)
 * @param {Object} coord - Coordinate {lat, lng}
 * @returns {number} Weight multiplier (1.0 = normal, 2.0 = double time)
 */
export const getTrafficWeight = (lat, lng) => {
    const segmentId = calculateSegmentId(lat, lng);
    const cache = segmentSpeedCache.get(segmentId);

    if (!cache || !cache.congestionLevel) return 1.0;

    switch (cache.congestionLevel) {
        case 'FREE': return 1.0;
        case 'SLOW': return 1.3;
        case 'HEAVY': return 1.8;
        case 'JAM': return 3.0;
        default: return 1.0;
    }
};

/**
 * Clear stale cache entries
 */
export const cleanupStaleCache = () => {
    const cutoff = Date.now() - SPEED_HISTORY_WINDOW_MS * 2;
    let cleaned = 0;

    for (const [segmentId, cache] of segmentSpeedCache.entries()) {
        if (cache.lastUpdate < cutoff) {
            segmentSpeedCache.delete(segmentId);
            cleaned++;
        }
    }

    if (cleaned > 0) {
        console.log(`🧹 Cleaned ${cleaned} stale traffic cache entries`);
    }
};

// Run cleanup every 10 minutes
setInterval(cleanupStaleCache, 600000);
