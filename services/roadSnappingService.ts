/**
 * Road Snapping Service
 * Snaps GPS coordinates to nearest road for improved tracking accuracy
 * Uses OSRM Match API for road matching
 */

import { API_BASE_URL } from '../config';

// Types
export interface Coordinate {
    lat: number;
    lng: number;
    timestamp?: number;
    accuracy?: number;
}

export interface SnappedCoordinate extends Coordinate {
    originalLat: number;
    originalLng: number;
    distanceSnapped: number;  // meters from original
    roadName?: string;
    confidence: number;  // 0-1
}

export interface RouteMatch {
    snappedPoints: SnappedCoordinate[];
    matchedDistance: number;  // km
    duration: number;  // seconds
    confidence: number;
}

// Constants
const OSRM_API = 'https://router.project-osrm.org/match/v1/driving';
const MAX_SNAP_DISTANCE = 50;  // meters - don't snap if further
const MIN_POINTS_FOR_MATCH = 3;

// Cache for recent snaps
const snapCache = new Map<string, SnappedCoordinate>();
const CACHE_TTL_MS = 5000;  // 5 seconds

/**
 * Calculate distance between two coordinates in meters
 */
const haversineDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371000;  // Earth radius in meters
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLng = (lng2 - lng1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

/**
 * Create cache key for coordinate
 */
const cacheKey = (lat: number, lng: number): string => {
    return `${lat.toFixed(5)}_${lng.toFixed(5)}`;
};

/**
 * Snap single coordinate to nearest road using cache
 */
export const snapToRoad = async (coord: Coordinate): Promise<SnappedCoordinate> => {
    const key = cacheKey(coord.lat, coord.lng);

    // Check cache
    if (snapCache.has(key)) {
        const cached = snapCache.get(key)!;
        return cached;
    }

    // Use OSRM nearest endpoint for single point
    try {
        const response = await fetch(
            `https://router.project-osrm.org/nearest/v1/driving/${coord.lng},${coord.lat}`,
            { signal: AbortSignal.timeout(3000) }
        );

        if (!response.ok) {
            return { ...coord, originalLat: coord.lat, originalLng: coord.lng, distanceSnapped: 0, confidence: 0 };
        }

        const data = await response.json();

        if (data.waypoints && data.waypoints.length > 0) {
            const waypoint = data.waypoints[0];
            const snappedLat = waypoint.location[1];
            const snappedLng = waypoint.location[0];
            const distanceSnapped = haversineDistance(coord.lat, coord.lng, snappedLat, snappedLng);

            // Don't snap if too far
            if (distanceSnapped > MAX_SNAP_DISTANCE) {
                return { ...coord, originalLat: coord.lat, originalLng: coord.lng, distanceSnapped: 0, confidence: 0 };
            }

            const snapped: SnappedCoordinate = {
                lat: snappedLat,
                lng: snappedLng,
                originalLat: coord.lat,
                originalLng: coord.lng,
                distanceSnapped,
                roadName: waypoint.name || undefined,
                confidence: Math.max(0, 1 - (distanceSnapped / MAX_SNAP_DISTANCE)),
                timestamp: coord.timestamp
            };

            // Cache the result
            snapCache.set(key, snapped);
            setTimeout(() => snapCache.delete(key), CACHE_TTL_MS);

            return snapped;
        }
    } catch (error) {
        console.error('Road snap failed:', error);
    }

    return { ...coord, originalLat: coord.lat, originalLng: coord.lng, distanceSnapped: 0, confidence: 0 };
};

/**
 * Snap multiple coordinates to road using OSRM Match
 * Better for continuous tracking data
 */
export const snapTrajectoryToRoad = async (coords: Coordinate[]): Promise<RouteMatch | null> => {
    if (coords.length < MIN_POINTS_FOR_MATCH) {
        // Fall back to individual snapping
        const snapped = await Promise.all(coords.map(c => snapToRoad(c)));
        return {
            snappedPoints: snapped,
            matchedDistance: 0,
            duration: 0,
            confidence: snapped.reduce((sum, s) => sum + s.confidence, 0) / snapped.length
        };
    }

    try {
        // Format coordinates for OSRM
        const coordString = coords.map(c => `${c.lng},${c.lat}`).join(';');
        const timestamps = coords.map(c => c.timestamp || Date.now()).join(';');
        const radiuses = coords.map(c => c.accuracy || 10).join(';');

        const url = `${OSRM_API}/${coordString}?timestamps=${timestamps}&radiuses=${radiuses}&geometries=geojson&overview=full`;

        const response = await fetch(url, { signal: AbortSignal.timeout(5000) });

        if (!response.ok) {
            console.warn('OSRM Match API error:', response.status);
            return null;
        }

        const data = await response.json();

        if (data.code !== 'Ok' || !data.matchings || data.matchings.length === 0) {
            return null;
        }

        const matching = data.matchings[0];
        const geometry = matching.geometry;
        const tracepoints = data.tracepoints;

        // Build snapped points
        const snappedPoints: SnappedCoordinate[] = [];

        for (let i = 0; i < coords.length; i++) {
            const original = coords[i];
            const tracepoint = tracepoints[i];

            if (tracepoint) {
                const snappedLat = tracepoint.location[1];
                const snappedLng = tracepoint.location[0];
                const distanceSnapped = haversineDistance(original.lat, original.lng, snappedLat, snappedLng);

                snappedPoints.push({
                    lat: snappedLat,
                    lng: snappedLng,
                    originalLat: original.lat,
                    originalLng: original.lng,
                    distanceSnapped,
                    roadName: tracepoint.name || undefined,
                    confidence: 1 - (distanceSnapped / MAX_SNAP_DISTANCE),
                    timestamp: original.timestamp
                });
            } else {
                // Point couldn't be matched, use original
                snappedPoints.push({
                    ...original,
                    originalLat: original.lat,
                    originalLng: original.lng,
                    distanceSnapped: 0,
                    confidence: 0
                });
            }
        }

        return {
            snappedPoints,
            matchedDistance: (matching.distance || 0) / 1000,  // Convert to km
            duration: matching.duration || 0,
            confidence: matching.confidence || 0
        };
    } catch (error) {
        console.error('Trajectory snap failed:', error);
        return null;
    }
};

/**
 * Snap to known route (when we have the expected route polyline)
 * More accurate as it uses the known path
 */
export const snapToKnownRoute = (
    coord: Coordinate,
    routePolyline: Coordinate[]
): SnappedCoordinate => {
    if (routePolyline.length < 2) {
        return { ...coord, originalLat: coord.lat, originalLng: coord.lng, distanceSnapped: 0, confidence: 0 };
    }

    let minDistance = Infinity;
    let closestPoint: Coordinate = coord;
    let closestSegmentIndex = 0;

    // Find closest point on route polyline
    for (let i = 0; i < routePolyline.length - 1; i++) {
        const p1 = routePolyline[i];
        const p2 = routePolyline[i + 1];

        // Find closest point on segment
        const closest = closestPointOnSegment(coord, p1, p2);
        const distance = haversineDistance(coord.lat, coord.lng, closest.lat, closest.lng);

        if (distance < minDistance) {
            minDistance = distance;
            closestPoint = closest;
            closestSegmentIndex = i;
        }
    }

    // Don't snap if too far from route
    if (minDistance > MAX_SNAP_DISTANCE) {
        return {
            ...coord,
            originalLat: coord.lat,
            originalLng: coord.lng,
            distanceSnapped: minDistance,
            confidence: 0
        };
    }

    return {
        lat: closestPoint.lat,
        lng: closestPoint.lng,
        originalLat: coord.lat,
        originalLng: coord.lng,
        distanceSnapped: minDistance,
        confidence: 1 - (minDistance / MAX_SNAP_DISTANCE),
        timestamp: coord.timestamp
    };
};

/**
 * Find closest point on a line segment
 */
const closestPointOnSegment = (
    point: Coordinate,
    segStart: Coordinate,
    segEnd: Coordinate
): Coordinate => {
    const dx = segEnd.lng - segStart.lng;
    const dy = segEnd.lat - segStart.lat;

    if (dx === 0 && dy === 0) {
        return segStart;
    }

    const t = Math.max(0, Math.min(1,
        ((point.lng - segStart.lng) * dx + (point.lat - segStart.lat) * dy) / (dx * dx + dy * dy)
    ));

    return {
        lat: segStart.lat + t * dy,
        lng: segStart.lng + t * dx
    };
};

/**
 * Calculate distance along route from start to snapped position
 */
export const getDistanceAlongRoute = (
    snappedPoint: SnappedCoordinate,
    routePolyline: Coordinate[]
): number => {
    let totalDistance = 0;
    let minDistToSnapped = Infinity;
    let distanceAtSnap = 0;

    for (let i = 0; i < routePolyline.length - 1; i++) {
        const p1 = routePolyline[i];
        const p2 = routePolyline[i + 1];
        const segmentLength = haversineDistance(p1.lat, p1.lng, p2.lat, p2.lng);

        // Check if snapped point is on this segment
        const distToSnapped = haversineDistance(p1.lat, p1.lng, snappedPoint.lat, snappedPoint.lng);

        if (distToSnapped < minDistToSnapped) {
            minDistToSnapped = distToSnapped;
            distanceAtSnap = totalDistance + distToSnapped;
        }

        totalDistance += segmentLength;
    }

    return distanceAtSnap / 1000;  // Return in km
};

/**
 * Enhanced GPS coordinate with road snapping for driver tracking
 */
export const enhanceDriverLocation = async (
    rawCoord: Coordinate,
    knownRoute?: Coordinate[]
): Promise<{
    snapped: SnappedCoordinate;
    distanceAlongRoute?: number;
    isOnRoute: boolean;
}> => {
    let snapped: SnappedCoordinate;

    // If we have a known route, use it for better accuracy
    if (knownRoute && knownRoute.length >= 2) {
        snapped = snapToKnownRoute(rawCoord, knownRoute);
    } else {
        // Fall back to OSRM road snapping
        snapped = await snapToRoad(rawCoord);
    }

    const isOnRoute = snapped.confidence > 0.5;

    let distanceAlongRoute: number | undefined;
    if (knownRoute && isOnRoute) {
        distanceAlongRoute = getDistanceAlongRoute(snapped, knownRoute);
    }

    return { snapped, distanceAlongRoute, isOnRoute };
};

// Clear snap cache
export const clearSnapCache = (): void => {
    snapCache.clear();
};

export default {
    snapToRoad,
    snapTrajectoryToRoad,
    snapToKnownRoute,
    getDistanceAlongRoute,
    enhanceDriverLocation,
    clearSnapCache
};
