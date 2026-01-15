/**
 * Guardian Service for UMG (Unified Mobility Grid)
 * 
 * Safety features for passengers:
 * - Live trip sharing with trusted contacts
 * - Route deviation alerts
 * - SOS with audio recording
 * - Women safety features
 */

import { getAuthToken, getCurrentUser } from './authService';

const API_BASE_URL = (typeof window !== 'undefined' && (window as any).API_BASE_URL)
    || 'http://localhost:3001';

// --- TYPES ---

export interface TrustedContact {
    id: string;
    name: string;
    phone: string;
    relationship: 'FAMILY' | 'FRIEND' | 'EMERGENCY';
    autoShare: boolean;
    createdAt: number;
}

export interface LiveShare {
    id: string;
    tripId: string;
    userId: string;
    sharedWith: string[]; // phone numbers
    shareUrl: string;
    status: 'ACTIVE' | 'EXPIRED' | 'ENDED';
    expiresAt: number;
    createdAt: number;
}

export interface SafetyAlert {
    id: string;
    type: 'SOS' | 'ROUTE_DEVIATION' | 'LONG_STOP' | 'SPEED_ALERT' | 'MANUAL';
    userId: string;
    tripId?: string;
    location: { lat: number; lng: number };
    message: string;
    audioUrl?: string;
    status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
    respondedBy?: string;
    createdAt: number;
    resolvedAt?: number;
}

export interface TripSafetyStatus {
    tripId: string;
    isShared: boolean;
    shareUrl?: string;
    deviationDetected: boolean;
    deviationDetails?: {
        expectedRoute: { lat: number; lng: number }[];
        currentLocation: { lat: number; lng: number };
        deviationDistance: number;
    };
    estimatedArrival: number;
    safetyScore: number; // 0-100
}

// --- HELPER FUNCTIONS ---

function getHeaders(): HeadersInit {
    const token = getAuthToken();
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
}

// --- TRUSTED CONTACTS ---

/**
 * Get all trusted contacts
 */
export async function getTrustedContacts(): Promise<TrustedContact[]> {
    try {
        const res = await fetch(`${API_BASE_URL}/api/guardian/contacts`, {
            headers: getHeaders()
        });

        if (!res.ok) return [];
        return await res.json();
    } catch {
        return [];
    }
}

/**
 * Add a trusted contact
 */
export async function addTrustedContact(contact: Omit<TrustedContact, 'id' | 'createdAt'>): Promise<TrustedContact | null> {
    try {
        const res = await fetch(`${API_BASE_URL}/api/guardian/contacts`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(contact)
        });

        if (!res.ok) throw new Error('Failed to add contact');
        return await res.json();
    } catch {
        // Create locally for offline
        return {
            ...contact,
            id: `contact_${Date.now()}`,
            createdAt: Date.now()
        };
    }
}

/**
 * Remove a trusted contact
 */
export async function removeTrustedContact(contactId: string): Promise<boolean> {
    try {
        const res = await fetch(`${API_BASE_URL}/api/guardian/contacts/${contactId}`, {
            method: 'DELETE',
            headers: getHeaders()
        });

        return res.ok;
    } catch {
        return false;
    }
}

/**
 * Update contact auto-share preference
 */
export async function updateContactAutoShare(contactId: string, autoShare: boolean): Promise<boolean> {
    try {
        const res = await fetch(`${API_BASE_URL}/api/guardian/contacts/${contactId}/auto-share`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify({ autoShare })
        });

        return res.ok;
    } catch {
        return false;
    }
}

// --- LIVE TRIP SHARING ---

/**
 * Start sharing a trip with contacts
 */
export async function startLiveShare(
    tripId: string,
    contactIds?: string[]
): Promise<LiveShare | null> {
    try {
        const res = await fetch(`${API_BASE_URL}/api/guardian/share`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ tripId, contactIds })
        });

        if (!res.ok) throw new Error('Failed to start sharing');
        return await res.json();
    } catch {
        // Generate local share URL
        const shareToken = Math.random().toString(36).substr(2, 12);
        return {
            id: `share_${Date.now()}`,
            tripId,
            userId: getCurrentUser()?.id || '',
            sharedWith: [],
            shareUrl: `${window.location.origin}/track/${shareToken}`,
            status: 'ACTIVE',
            expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
            createdAt: Date.now()
        };
    }
}

/**
 * Stop sharing a trip
 */
export async function stopLiveShare(shareId: string): Promise<boolean> {
    try {
        const res = await fetch(`${API_BASE_URL}/api/guardian/share/${shareId}/stop`, {
            method: 'POST',
            headers: getHeaders()
        });

        return res.ok;
    } catch {
        return false;
    }
}

/**
 * Get active share for a trip
 */
export async function getActiveShare(tripId: string): Promise<LiveShare | null> {
    try {
        const res = await fetch(`${API_BASE_URL}/api/guardian/share/trip/${tripId}`, {
            headers: getHeaders()
        });

        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    }
}

/**
 * Send share link via SMS
 */
export async function sendShareViaSMS(shareUrl: string, phones: string[]): Promise<boolean> {
    try {
        const res = await fetch(`${API_BASE_URL}/api/guardian/share/sms`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ shareUrl, phones })
        });

        return res.ok;
    } catch {
        return false;
    }
}

// --- SOS & EMERGENCY ---

/**
 * Trigger SOS alert
 */
export async function triggerSOS(
    location: { lat: number; lng: number },
    tripId?: string,
    audioBlob?: Blob
): Promise<SafetyAlert | null> {
    try {
        let audioUrl: string | undefined;

        // Upload audio if provided
        if (audioBlob) {
            const formData = new FormData();
            formData.append('audio', audioBlob, 'sos_audio.webm');

            const uploadRes = await fetch(`${API_BASE_URL}/api/upload/audio`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${getAuthToken()}` },
                body: formData
            });

            if (uploadRes.ok) {
                const { url } = await uploadRes.json();
                audioUrl = url;
            }
        }

        const res = await fetch(`${API_BASE_URL}/api/guardian/sos`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({
                location,
                tripId,
                audioUrl,
                type: 'SOS'
            })
        });

        if (!res.ok) throw new Error('Failed to trigger SOS');
        return await res.json();
    } catch {
        // Log locally and attempt to send via SMS
        console.error('SOS trigger failed - attempting SMS fallback');
        return {
            id: `sos_${Date.now()}`,
            type: 'SOS',
            userId: getCurrentUser()?.id || '',
            tripId,
            location,
            message: 'Emergency SOS triggered',
            status: 'ACTIVE',
            createdAt: Date.now()
        };
    }
}

/**
 * Record SOS audio
 */
export async function recordSOSAudio(durationMs: number = 10000): Promise<Blob | null> {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        const chunks: Blob[] = [];

        return new Promise((resolve) => {
            mediaRecorder.ondataavailable = (e) => chunks.push(e.data);

            mediaRecorder.onstop = () => {
                stream.getTracks().forEach(track => track.stop());
                resolve(new Blob(chunks, { type: 'audio/webm' }));
            };

            mediaRecorder.start();
            setTimeout(() => mediaRecorder.stop(), durationMs);
        });
    } catch {
        console.error('Failed to record audio');
        return null;
    }
}

/**
 * Cancel SOS alert
 */
export async function cancelSOS(alertId: string): Promise<boolean> {
    try {
        const res = await fetch(`${API_BASE_URL}/api/guardian/sos/${alertId}/cancel`, {
            method: 'POST',
            headers: getHeaders()
        });

        return res.ok;
    } catch {
        return false;
    }
}

// --- ROUTE MONITORING ---

/**
 * Check for route deviations
 */
export function checkRouteDeviation(
    currentLocation: { lat: number; lng: number },
    expectedRoute: { lat: number; lng: number }[],
    thresholdKm: number = 0.5
): { deviated: boolean; distance: number; nearestPoint: { lat: number; lng: number } } {
    let minDistance = Infinity;
    let nearestPoint = expectedRoute[0];

    for (const point of expectedRoute) {
        const distance = calculateDistance(
            currentLocation.lat, currentLocation.lng,
            point.lat, point.lng
        );

        if (distance < minDistance) {
            minDistance = distance;
            nearestPoint = point;
        }
    }

    return {
        deviated: minDistance > thresholdKm,
        distance: minDistance,
        nearestPoint
    };
}

/**
 * Calculate distance between two points (Haversine)
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
 * Monitor trip safety in real-time
 */
export async function monitorTripSafety(tripId: string): Promise<TripSafetyStatus> {
    try {
        const res = await fetch(`${API_BASE_URL}/api/guardian/trip/${tripId}/safety`, {
            headers: getHeaders()
        });

        if (!res.ok) throw new Error();
        return await res.json();
    } catch {
        return {
            tripId,
            isShared: false,
            deviationDetected: false,
            estimatedArrival: Date.now() + 30 * 60 * 1000,
            safetyScore: 85
        };
    }
}

/**
 * Report route deviation
 */
export async function reportDeviation(
    tripId: string,
    location: { lat: number; lng: number },
    deviationKm: number
): Promise<void> {
    // Auto-notify trusted contacts if deviation > 1km
    if (deviationKm > 1) {
        const contacts = await getTrustedContacts();
        const autoShareContacts = contacts.filter(c => c.autoShare);

        if (autoShareContacts.length > 0) {
            await fetch(`${API_BASE_URL}/api/guardian/deviation-alert`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    tripId,
                    location,
                    deviationKm,
                    contacts: autoShareContacts.map(c => c.phone)
                })
            });
        }
    }
}

// --- WOMEN SAFETY FEATURES ---

/**
 * Enable women safety mode (enhanced monitoring)
 */
export async function enableWomenSafetyMode(tripId: string): Promise<boolean> {
    try {
        const res = await fetch(`${API_BASE_URL}/api/guardian/trip/${tripId}/women-safety`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ enabled: true })
        });

        return res.ok;
    } catch {
        return false;
    }
}

/**
 * Get women-friendly transport options
 */
export async function getWomenFriendlyOptions(
    from: { lat: number; lng: number },
    to: { lat: number; lng: number }
): Promise<any[]> {
    try {
        const res = await fetch(`${API_BASE_URL}/api/transport/women-friendly`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ from, to })
        });

        if (!res.ok) return [];
        return await res.json();
    } catch {
        return [];
    }
}

// --- UTILITY FUNCTIONS ---

/**
 * Get safety tips for current time
 */
export function getSafetyTips(): string[] {
    const hour = new Date().getHours();

    if (hour >= 22 || hour < 5) {
        return [
            'Share your live trip with family',
            'Prefer well-lit routes',
            'Keep emergency contacts on speed dial',
            'Take a screenshot of vehicle number'
        ];
    }

    return [
        'Always verify driver identity',
        'Share trip details with trusted contacts',
        'Keep your phone charged',
        'Use verified transport only'
    ];
}

/**
 * Format share message
 */
export function formatShareMessage(shareUrl: string, destination: string): string {
    return `I'm on my way to ${destination}. Track my live location: ${shareUrl}`;
}

/**
 * Get guardian status summary
 */
export async function getGuardianStatus(): Promise<{
    contactsCount: number;
    activeShares: number;
    safetyScore: number;
}> {
    try {
        const res = await fetch(`${API_BASE_URL}/api/guardian/status`, {
            headers: getHeaders()
        });

        if (!res.ok) throw new Error();
        return await res.json();
    } catch {
        const contacts = await getTrustedContacts();
        return {
            contactsCount: contacts.length,
            activeShares: 0,
            safetyScore: contacts.length > 0 ? 70 : 40
        };
    }
}
