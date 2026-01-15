/**
 * Beckn Protocol Adapter for UMG (Unified Mobility Grid)
 * 
 * ONDC-compliant mobility integration layer implementing:
 * - Discovery (search for rides across networks)
 * - Order Management (book from any provider)
 * - Fulfillment (tracking across platforms)
 * - Rating & Settlement
 * 
 * Based on: https://beckn.org/
 */

import { getAuthToken, getCurrentUser } from './authService';

// Beckn Protocol Version
const BECKN_VERSION = '1.1.0';
const CONTEXT_DOMAIN = 'nic2004:60221'; // Mobility domain code

// Network Participants (BAP/BPP Registry)
const NETWORK_REGISTRY = {
    NAMMA_YATRI: {
        id: 'namma-yatri.in',
        name: 'Namma Yatri',
        type: 'BPP',
        supportedModes: ['AUTO', 'TAXI'],
        baseUrl: 'https://api.nammayatri.in/beckn'
    },
    REDBUS: {
        id: 'redbus.in',
        name: 'RedBus',
        type: 'BPP',
        supportedModes: ['BUS'],
        baseUrl: 'https://api.redbus.in/beckn'
    },
    KSRTC: {
        id: 'ksrtc.in',
        name: 'KSRTC',
        type: 'BPP',
        supportedModes: ['BUS'],
        baseUrl: 'https://api.ksrtc.in/beckn'
    },
    VILLAGE_LINK: {
        id: 'villagelink.in',
        name: 'VillageLink',
        type: 'BAP', // We act as Buyer Application Platform
        supportedModes: ['BUS', 'AUTO', 'SHARE_AUTO'],
        baseUrl: '/api/beckn'
    }
};

// --- TYPES ---

export interface BecknContext {
    domain: string;
    country: string;
    city: string;
    action: string;
    core_version: string;
    bap_id: string;
    bap_uri: string;
    bpp_id?: string;
    bpp_uri?: string;
    transaction_id: string;
    message_id: string;
    timestamp: string;
}

export interface BecknSearchIntent {
    fulfillment: {
        type: string;
        start: {
            location: { gps: string };
            time?: { range?: { start: string; end: string } };
        };
        end: {
            location: { gps: string };
        };
    };
}

export interface BecknCatalog {
    descriptor: { name: string };
    providers: BecknProvider[];
}

export interface BecknProvider {
    id: string;
    descriptor: { name: string; short_desc?: string; images?: string[] };
    categories?: { id: string; descriptor: { name: string } }[];
    items: BecknItem[];
    fulfillments?: BecknFulfillment[];
}

export interface BecknItem {
    id: string;
    descriptor: { name: string; short_desc?: string; code?: string };
    price: { currency: string; value: string };
    category_id?: string;
    fulfillment_id?: string;
    time?: { duration: string };
}

export interface BecknFulfillment {
    id: string;
    type: string;
    tracking?: boolean;
    start: { location: { gps: string; descriptor?: { name: string } } };
    end: { location: { gps: string; descriptor?: { name: string } } };
    state?: { descriptor: { code: string; name: string } };
    agent?: {
        name: string;
        phone?: string;
        rating?: string;
    };
    vehicle?: {
        registration: string;
        category?: string;
    };
}

export interface BecknOrder {
    id: string;
    state: string;
    provider: { id: string; descriptor: { name: string } };
    items: { id: string; quantity: { count: number } }[];
    fulfillment: BecknFulfillment;
    quote: {
        price: { currency: string; value: string };
        breakup?: { title: string; price: { currency: string; value: string } }[];
    };
    payment: {
        type: string;
        status: string;
        params?: { amount: string; currency: string };
    };
}

export interface NetworkProvider {
    id: string;
    name: string;
    modes: string[];
    rating: number;
    isOndc: boolean;
}

export interface UnifiedRideOption {
    id: string;
    provider: NetworkProvider;
    mode: string;
    fare: number;
    currency: string;
    eta: number;
    duration: number;
    distance: number;
    vehicle?: {
        type: string;
        registration?: string;
        capacity?: number;
    };
    driver?: {
        name: string;
        rating: number;
        phone?: string;
    };
    isOndcCompliant: boolean;
}

// --- HELPER FUNCTIONS ---

function generateTransactionId(): string {
    return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

function formatGPS(lat: number, lng: number): string {
    return `${lat.toFixed(6)},${lng.toFixed(6)}`;
}

function parseGPS(gps: string): { lat: number; lng: number } {
    const [lat, lng] = gps.split(',').map(Number);
    return { lat, lng };
}

function createContext(action: string, bppId?: string): BecknContext {
    return {
        domain: CONTEXT_DOMAIN,
        country: 'IND',
        city: 'std:080', // Bangalore by default
        action,
        core_version: BECKN_VERSION,
        bap_id: NETWORK_REGISTRY.VILLAGE_LINK.id,
        bap_uri: NETWORK_REGISTRY.VILLAGE_LINK.baseUrl,
        bpp_id: bppId,
        bpp_uri: bppId ? NETWORK_REGISTRY[bppId as keyof typeof NETWORK_REGISTRY]?.baseUrl : undefined,
        transaction_id: generateTransactionId(),
        message_id: generateMessageId(),
        timestamp: new Date().toISOString()
    };
}

// --- BECKN PROTOCOL ACTIONS ---

/**
 * Search for rides across all ONDC network providers
 */
export async function becknSearch(
    pickup: { lat: number; lng: number; name?: string },
    dropoff: { lat: number; lng: number; name?: string },
    mode?: string
): Promise<UnifiedRideOption[]> {
    const context = createContext('search');

    const searchIntent: BecknSearchIntent = {
        fulfillment: {
            type: mode || 'RIDE',
            start: {
                location: { gps: formatGPS(pickup.lat, pickup.lng) }
            },
            end: {
                location: { gps: formatGPS(dropoff.lat, dropoff.lng) }
            }
        }
    };

    try {
        // In production, this would fan out to all registered BPPs
        // For now, simulate responses from multiple providers
        const responses = await Promise.allSettled([
            searchNammaYatri(searchIntent),
            searchRedBus(searchIntent),
            searchLocalProviders(searchIntent)
        ]);

        const allOptions: UnifiedRideOption[] = [];

        for (const response of responses) {
            if (response.status === 'fulfilled' && response.value) {
                allOptions.push(...response.value);
            }
        }

        // Sort by fare (cheapest first)
        return allOptions.sort((a, b) => a.fare - b.fare);
    } catch (error) {
        console.error('Beckn search failed:', error);
        return [];
    }
}

/**
 * Simulate Namma Yatri search response
 */
async function searchNammaYatri(intent: BecknSearchIntent): Promise<UnifiedRideOption[]> {
    // Simulated response - in production, call actual Beckn API
    const pickup = parseGPS(intent.fulfillment.start.location.gps);
    const dropoff = parseGPS(intent.fulfillment.end.location.gps);

    const distance = calculateDistance(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng);

    return [
        {
            id: `ny_auto_${Date.now()}`,
            provider: {
                id: 'namma-yatri.in',
                name: 'Namma Yatri',
                modes: ['AUTO', 'TAXI'],
                rating: 4.5,
                isOndc: true
            },
            mode: 'AUTO',
            fare: Math.round(25 + distance * 12),
            currency: 'INR',
            eta: 3,
            duration: Math.round(distance * 3),
            distance,
            vehicle: { type: 'AUTO', capacity: 3 },
            isOndcCompliant: true
        }
    ];
}

/**
 * Simulate RedBus search response
 */
async function searchRedBus(intent: BecknSearchIntent): Promise<UnifiedRideOption[]> {
    const pickup = parseGPS(intent.fulfillment.start.location.gps);
    const dropoff = parseGPS(intent.fulfillment.end.location.gps);

    const distance = calculateDistance(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng);

    // Only return bus options for longer distances
    if (distance < 5) return [];

    return [
        {
            id: `rb_bus_${Date.now()}`,
            provider: {
                id: 'redbus.in',
                name: 'RedBus',
                modes: ['BUS'],
                rating: 4.2,
                isOndc: true
            },
            mode: 'BUS',
            fare: Math.round(10 + distance * 2),
            currency: 'INR',
            eta: 15,
            duration: Math.round(distance * 4),
            distance,
            vehicle: { type: 'AC_BUS', capacity: 40 },
            isOndcCompliant: true
        }
    ];
}

/**
 * Search local VillageLink providers
 */
async function searchLocalProviders(intent: BecknSearchIntent): Promise<UnifiedRideOption[]> {
    const pickup = parseGPS(intent.fulfillment.start.location.gps);
    const dropoff = parseGPS(intent.fulfillment.end.location.gps);

    const distance = calculateDistance(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng);

    return [
        {
            id: `vl_auto_${Date.now()}`,
            provider: {
                id: 'villagelink.in',
                name: 'VillageLink',
                modes: ['AUTO', 'SHARE_AUTO', 'BUS'],
                rating: 4.3,
                isOndc: true
            },
            mode: 'AUTO',
            fare: Math.round(20 + distance * 10), // Cheaper local rates
            currency: 'INR',
            eta: 5,
            duration: Math.round(distance * 3),
            distance,
            vehicle: { type: 'AUTO', capacity: 3 },
            isOndcCompliant: true
        },
        {
            id: `vl_share_${Date.now()}`,
            provider: {
                id: 'villagelink.in',
                name: 'VillageLink Share',
                modes: ['SHARE_AUTO'],
                rating: 4.1,
                isOndc: true
            },
            mode: 'SHARE_AUTO',
            fare: Math.round(10 + distance * 5), // Even cheaper shared
            currency: 'INR',
            eta: 8,
            duration: Math.round(distance * 4),
            distance,
            vehicle: { type: 'SHARE_AUTO', capacity: 6 },
            isOndcCompliant: true
        }
    ];
}

/**
 * Select a specific ride option (Beckn select action)
 */
export async function becknSelect(option: UnifiedRideOption): Promise<BecknOrder | null> {
    const context = createContext('select', option.provider.id);

    try {
        // Create order from selection
        const order: BecknOrder = {
            id: `order_${Date.now()}`,
            state: 'CREATED',
            provider: {
                id: option.provider.id,
                descriptor: { name: option.provider.name }
            },
            items: [{ id: option.id, quantity: { count: 1 } }],
            fulfillment: {
                id: `fulfill_${Date.now()}`,
                type: option.mode,
                tracking: true,
                start: { location: { gps: '0,0' } },
                end: { location: { gps: '0,0' } }
            },
            quote: {
                price: { currency: option.currency, value: option.fare.toString() },
                breakup: [
                    { title: 'Base Fare', price: { currency: 'INR', value: '20' } },
                    { title: 'Distance Charge', price: { currency: 'INR', value: (option.fare - 20).toString() } }
                ]
            },
            payment: {
                type: 'PRE-FULFILLMENT',
                status: 'NOT-PAID'
            }
        };

        return order;
    } catch (error) {
        console.error('Beckn select failed:', error);
        return null;
    }
}

/**
 * Initialize/Confirm a booking (Beckn init + confirm)
 */
export async function becknConfirm(
    order: BecknOrder,
    payment: { method: string; transactionId?: string }
): Promise<BecknOrder | null> {
    const context = createContext('confirm', order.provider.id);

    try {
        // Update payment status
        order.payment = {
            type: payment.method === 'WALLET' ? 'PRE-FULFILLMENT' : 'ON-ORDER',
            status: 'PAID',
            params: {
                amount: order.quote.price.value,
                currency: 'INR'
            }
        };

        order.state = 'CONFIRMED';

        return order;
    } catch (error) {
        console.error('Beckn confirm failed:', error);
        return null;
    }
}

/**
 * Get order status (Beckn status action)
 */
export async function becknStatus(orderId: string): Promise<BecknOrder | null> {
    try {
        // In production, query the BPP for actual status
        // For now, return mock status
        return null;
    } catch (error) {
        console.error('Beckn status failed:', error);
        return null;
    }
}

/**
 * Track fulfillment in real-time
 */
export async function becknTrack(orderId: string): Promise<{
    lat: number;
    lng: number;
    eta: number;
    status: string;
} | null> {
    try {
        // In production, subscribe to BPP tracking updates
        return null;
    } catch (error) {
        console.error('Beckn track failed:', error);
        return null;
    }
}

/**
 * Cancel an order (Beckn cancel action)
 */
export async function becknCancel(
    orderId: string,
    reason: string
): Promise<boolean> {
    try {
        // In production, send cancel request to BPP
        return true;
    } catch (error) {
        console.error('Beckn cancel failed:', error);
        return false;
    }
}

/**
 * Submit rating after trip completion
 */
export async function becknRating(
    orderId: string,
    rating: number,
    feedback?: string
): Promise<boolean> {
    try {
        // In production, submit rating to BPP
        return true;
    } catch (error) {
        console.error('Beckn rating failed:', error);
        return false;
    }
}

// --- NETWORK UTILITIES ---

/**
 * Get all available network providers
 */
export function getNetworkProviders(): NetworkProvider[] {
    return Object.values(NETWORK_REGISTRY).map(reg => ({
        id: reg.id,
        name: reg.name,
        modes: reg.supportedModes,
        rating: 4.0 + Math.random() * 0.5,
        isOndc: true
    }));
}

/**
 * Check if a provider supports a specific mode
 */
export function providerSupportsMode(providerId: string, mode: string): boolean {
    const provider = Object.values(NETWORK_REGISTRY).find(p => p.id === providerId);
    return provider?.supportedModes.includes(mode) || false;
}

/**
 * Calculate distance between two points
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Format ride option for display
 */
export function formatRideOption(option: UnifiedRideOption): {
    title: string;
    subtitle: string;
    priceLabel: string;
    etaLabel: string;
    badge?: string;
} {
    return {
        title: `${option.provider.name} ${option.mode}`,
        subtitle: `${option.duration} min • ${option.distance.toFixed(1)} km`,
        priceLabel: `₹${option.fare}`,
        etaLabel: `${option.eta} min away`,
        badge: option.isOndcCompliant ? 'ONDC' : undefined
    };
}
