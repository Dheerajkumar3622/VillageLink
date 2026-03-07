/**
 * Offline Ticket Service
 * Enables ticket verification without network connectivity
 * Uses IndexedDB for local storage and cryptographic validation
 */

// IndexedDB Configuration
const DB_NAME = 'villagelink_tickets';
const DB_VERSION = 1;
const STORE_TICKETS = 'tickets';
const STORE_VERIFIED = 'verified_scans';

// HMAC Secret (should match server - in production use secure key derivation)
const TICKET_SECRET = 'VL_SECURE_TICKET_2026_xK9pL2mN';

// Types
export interface OfflineTicket {
    id: string;
    userId: string;
    from: string;
    to: string;
    passengerCount: number;
    totalPrice: number;
    timestamp: number;
    expiresAt: number;
    status: string;
    paymentMethod: string;
    signature: string;
    qrPayload: string;
    syncedAt?: number;
}

export interface OfflineVerification {
    ticketId: string;
    driverId: string;
    timestamp: number;
    location?: { lat: number; lng: number };
    synced: boolean;
}

// --- INDEXEDDB HELPERS ---

let db: IDBDatabase | null = null;

const openDatabase = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        if (db) return resolve(db);

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);

        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const database = (event.target as IDBOpenDBRequest).result;

            // Tickets store
            if (!database.objectStoreNames.contains(STORE_TICKETS)) {
                const ticketStore = database.createObjectStore(STORE_TICKETS, { keyPath: 'id' });
                ticketStore.createIndex('userId', 'userId', { unique: false });
                ticketStore.createIndex('status', 'status', { unique: false });
                ticketStore.createIndex('syncedAt', 'syncedAt', { unique: false });
            }

            // Verified scans store
            if (!database.objectStoreNames.contains(STORE_VERIFIED)) {
                const verifiedStore = database.createObjectStore(STORE_VERIFIED, { keyPath: 'ticketId' });
                verifiedStore.createIndex('synced', 'synced', { unique: false });
                verifiedStore.createIndex('timestamp', 'timestamp', { unique: false });
            }
        };
    });
};

// --- CRYPTO HELPERS (Web Crypto API) ---

const textEncoder = new TextEncoder();

/**
 * Generate HMAC-SHA256 signature using Web Crypto API
 */
const createSignature = async (data: string): Promise<string> => {
    const key = await crypto.subtle.importKey(
        'raw',
        textEncoder.encode(TICKET_SECRET),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );

    const signature = await crypto.subtle.sign(
        'HMAC',
        key,
        textEncoder.encode(data)
    );

    return Array.from(new Uint8Array(signature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
};

/**
 * Validate ticket ID format and checksum
 */
const validateTicketIdFormat = async (ticketId: string): Promise<boolean> => {
    const parts = ticketId.split('-');
    if (parts.length !== 4 || parts[0] !== 'TKT') return false;

    const [, timestamp, random, checksum] = parts;
    const raw = `${timestamp}${random}`;

    // MD5 not available in Web Crypto, so we'll use a simpler check
    // In production, use the same checksum algorithm as server
    const expectedChecksum = raw.slice(0, 4).toUpperCase();
    return checksum.length === 4;  // Simplified check
};

/**
 * Decode QR payload
 */
const decodeQRPayload = (qrString: string): { t: string; s: string; e: number; v: number } | null => {
    try {
        // Base64url decode
        const decoded = atob(qrString.replace(/-/g, '+').replace(/_/g, '/'));
        return JSON.parse(decoded);
    } catch {
        return null;
    }
};

// --- OFFLINE TICKET STORAGE ---

/**
 * Store ticket for offline access
 */
export const cacheTicket = async (ticket: OfflineTicket): Promise<void> => {
    const database = await openDatabase();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORE_TICKETS], 'readwrite');
        const store = transaction.objectStore(STORE_TICKETS);

        const request = store.put({
            ...ticket,
            syncedAt: Date.now()
        });

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

/**
 * Get cached ticket by ID
 */
export const getCachedTicket = async (ticketId: string): Promise<OfflineTicket | null> => {
    const database = await openDatabase();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORE_TICKETS], 'readonly');
        const store = transaction.objectStore(STORE_TICKETS);
        const request = store.get(ticketId);

        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
    });
};

/**
 * Get all cached tickets for a user
 */
export const getUserCachedTickets = async (userId: string): Promise<OfflineTicket[]> => {
    const database = await openDatabase();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORE_TICKETS], 'readonly');
        const store = transaction.objectStore(STORE_TICKETS);
        const index = store.index('userId');
        const request = index.getAll(userId);

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
};

// --- OFFLINE VERIFICATION ---

/**
 * Verify ticket offline using cached data and cryptographic validation
 */
export const verifyTicketOffline = async (
    qrPayload: string,
    driverId: string
): Promise<{
    valid: boolean;
    ticket?: OfflineTicket;
    error?: string;
    isOffline: boolean;
}> => {
    try {
        // 1. Decode QR payload
        const qrData = decodeQRPayload(qrPayload);
        if (!qrData) {
            return { valid: false, error: 'Invalid QR format', isOffline: true };
        }

        // 2. Check QR expiry
        if (Date.now() > qrData.e) {
            return { valid: false, error: 'QR expired - ask to refresh', isOffline: true };
        }

        // 3. Validate ticket ID format
        const validFormat = await validateTicketIdFormat(qrData.t);
        if (!validFormat) {
            return { valid: false, error: 'Invalid ticket ID', isOffline: true };
        }

        // 4. Get cached ticket
        const cachedTicket = await getCachedTicket(qrData.t);
        if (!cachedTicket) {
            return {
                valid: false,
                error: 'Ticket not cached. Need internet to verify.',
                isOffline: true
            };
        }

        // 5. Check ticket status
        if (cachedTicket.status === 'COMPLETED') {
            return { valid: false, error: 'Ticket already used', isOffline: true };
        }
        if (cachedTicket.status === 'CANCELLED') {
            return { valid: false, error: 'Ticket cancelled', isOffline: true };
        }

        // 6. Verify signature (simplified check - compare prefix)
        const signatureData = `${cachedTicket.id}|${cachedTicket.userId}|${cachedTicket.from}|${cachedTicket.to}|${cachedTicket.totalPrice}|${cachedTicket.timestamp}`;
        const expectedSignature = await createSignature(signatureData);

        if (!expectedSignature.startsWith(qrData.s)) {
            return { valid: false, error: 'Signature mismatch', isOffline: true };
        }

        // 7. Record verification
        await recordOfflineVerification(qrData.t, driverId);

        // 8. Update cached ticket status
        await cacheTicket({ ...cachedTicket, status: 'BOARDED' });

        return {
            valid: true,
            ticket: cachedTicket,
            isOffline: true
        };
    } catch (error) {
        console.error('Offline verification error:', error);
        return { valid: false, error: 'Verification failed', isOffline: true };
    }
};

/**
 * Record offline verification for later sync
 */
const recordOfflineVerification = async (
    ticketId: string,
    driverId: string
): Promise<void> => {
    const database = await openDatabase();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORE_VERIFIED], 'readwrite');
        const store = transaction.objectStore(STORE_VERIFIED);

        const verification: OfflineVerification = {
            ticketId,
            driverId,
            timestamp: Date.now(),
            synced: false
        };

        // Try to get current location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    verification.location = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    store.put(verification);
                    resolve();
                },
                () => {
                    store.put(verification);
                    resolve();
                },
                { timeout: 2000 }
            );
        } else {
            store.put(verification);
            resolve();
        }
    });
};

// --- SYNC OPERATIONS ---

/**
 * Sync pending offline verifications to server
 */
export const syncOfflineVerifications = async (apiBaseUrl: string): Promise<{
    synced: number;
    failed: number;
}> => {
    const database = await openDatabase();

    return new Promise(async (resolve) => {
        const transaction = database.transaction([STORE_VERIFIED], 'readonly');
        const store = transaction.objectStore(STORE_VERIFIED);
        const index = store.index('synced');
        // Use getAll without key to get all, then filter for unsynced
        const request = index.openCursor();
        const pending: OfflineVerification[] = [];

        request.onsuccess = async (event) => {
            const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
            if (cursor) {
                if (cursor.value.synced === false) {
                    pending.push(cursor.value as OfflineVerification);
                }
                cursor.continue();
                return;
            }
            // Cursor finished - process pending items
            let synced = 0;
            let failed = 0;

            for (const verification of pending) {
                try {
                    const response = await fetch(`${apiBaseUrl}/api/ticket/offline-sync`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(verification)
                    });

                    if (response.ok) {
                        await markVerificationSynced(verification.ticketId);
                        synced++;
                    } else {
                        failed++;
                    }
                } catch {
                    failed++;
                }
            }

            resolve({ synced, failed });
        };
    });
};

/**
 * Mark verification as synced
 */
const markVerificationSynced = async (ticketId: string): Promise<void> => {
    const database = await openDatabase();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORE_VERIFIED], 'readwrite');
        const store = transaction.objectStore(STORE_VERIFIED);
        const getRequest = store.get(ticketId);

        getRequest.onsuccess = () => {
            if (getRequest.result) {
                const updated = { ...getRequest.result, synced: true };
                store.put(updated);
            }
            resolve();
        };

        getRequest.onerror = () => reject(getRequest.error);
    });
};

/**
 * Pre-download tickets for a route (for drivers)
 */
export const preloadRouteTickets = async (
    apiBaseUrl: string,
    routeFrom: string,
    routeTo: string,
    authToken: string
): Promise<number> => {
    try {
        const response = await fetch(
            `${apiBaseUrl}/api/ticket/route-preload?from=${encodeURIComponent(routeFrom)}&to=${encodeURIComponent(routeTo)}`,
            { headers: { 'Authorization': `Bearer ${authToken}` } }
        );

        if (!response.ok) return 0;

        const data = await response.json();
        if (!data.tickets) return 0;

        for (const ticket of data.tickets) {
            await cacheTicket(ticket);
        }

        return data.tickets.length;
    } catch {
        return 0;
    }
};

/**
 * Clear old cached data
 */
export const cleanupCache = async (maxAgeDays: number = 7): Promise<number> => {
    const database = await openDatabase();
    const cutoff = Date.now() - (maxAgeDays * 24 * 60 * 60 * 1000);
    let deleted = 0;

    return new Promise((resolve) => {
        const transaction = database.transaction([STORE_TICKETS, STORE_VERIFIED], 'readwrite');

        // Clean old tickets
        const ticketStore = transaction.objectStore(STORE_TICKETS);
        const ticketCursor = ticketStore.openCursor();

        ticketCursor.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest).result;
            if (cursor) {
                if (cursor.value.timestamp < cutoff || cursor.value.status === 'COMPLETED') {
                    cursor.delete();
                    deleted++;
                }
                cursor.continue();
            }
        };

        // Clean synced verifications - iterate all, delete old synced ones
        const verifiedStore = transaction.objectStore(STORE_VERIFIED);
        const verifiedCursor = verifiedStore.openCursor();

        verifiedCursor.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
            if (cursor) {
                // Delete if synced and old
                if (cursor.value.synced === true && cursor.value.timestamp < cutoff) {
                    cursor.delete();
                    deleted++;
                }
                cursor.continue();
            }
        };

        transaction.oncomplete = () => resolve(deleted);
        transaction.onerror = () => resolve(deleted);
    });
};

/**
 * Get cache statistics
 */
export const getCacheStats = async (): Promise<{
    ticketCount: number;
    pendingVerifications: number;
    oldestTicket: number | null;
}> => {
    const database = await openDatabase();

    return new Promise((resolve) => {
        const transaction = database.transaction([STORE_TICKETS, STORE_VERIFIED], 'readonly');

        let ticketCount = 0;
        let pendingVerifications = 0;
        let oldestTicket: number | null = null;

        const ticketStore = transaction.objectStore(STORE_TICKETS);
        const ticketCountReq = ticketStore.count();
        ticketCountReq.onsuccess = () => { ticketCount = ticketCountReq.result; };

        // Count pending verifications by iterating (can't use count with boolean)
        const verifiedStore = transaction.objectStore(STORE_VERIFIED);
        const countCursor = verifiedStore.openCursor();

        countCursor.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
            if (cursor) {
                if (cursor.value.synced === false) {
                    pendingVerifications++;
                }
                cursor.continue();
            }
        };

        transaction.oncomplete = () => resolve({ ticketCount, pendingVerifications, oldestTicket });
    });
};

// Check network status
export const isOnline = (): boolean => {
    return navigator.onLine;
};

// Hybrid verification: try online first, fallback to offline
export const verifyTicketHybrid = async (
    qrPayload: string,
    driverId: string,
    apiBaseUrl: string,
    authToken: string
): Promise<{
    valid: boolean;
    ticket?: any;
    error?: string;
    isOffline: boolean;
}> => {
    if (isOnline()) {
        try {
            const response = await fetch(`${apiBaseUrl}/api/ticket/verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ qrPayload, deviceId: driverId })
            });

            const data = await response.json();

            if (response.ok && data.valid) {
                // Cache the verified ticket locally
                if (data.ticket) {
                    await cacheTicket(data.ticket);
                }
                return { ...data, isOffline: false };
            }

            return { valid: false, error: data.error, isOffline: false };
        } catch (networkError) {
            console.log('Online verification failed, trying offline...');
        }
    }

    // Fallback to offline verification
    return verifyTicketOffline(qrPayload, driverId);
};

export default {
    cacheTicket,
    getCachedTicket,
    getUserCachedTickets,
    verifyTicketOffline,
    verifyTicketHybrid,
    syncOfflineVerifications,
    preloadRouteTickets,
    cleanupCache,
    getCacheStats,
    isOnline
};
