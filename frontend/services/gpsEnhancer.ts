/**
 * GPS Enhancer Service
 * Provides Kalman filtering for GPS noise reduction, adaptive sampling rates,
 * and heading prediction for smooth driver tracking
 */

// --- KALMAN FILTER FOR GPS SMOOTHING ---
interface KalmanState {
    lat: number;
    lng: number;
    velocityLat: number;
    velocityLng: number;
    accuracy: number;
}

interface GPSReading {
    lat: number;
    lng: number;
    accuracy: number;
    timestamp: number;
    speed?: number;
    heading?: number;
}

interface EnhancedGPSReading extends GPSReading {
    smoothedLat: number;
    smoothedLng: number;
    predictedHeading: number;
    isStationary: boolean;
    recommendedUpdateInterval: number;
}

// Kalman filter state per driver
const kalmanStates = new Map<string, KalmanState>();
const lastReadings = new Map<string, GPSReading[]>();

// Constants for Kalman filter
const PROCESS_NOISE = 0.00001; // Q - process noise (how much we trust the model)
const MEASUREMENT_NOISE_BASE = 0.00005; // R base - measurement noise

/**
 * Initialize Kalman state for a driver
 */
export const initializeKalman = (driverId: string, initialReading: GPSReading): void => {
    kalmanStates.set(driverId, {
        lat: initialReading.lat,
        lng: initialReading.lng,
        velocityLat: 0,
        velocityLng: 0,
        accuracy: initialReading.accuracy || 10
    });
    lastReadings.set(driverId, [initialReading]);
};

/**
 * Apply Kalman filter to GPS reading
 * Reduces noise and provides smoothed coordinates
 */
export const applyKalmanFilter = (
    driverId: string,
    reading: GPSReading
): EnhancedGPSReading => {
    let state = kalmanStates.get(driverId);
    const history = lastReadings.get(driverId) || [];

    // Initialize if first reading
    if (!state) {
        initializeKalman(driverId, reading);
        return {
            ...reading,
            smoothedLat: reading.lat,
            smoothedLng: reading.lng,
            predictedHeading: reading.heading || 0,
            isStationary: true,
            recommendedUpdateInterval: 5000
        };
    }

    // Calculate time delta
    const lastReading = history[history.length - 1];
    const dt = (reading.timestamp - (lastReading?.timestamp || reading.timestamp)) / 1000;

    // --- PREDICTION STEP ---
    // Predict new position based on velocity
    const predictedLat = state.lat + state.velocityLat * dt;
    const predictedLng = state.lng + state.velocityLng * dt;

    // Increase uncertainty based on time elapsed
    const predictedAccuracy = state.accuracy + PROCESS_NOISE * dt;

    // --- UPDATE STEP ---
    // Measurement noise based on GPS accuracy (worse GPS = trust model more)
    const measurementNoise = MEASUREMENT_NOISE_BASE * (reading.accuracy / 10);

    // Kalman gain (how much to trust the measurement vs prediction)
    const K = predictedAccuracy / (predictedAccuracy + measurementNoise);

    // Update state with weighted average of prediction and measurement
    const newLat = predictedLat + K * (reading.lat - predictedLat);
    const newLng = predictedLng + K * (reading.lng - predictedLng);

    // Update velocity estimate
    const newVelocityLat = (newLat - state.lat) / Math.max(dt, 0.1);
    const newVelocityLng = (newLng - state.lng) / Math.max(dt, 0.1);

    // Update accuracy
    const newAccuracy = (1 - K) * predictedAccuracy;

    // Save new state
    kalmanStates.set(driverId, {
        lat: newLat,
        lng: newLng,
        velocityLat: newVelocityLat,
        velocityLng: newVelocityLng,
        accuracy: newAccuracy
    });

    // Update history (keep last 10 readings)
    history.push(reading);
    if (history.length > 10) history.shift();
    lastReadings.set(driverId, history);

    // Calculate predicted heading from velocity
    const predictedHeading = calculateHeadingFromVelocity(newVelocityLat, newVelocityLng);

    // Determine if stationary
    const speed = Math.sqrt(newVelocityLat ** 2 + newVelocityLng ** 2) * 111000; // Convert to m/s
    const isStationary = speed < 1; // Less than 1 m/s

    // Adaptive update interval
    const recommendedUpdateInterval = getAdaptiveInterval(speed, reading.accuracy);

    return {
        ...reading,
        smoothedLat: newLat,
        smoothedLng: newLng,
        predictedHeading: reading.heading || predictedHeading,
        isStationary,
        recommendedUpdateInterval
    };
};

/**
 * Calculate heading from velocity components
 */
const calculateHeadingFromVelocity = (velocityLat: number, velocityLng: number): number => {
    if (Math.abs(velocityLat) < 0.00001 && Math.abs(velocityLng) < 0.00001) {
        return 0; // Stationary, no heading
    }

    // Convert to degrees (0 = North, 90 = East, etc.)
    let heading = Math.atan2(velocityLng, velocityLat) * (180 / Math.PI);
    if (heading < 0) heading += 360;
    return heading;
};

/**
 * Get adaptive update interval based on speed and GPS quality
 * Faster movement = more frequent updates
 * Poor GPS = less frequent updates (save battery, reduce noise)
 */
const getAdaptiveInterval = (speedMs: number, accuracy: number): number => {
    // Base interval in milliseconds
    let interval: number;

    if (speedMs < 1) {
        // Stationary: update every 10 seconds
        interval = 10000;
    } else if (speedMs < 5) {
        // Walking pace: every 5 seconds
        interval = 5000;
    } else if (speedMs < 15) {
        // City driving: every 2 seconds
        interval = 2000;
    } else {
        // Highway: every 1 second
        interval = 1000;
    }

    // Increase interval if GPS is poor (accuracy > 50m)
    if (accuracy > 50) {
        interval = Math.min(interval * 2, 15000);
    }

    return interval;
};

/**
 * Predict future position based on current velocity
 * Useful for smooth animations on client
 */
export const predictPosition = (
    driverId: string,
    secondsAhead: number
): { lat: number; lng: number } | null => {
    const state = kalmanStates.get(driverId);
    if (!state) return null;

    return {
        lat: state.lat + state.velocityLat * secondsAhead,
        lng: state.lng + state.velocityLng * secondsAhead
    };
};

/**
 * Get smooth heading with interpolation
 * Prevents jarring heading jumps
 */
export const getSmoothHeading = (driverId: string, newHeading: number): number => {
    const history = lastReadings.get(driverId);
    if (!history || history.length < 2) return newHeading;

    const lastHeading = history[history.length - 1].heading || 0;

    // Interpolate heading to avoid 359° -> 1° jump
    let diff = newHeading - lastHeading;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;

    // Smooth 50% of the way to new heading
    return (lastHeading + diff * 0.5 + 360) % 360;
};

/**
 * Check if a GPS reading should be filtered out (spike detection)
 * Returns true if the reading appears to be an error
 */
export const isGPSSpike = (driverId: string, reading: GPSReading): boolean => {
    const history = lastReadings.get(driverId);
    if (!history || history.length < 2) return false;

    const lastReading = history[history.length - 1];
    const dt = (reading.timestamp - lastReading.timestamp) / 1000;

    // Calculate distance moved
    const distance = haversineDistance(
        lastReading.lat, lastReading.lng,
        reading.lat, reading.lng
    );

    // Maximum reasonable speed: 150 km/h = 41.7 m/s
    const maxDistance = 50 * dt; // 50 m/s buffer for GPS inaccuracy

    return distance > maxDistance;
};

/**
 * Haversine distance between two points
 */
const haversineDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in meters
};

/**
 * Clear Kalman state for a driver (when they go offline)
 */
export const clearDriverState = (driverId: string): void => {
    kalmanStates.delete(driverId);
    lastReadings.delete(driverId);
};

/**
 * Get driver state for debugging/monitoring
 */
export const getDriverState = (driverId: string): KalmanState | null => {
    return kalmanStates.get(driverId) || null;
};
