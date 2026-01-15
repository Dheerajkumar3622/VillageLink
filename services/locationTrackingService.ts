/**
 * Location Tracking Service v2.0
 * High-frequency GPS tracking with Kalman filtering, adaptive sampling,
 * cell tower/Wi-Fi fallback, and battery-efficient modes
 * for VillageLink real-time driver tracking
 */

import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../config';
import {
    applyKalmanFilter,
    isGPSSpike,
    clearDriverState,
    predictPosition,
    getSmoothHeading
} from './gpsEnhancer';

export interface LocationUpdate {
    lat: number;
    lng: number;
    speed: number | null;       // km/h
    heading: number | null;     // degrees (0-360)
    accuracy: number;           // meters
    timestamp: number;
    source: 'GPS' | 'CELL_TOWER' | 'IP_GEOLOCATION' | 'NETWORK';
    // Enhanced fields from Kalman filter
    smoothedLat?: number;
    smoothedLng?: number;
    isStationary?: boolean;
}

interface TrackingOptions {
    intervalMs?: number;           // Base update interval (default: 3000ms)
    enableHighAccuracy?: boolean;  // Use GPS if available
    adaptiveInterval?: boolean;    // Use speed-based adaptive intervals
    powerSaveMode?: boolean;       // Reduce updates when stationary
    onUpdate?: (location: LocationUpdate) => void;
    onError?: (error: GeolocationPositionError | Error) => void;
}

interface TrackingState {
    watchId: number | null;
    socket: Socket | null;
    lastUpdate: LocationUpdate | null;
    updateInterval: ReturnType<typeof setInterval> | null;
    currentIntervalMs: number;
    driverId: string | null;
    options: TrackingOptions;
    isStationary: boolean;
    lastEmitTime: number;
}

// Global tracking state
const state: TrackingState = {
    watchId: null,
    socket: null,
    lastUpdate: null,
    updateInterval: null,
    currentIntervalMs: 3000,
    driverId: null,
    options: {},
    isStationary: false,
    lastEmitTime: 0
};

// --- CORE TRACKING FUNCTIONS ---

/**
 * Start continuous location tracking with enhanced features
 */
export const startTracking = (driverId: string, options: TrackingOptions = {}): void => {
    const {
        intervalMs = 3000,
        enableHighAccuracy = true,
        adaptiveInterval = true,
        powerSaveMode = true,
        onUpdate,
        onError
    } = options;

    state.driverId = driverId;
    state.options = options;
    state.currentIntervalMs = intervalMs;

    // Initialize Socket.IO connection if not exists
    if (!state.socket) {
        state.socket = io(API_BASE_URL, {
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000
        });

        state.socket.on('connect', () => {
            console.log('📍 Location Socket Connected');
            state.socket?.emit('driver_go_online', driverId);
        });

        state.socket.on('disconnect', () => {
            console.log('📍 Location Socket Disconnected');
        });

        state.socket.on('reconnect', () => {
            console.log('📍 Location Socket Reconnected');
            state.socket?.emit('driver_go_online', driverId);
        });
    }

    // Check if Geolocation is supported
    if (!navigator.geolocation) {
        console.warn('⚠️ Geolocation not supported, using IP fallback');
        startIPFallback(driverId, intervalMs, onUpdate, onError);
        return;
    }

    // Start high-frequency GPS watching
    state.watchId = navigator.geolocation.watchPosition(
        (position) => {
            const rawUpdate: LocationUpdate = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                speed: position.coords.speed ? position.coords.speed * 3.6 : null, // Convert m/s to km/h
                heading: position.coords.heading,
                accuracy: position.coords.accuracy,
                timestamp: Date.now(),
                source: 'GPS'
            };

            // Check for GPS spike (impossible jump)
            if (isGPSSpike(driverId, {
                lat: rawUpdate.lat,
                lng: rawUpdate.lng,
                accuracy: rawUpdate.accuracy,
                timestamp: rawUpdate.timestamp
            })) {
                console.warn('⚠️ GPS spike detected, skipping update');
                return;
            }

            // Apply Kalman filter for smoothing
            const enhanced = applyKalmanFilter(driverId, {
                lat: rawUpdate.lat,
                lng: rawUpdate.lng,
                accuracy: rawUpdate.accuracy,
                timestamp: rawUpdate.timestamp,
                speed: rawUpdate.speed || undefined,
                heading: rawUpdate.heading || undefined
            });

            // Create enhanced update
            const update: LocationUpdate = {
                ...rawUpdate,
                smoothedLat: enhanced.smoothedLat,
                smoothedLng: enhanced.smoothedLng,
                heading: enhanced.predictedHeading,
                isStationary: enhanced.isStationary
            };

            state.lastUpdate = update;
            state.isStationary = enhanced.isStationary;

            // Adaptive interval adjustment
            if (adaptiveInterval) {
                adjustUpdateInterval(enhanced.recommendedUpdateInterval, driverId, onUpdate);
            }

            // Power save mode: reduce emissions when stationary
            if (powerSaveMode && enhanced.isStationary) {
                const timeSinceLastEmit = Date.now() - state.lastEmitTime;
                if (timeSinceLastEmit < 10000) { // Only emit every 10s when stationary
                    return;
                }
            }

            // Emit to server
            emitLocationUpdate(driverId, update);
            state.lastEmitTime = Date.now();

            // Callback
            if (onUpdate) onUpdate(update);
        },
        (error) => {
            console.warn('⚠️ GPS Error, attempting fallback:', error.message);

            // Try network fallback first, then IP
            attemptNetworkLocation(driverId, onUpdate)
                .catch(() => attemptFallbackLocation(driverId, onUpdate, onError));

            if (onError) onError(error);
        },
        {
            enableHighAccuracy,
            timeout: 15000,
            maximumAge: 1000 // Allow 1s cache for efficiency
        }
    );

    // Set up periodic emission regardless of movement
    state.updateInterval = setInterval(() => {
        if (state.lastUpdate && state.driverId) {
            // Use predicted position for smooth updates
            const prediction = predictPosition(driverId, 1);
            if (prediction) {
                emitLocationUpdate(driverId, {
                    ...state.lastUpdate,
                    lat: prediction.lat,
                    lng: prediction.lng,
                    timestamp: Date.now()
                });
            }
        }
    }, intervalMs);

    console.log(`🚗 Enhanced location tracking started for driver ${driverId}`);
};

/**
 * Adjust update interval based on speed (adaptive sampling)
 */
const adjustUpdateInterval = (
    recommendedMs: number,
    driverId: string,
    onUpdate?: (location: LocationUpdate) => void
): void => {
    // Only change if difference is significant
    if (Math.abs(recommendedMs - state.currentIntervalMs) < 1000) return;

    // Clear and reset interval
    if (state.updateInterval) {
        clearInterval(state.updateInterval);
    }

    state.currentIntervalMs = recommendedMs;

    state.updateInterval = setInterval(() => {
        if (state.lastUpdate && state.driverId) {
            const prediction = predictPosition(driverId, 1);
            if (prediction) {
                const update = {
                    ...state.lastUpdate,
                    lat: prediction.lat,
                    lng: prediction.lng,
                    timestamp: Date.now()
                };
                emitLocationUpdate(driverId, update);
                if (onUpdate) onUpdate(update);
            }
        }
    }, recommendedMs);

    console.log(`⏱️ Update interval adjusted to ${recommendedMs}ms`);
};

/**
 * Stop location tracking
 */
export const stopTracking = (driverId: string): void => {
    if (state.watchId !== null) {
        navigator.geolocation.clearWatch(state.watchId);
        state.watchId = null;
    }

    if (state.updateInterval) {
        clearInterval(state.updateInterval);
        state.updateInterval = null;
    }

    if (state.socket) {
        state.socket.emit('driver_go_offline', driverId);
        state.socket.disconnect();
        state.socket = null;
    }

    // Clear Kalman state
    clearDriverState(driverId);

    state.lastUpdate = null;
    state.driverId = null;
    console.log(`🛑 Location tracking stopped for driver ${driverId}`);
};

/**
 * Get current position once (Promise-based)
 */
export const getCurrentPosition = (): Promise<LocationUpdate> => {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation not supported'));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    speed: position.coords.speed ? position.coords.speed * 3.6 : null,
                    heading: position.coords.heading,
                    accuracy: position.coords.accuracy,
                    timestamp: Date.now(),
                    source: 'GPS'
                });
            },
            (error) => reject(error),
            { enableHighAccuracy: true, timeout: 10000 }
        );
    });
};

// --- FALLBACK MECHANISMS ---

/**
 * Attempt Network-based location (Wi-Fi/Cell Tower)
 * Uses the Network Information API if available
 */
const attemptNetworkLocation = async (
    driverId: string,
    onUpdate?: (location: LocationUpdate) => void
): Promise<void> => {
    // Try getting a lower accuracy position (often uses cell/wifi)
    return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const update: LocationUpdate = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    speed: null,
                    heading: null,
                    accuracy: position.coords.accuracy,
                    timestamp: Date.now(),
                    source: position.coords.accuracy > 100 ? 'CELL_TOWER' : 'NETWORK'
                };

                state.lastUpdate = update;
                emitLocationUpdate(driverId, update);
                if (onUpdate) onUpdate(update);
                resolve();
            },
            (error) => reject(error),
            { enableHighAccuracy: false, timeout: 5000 }
        );
    });
};

/**
 * Attempt IP geolocation fallback (last resort)
 */
const attemptFallbackLocation = async (
    driverId: string,
    onUpdate?: (location: LocationUpdate) => void,
    onError?: (error: Error) => void
): Promise<void> => {
    try {
        // Try IP-based geolocation (less accurate but works everywhere)
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();

        if (data.latitude && data.longitude) {
            const update: LocationUpdate = {
                lat: data.latitude,
                lng: data.longitude,
                speed: null,
                heading: null,
                accuracy: 5000, // IP geolocation is ~5km accurate
                timestamp: Date.now(),
                source: 'IP_GEOLOCATION'
            };

            state.lastUpdate = update;
            emitLocationUpdate(driverId, update);

            if (onUpdate) onUpdate(update);
        }
    } catch (error) {
        console.error('❌ Fallback location failed:', error);
        if (onError) onError(error as Error);
    }
};

/**
 * Start IP-based fallback tracking (for devices without GPS)
 */
const startIPFallback = (
    driverId: string,
    intervalMs: number,
    onUpdate?: (location: LocationUpdate) => void,
    onError?: (error: Error) => void
): void => {
    state.updateInterval = setInterval(() => {
        attemptFallbackLocation(driverId, onUpdate, onError);
    }, Math.max(intervalMs, 30000)); // IP lookups shouldn't be too frequent
};

// --- SOCKET COMMUNICATION ---

/**
 * Emit location update to server via Socket.IO
 */
const emitLocationUpdate = (driverId: string, location: LocationUpdate): void => {
    if (state.socket && state.socket.connected) {
        state.socket.emit('driver_location_stream', {
            driverId,
            lat: location.smoothedLat || location.lat,
            lng: location.smoothedLng || location.lng,
            speed: location.speed,
            heading: location.heading,
            accuracy: location.accuracy,
            timestamp: location.timestamp,
            source: location.source,
            isStationary: location.isStationary
        });
    }
};

/**
 * Subscribe to location updates for a specific driver (for passengers)
 */
export const subscribeToDriver = (
    driverId: string,
    onLocationUpdate: (location: LocationUpdate) => void
): (() => void) => {
    if (!state.socket) {
        state.socket = io(API_BASE_URL, {
            transports: ['websocket'],
            reconnection: true
        });
    }

    state.socket.emit('subscribe_driver', driverId);

    const handler = (data: LocationUpdate & { driverId: string }) => {
        if (data.driverId === driverId) {
            onLocationUpdate(data);
        }
    };

    state.socket.on('driver_location_broadcast', handler);

    // Return unsubscribe function
    return () => {
        state.socket?.off('driver_location_broadcast', handler);
        state.socket?.emit('unsubscribe_driver', driverId);
    };
};

/**
 * Calculate distance between two coordinates using Haversine formula
 */
export const calculateDistance = (
    lat1: number, lng1: number,
    lat2: number, lng2: number
): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLng = (lng2 - lng1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

/**
 * Get last known location
 */
export const getLastKnownLocation = (): LocationUpdate | null => {
    return state.lastUpdate;
};

/**
 * Get current tracking state (for debugging)
 */
export const getTrackingState = (): {
    isTracking: boolean;
    isStationary: boolean;
    currentIntervalMs: number;
    lastUpdate: LocationUpdate | null;
} => ({
    isTracking: state.watchId !== null || state.updateInterval !== null,
    isStationary: state.isStationary,
    currentIntervalMs: state.currentIntervalMs,
    lastUpdate: state.lastUpdate
});
