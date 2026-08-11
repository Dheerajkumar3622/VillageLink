/**
 * Share Auto Service for UMG (Unified Mobility Grid)
 * 
 * Handles First Mile Last Connectivity (FLMC) through:
 * - Share auto route discovery
 * - Real-time occupancy tracking
 * - Fare splitting for shared rides
 * - Integration with transit hubs
 */

import { API_BASE_URL } from '../config';
import { getAuthToken, getCurrentUser } from './authService';

// --- TYPES ---

export interface ShareAutoRoute {
    id: string;
    routeName: string;
    routeCode: string;
    stops: ShareAutoStop[];
    baseFare: number;
    farePerKm: number;
    operatingHours: {
        start: string; // "06:00"
        end: string;   // "22:00"
    };
    frequency: number; // minutes between autos
    isActive: boolean;
}

export interface ShareAutoStop {
    id: string;
    name: string;
    lat: number;
    lng: number;
    order: number;
    isTransitHub: boolean;
    transitConnections?: string[]; // ["METRO_BLUE_LINE", "BUS_66A"]
}

export interface ShareAutoVehicle {
    id: string;
    driverId: string;
    driverName: string;
    vehicleNumber: string;
    routeId: string;
    currentLocation: {
        lat: number;
        lng: number;
        heading: number;
        speed: number;
        updatedAt: number;
    };
    capacity: number;
    currentOccupancy: number;
    nextStop: ShareAutoStop;
    eta: number; // seconds to next stop
    status: 'MOVING' | 'WAITING' | 'FULL' | 'OFFLINE';
}

export interface FLMCBooking {
    id: string;
    userId: string;
    type: 'FIRST_MILE' | 'LAST_MILE';
    shareAutoId?: string;
    pickupStop: ShareAutoStop;
    dropStop: ShareAutoStop;
    fare: number;
    status: 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    transitConnection?: {
        mode: string;
        line: string;
        station: string;
        eta: number;
    };
    createdAt: number;
}

export interface MultimodalJourney {
    id: string;
    segments: JourneySegment[];
    totalFare: number;
    totalDuration: number;
    totalDistance: number;
}

export interface JourneySegment {
    mode: 'WALK' | 'SHARE_AUTO' | 'BUS' | 'METRO' | 'AUTO';
    from: { name: string; lat: number; lng: number };
    to: { name: string; lat: number; lng: number };
    duration: number; // minutes
    distance: number; // km
    fare: number;
    details?: {
        routeNumber?: string;
        vehicleId?: string;
        eta?: number;
        occupancy?: number;
    };
}

// --- HELPER FUNCTIONS ---

function getHeaders(): HeadersInit {
    const token = getAuthToken();
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// --- ROUTE DISCOVERY ---

/**
 * Find share auto routes near a location
 */
export async function findNearbyRoutes(
    lat: number,
    lng: number,
    radiusKm: number = 1
): Promise<ShareAutoRoute[]> {
    try {
        const res = await fetch(
            `${API_BASE_URL}/api/share-auto/routes/nearby?lat=${lat}&lng=${lng}&radius=${radiusKm}`,
            { headers: getHeaders() }
        );

        if (!res.ok) return [];
        return await res.json();
    } catch {
        // Return mock data for development
        return getMockRoutes(lat, lng);
    }
}

/**
 * Get a specific route by ID
 */
export async function getRouteById(routeId: string): Promise<ShareAutoRoute | null> {
    try {
        const res = await fetch(
            `${API_BASE_URL}/api/share-auto/routes/${routeId}`,
            { headers: getHeaders() }
        );

        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    }
}

/**
 * Get all active vehicles on a route
 */
export async function getVehiclesOnRoute(routeId: string): Promise<ShareAutoVehicle[]> {
    try {
        const res = await fetch(
            `${API_BASE_URL}/api/share-auto/routes/${routeId}/vehicles`,
            { headers: getHeaders() }
        );

        if (!res.ok) return [];
        return await res.json();
    } catch {
        return getMockVehicles(routeId);
    }
}

// --- FLMC BOOKING ---

/**
 * Calculate fare for a share auto segment
 */
export function calculateShareAutoFare(
    route: ShareAutoRoute,
    fromStop: ShareAutoStop,
    toStop: ShareAutoStop
): number {
    const distance = calculateDistance(
        fromStop.lat, fromStop.lng,
        toStop.lat, toStop.lng
    );
    return Math.round(route.baseFare + (distance * route.farePerKm));
}

/**
 * Book a first/last mile connection
 */
export async function bookFLMC(
    type: 'FIRST_MILE' | 'LAST_MILE',
    pickupStop: ShareAutoStop,
    dropStop: ShareAutoStop,
    transitConnection?: FLMCBooking['transitConnection']
): Promise<FLMCBooking> {
    const res = await fetch(`${API_BASE_URL}/api/share-auto/book`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
            type,
            pickupStopId: pickupStop.id,
            dropStopId: dropStop.id,
            transitConnection
        })
    });

    if (!res.ok) {
        throw new Error('Failed to book FLMC');
    }

    return await res.json();
}

// --- MULTIMODAL JOURNEY PLANNING ---

/**
 * Plan a complete multimodal journey
 */
export async function planMultimodalJourney(
    origin: { lat: number; lng: number; name: string },
    destination: { lat: number; lng: number; name: string }
): Promise<MultimodalJourney[]> {
    try {
        const res = await fetch(`${API_BASE_URL}/api/journey/plan`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ origin, destination })
        });

        if (!res.ok) {
            // Fallback to local planning
            return [await planJourneyLocally(origin, destination)];
        }

        return await res.json();
    } catch {
        return [await planJourneyLocally(origin, destination)];
    }
}

/**
 * Local journey planning fallback
 */
async function planJourneyLocally(
    origin: { lat: number; lng: number; name: string },
    destination: { lat: number; lng: number; name: string }
): Promise<MultimodalJourney> {
    const totalDistance = calculateDistance(
        origin.lat, origin.lng,
        destination.lat, destination.lng
    );

    const segments: JourneySegment[] = [];

    if (totalDistance > 2) {
        // First mile by share auto
        segments.push({
            mode: 'SHARE_AUTO',
            from: origin,
            to: { name: 'Bus Stand', lat: origin.lat + 0.01, lng: origin.lng + 0.01 },
            duration: 5,
            distance: 1.5,
            fare: 15,
            details: { occupancy: 60 }
        });

        // Main journey by bus
        segments.push({
            mode: 'BUS',
            from: { name: 'Bus Stand', lat: origin.lat + 0.01, lng: origin.lng + 0.01 },
            to: { name: 'Bus Stop', lat: destination.lat - 0.005, lng: destination.lng - 0.005 },
            duration: Math.round(totalDistance * 3),
            distance: totalDistance - 2,
            fare: Math.round(10 + (totalDistance - 2) * 2.5),
            details: { routeNumber: '66A', occupancy: 75 }
        });

        // Last mile walk
        segments.push({
            mode: 'WALK',
            from: { name: 'Bus Stop', lat: destination.lat - 0.005, lng: destination.lng - 0.005 },
            to: destination,
            duration: 3,
            distance: 0.3,
            fare: 0
        });
    } else {
        // Short distance - direct auto
        segments.push({
            mode: 'AUTO',
            from: origin,
            to: destination,
            duration: Math.round(totalDistance * 3),
            distance: totalDistance,
            fare: Math.round(15 + totalDistance * 5)
        });
    }

    return {
        id: `journey_${Date.now()}`,
        segments,
        totalFare: segments.reduce((sum, s) => sum + s.fare, 0),
        totalDuration: segments.reduce((sum, s) => sum + s.duration, 0),
        totalDistance: segments.reduce((sum, s) => sum + s.distance, 0)
    };
}

// --- TRANSIT HUB INTEGRATION ---

/**
 * Find transit connections at a hub
 */
export async function findTransitConnections(
    hubId: string
): Promise<{ mode: string; line: string; nextArrival: number }[]> {
    try {
        const res = await fetch(
            `${API_BASE_URL}/api/transit/hub/${hubId}/connections`,
            { headers: getHeaders() }
        );

        if (!res.ok) return [];
        return await res.json();
    } catch {
        return [
            { mode: 'BUS', line: '66A', nextArrival: 5 },
            { mode: 'BUS', line: '77B', nextArrival: 12 },
            { mode: 'METRO', line: 'Blue Line', nextArrival: 8 }
        ];
    }
}

// --- DRIVER FUNCTIONS (FREIGHT MODE) ---

/**
 * Toggle between passenger and freight mode
 */
export async function toggleFreightMode(
    driverId: string,
    enableFreight: boolean
): Promise<boolean> {
    const res = await fetch(`${API_BASE_URL}/api/driver/${driverId}/freight-mode`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ enableFreight })
    });

    return res.ok;
}

/**
 * Get available freight deliveries
 */
export async function getFreightDeliveries(
    lat: number,
    lng: number
): Promise<any[]> {
    try {
        const res = await fetch(
            `${API_BASE_URL}/api/freight/available?lat=${lat}&lng=${lng}`,
            { headers: getHeaders() }
        );

        if (!res.ok) return [];
        return await res.json();
    } catch {
        return [];
    }
}

// --- REAL CORRIDOR DATA FALLBACK ---

function getMockRoutes(lat: number, lng: number): ShareAutoRoute[] {
    const baseLat = lat || 25.5941;
    const baseLng = lng || 84.1200;
    return [
        {
            id: 'route_bagen_sasaram',
            routeName: 'Bagen - Dahiyar - Sasaram Line',
            routeCode: 'BR-SA-01',
            stops: [
                { id: 's1', name: 'Bagen Junction', lat: baseLat, lng: baseLng, order: 1, isTransitHub: true, transitConnections: ['BUS_BAGEN', 'AUTO_LOCAL'] },
                { id: 's2', name: 'Rampur Chowk', lat: baseLat - 0.044, lng: baseLng - 0.020, order: 2, isTransitHub: false },
                { id: 's3', name: 'Dahiyar Mode', lat: baseLat - 0.114, lng: baseLng - 0.040, order: 3, isTransitHub: true, transitConnections: ['HAWKER_BAZAAR'] },
                { id: 's4', name: 'Behrar Junction', lat: baseLat - 0.194, lng: baseLng - 0.060, order: 4, isTransitHub: false },
                { id: 's5', name: 'Khanda Mode', lat: baseLat - 0.294, lng: baseLng - 0.070, order: 5, isTransitHub: false },
                { id: 's6', name: 'Sasaram Railway Station', lat: 24.9500, lng: 84.0300, order: 6, isTransitHub: true, transitConnections: ['INDIAN_RAILWAYS', 'EXPRESS_BUS'] }
            ],
            baseFare: 10,
            farePerKm: 2,
            operatingHours: { start: '05:00', end: '22:00' },
            frequency: 5,
            isActive: true
        },
        {
            id: 'route_patna_ara',
            routeName: 'Patna - Bihta - Ara Highway Line',
            routeCode: 'BR-PA-02',
            stops: [
                { id: 's10', name: 'Patna Junction Terminal', lat: 25.5941, lng: 85.1376, order: 1, isTransitHub: true, transitConnections: ['PATNA_METRO', 'ISBT_BUS'] },
                { id: 's11', name: 'Danapur Cantt Mode', lat: 25.6100, lng: 85.0400, order: 2, isTransitHub: false },
                { id: 's12', name: 'Bihta Station Hub', lat: 25.5600, lng: 84.8700, order: 3, isTransitHub: true, transitConnections: ['IIT_PATNA_SHUTTLE'] },
                { id: 's13', name: 'Ara Junction Terminal', lat: 25.5560, lng: 84.6600, order: 4, isTransitHub: true, transitConnections: ['ECR_RAIL'] }
            ],
            baseFare: 15,
            farePerKm: 2,
            operatingHours: { start: '05:00', end: '23:00' },
            frequency: 10,
            isActive: true
        }
    ];
}

function getMockVehicles(routeId: string): ShareAutoVehicle[] {
    return [
        {
            id: 'v1',
            driverId: 'd1',
            driverName: 'Santosh Kumar',
            vehicleNumber: 'BR-24-PA-1088',
            routeId,
            currentLocation: { lat: 25.4800, lng: 84.0800, heading: 180, speed: 35, updatedAt: Date.now() },
            capacity: 10,
            currentOccupancy: 4,
            nextStop: { id: 's3', name: 'Dahiyar Mode', lat: 25.4800, lng: 84.0800, order: 3, isTransitHub: true },
            eta: 120,
            status: 'MOVING'
        },
        {
            id: 'v2',
            driverId: 'd2',
            driverName: 'Vikram Singh',
            vehicleNumber: 'BR-26-BA-5541',
            routeId,
            currentLocation: { lat: 25.4000, lng: 84.0600, heading: 180, speed: 0, updatedAt: Date.now() },
            capacity: 10,
            currentOccupancy: 6,
            nextStop: { id: 's4', name: 'Behrar Junction', lat: 25.4000, lng: 84.0600, order: 4, isTransitHub: false },
            eta: 240,
            status: 'WAITING'
        }
    ];
}

// --- UTILITY FUNCTIONS ---

/**
 * Get occupancy indicator
 */
export function getOccupancyIndicator(current: number, capacity: number): {
    level: 'LOW' | 'MEDIUM' | 'HIGH' | 'FULL';
    color: string;
    emoji: string;
    percentage: number;
} {
    const percentage = (current / capacity) * 100;

    if (percentage >= 100) {
        return { level: 'FULL', color: 'red', emoji: '🔴', percentage };
    } else if (percentage >= 70) {
        return { level: 'HIGH', color: 'orange', emoji: '🟠', percentage };
    } else if (percentage >= 40) {
        return { level: 'MEDIUM', color: 'yellow', emoji: '🟡', percentage };
    }
    return { level: 'LOW', color: 'green', emoji: '🟢', percentage };
}

/**
 * Format ETA for display
 */
export function formatETA(seconds: number): string {
    if (seconds < 60) return 'Arriving';
    const minutes = Math.ceil(seconds / 60);
    return `${minutes} min`;
}

/**
 * Get mode icon
 */
export function getModeIcon(mode: JourneySegment['mode']): string {
    switch (mode) {
        case 'WALK': return '🚶';
        case 'SHARE_AUTO': return '🛺';
        case 'AUTO': return '🛺';
        case 'BUS': return '🚌';
        case 'METRO': return '🚇';
        default: return '🚗';
    }
}
