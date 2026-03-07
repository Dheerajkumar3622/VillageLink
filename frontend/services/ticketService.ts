/**
 * Ticket Service
 * Secure ticket generation with HMAC-SHA256 signatures,
 * QR payload encoding, and verification for VillageLink
 */

import crypto from 'crypto';

// Secret key for HMAC (in production, use environment variable)
const TICKET_SECRET = process.env.TICKET_SECRET || 'VL_SECURE_TICKET_2026_xK9pL2mN';

// Ticket validity window in milliseconds (5 minutes for QR display)
const QR_VALIDITY_MS = 5 * 60 * 1000;

// --- INTERFACES ---

export interface TicketPayload {
    ticketId: string;
    userId: string;
    from: string;
    to: string;
    passengerCount: number;
    totalPrice: number;
    timestamp: number;
    expiresAt: number;
    status: string;
}

export interface QRPayload {
    t: string;  // ticket ID (compact)
    s: string;  // signature (first 16 chars)
    e: number;  // expires timestamp
    v: number;  // version
}

export interface VerificationResult {
    valid: boolean;
    ticket?: TicketPayload;
    error?: string;
    fraudReason?: string;
}

// In-memory scan tracking (use Redis in production)
const scanHistory = new Map<string, { count: number; lastScan: number; deviceId?: string }>();

// --- TICKET ID GENERATION ---

/**
 * Generate a unique, tamper-resistant ticket ID
 * Format: TKT-{timestamp_base36}-{random}-{checksum}
 */
export const generateSecureTicketId = (): string => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    const raw = `${timestamp}${random}`;
    const checksum = crypto
        .createHash('md5')
        .update(raw + TICKET_SECRET)
        .digest('hex')
        .substring(0, 4)
        .toUpperCase();

    return `TKT-${timestamp}-${random}-${checksum}`;
};

/**
 * Validate ticket ID format and checksum
 */
export const validateTicketIdFormat = (ticketId: string): boolean => {
    const parts = ticketId.split('-');
    if (parts.length !== 4 || parts[0] !== 'TKT') return false;

    const [, timestamp, random, checksum] = parts;
    const raw = `${timestamp}${random}`;
    const expectedChecksum = crypto
        .createHash('md5')
        .update(raw + TICKET_SECRET)
        .digest('hex')
        .substring(0, 4)
        .toUpperCase();

    return checksum === expectedChecksum;
};

// --- HMAC SIGNATURE ---

/**
 * Create HMAC-SHA256 signature for ticket data
 */
export const createTicketSignature = (payload: TicketPayload): string => {
    const data = `${payload.ticketId}|${payload.userId}|${payload.from}|${payload.to}|${payload.totalPrice}|${payload.timestamp}`;
    return crypto
        .createHmac('sha256', TICKET_SECRET)
        .update(data)
        .digest('hex');
};

/**
 * Verify ticket signature
 */
export const verifyTicketSignature = (payload: TicketPayload, signature: string): boolean => {
    const expectedSignature = createTicketSignature(payload);
    return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
    );
};

// --- QR PAYLOAD ENCODING ---

/**
 * Create compact QR payload for ticket
 * Keeps QR code small and scannable
 */
export const createQRPayload = (ticketId: string, signature: string): string => {
    const qrData: QRPayload = {
        t: ticketId,
        s: signature.substring(0, 16), // First 16 chars sufficient for verification
        e: Date.now() + QR_VALIDITY_MS,
        v: 1 // Version for future compatibility
    };

    // Base64 encode for compact QR
    return Buffer.from(JSON.stringify(qrData)).toString('base64url');
};

/**
 * Decode QR payload
 */
export const decodeQRPayload = (qrString: string): QRPayload | null => {
    try {
        const decoded = Buffer.from(qrString, 'base64url').toString('utf-8');
        return JSON.parse(decoded) as QRPayload;
    } catch {
        return null;
    }
};

// --- TICKET VERIFICATION ---

/**
 * Verify a scanned ticket
 * Checks: format, signature, expiry, scan count
 */
export const verifyTicket = async (
    qrString: string,
    getTicketFromDb: (ticketId: string) => Promise<TicketPayload | null>,
    deviceId?: string
): Promise<VerificationResult> => {
    // 1. Decode QR payload
    const qrPayload = decodeQRPayload(qrString);
    if (!qrPayload) {
        return { valid: false, error: 'Invalid QR code format' };
    }

    // 2. Check QR expiry
    if (Date.now() > qrPayload.e) {
        return { valid: false, error: 'QR code expired. Ask passenger to refresh.' };
    }

    // 3. Validate ticket ID format
    if (!validateTicketIdFormat(qrPayload.t)) {
        return { valid: false, error: 'Invalid ticket ID', fraudReason: 'FORGED_ID' };
    }

    // 4. Fetch ticket from database
    const ticket = await getTicketFromDb(qrPayload.t);
    if (!ticket) {
        return { valid: false, error: 'Ticket not found' };
    }

    // 5. Check ticket status
    if (ticket.status === 'COMPLETED') {
        return { valid: false, error: 'Ticket already used' };
    }
    if (ticket.status === 'CANCELLED') {
        return { valid: false, error: 'Ticket was cancelled' };
    }

    // 6. Verify signature
    const fullSignature = createTicketSignature(ticket);
    if (!fullSignature.startsWith(qrPayload.s)) {
        return { valid: false, error: 'Signature mismatch', fraudReason: 'FORGED_SIGNATURE' };
    }

    // 7. Check scan history (anti-duplicate)
    const scanRecord = scanHistory.get(qrPayload.t);
    if (scanRecord) {
        // If scanned in last 2 minutes by different device, flag as potential fraud
        const timeSinceLastScan = Date.now() - scanRecord.lastScan;
        if (timeSinceLastScan < 120000 && scanRecord.deviceId !== deviceId) {
            return {
                valid: false,
                error: 'Duplicate scan detected!',
                fraudReason: 'DUPLICATE_SCAN'
            };
        }

        // Warn if scanned more than 3 times
        if (scanRecord.count >= 3) {
            return {
                valid: false,
                error: 'Too many scans for this ticket',
                fraudReason: 'EXCESSIVE_SCANS'
            };
        }
    }

    // 8. Record this scan
    scanHistory.set(qrPayload.t, {
        count: (scanRecord?.count || 0) + 1,
        lastScan: Date.now(),
        deviceId
    });

    // Success!
    return {
        valid: true,
        ticket
    };
};

// --- FARE CALCULATION ---

// Base fares by vehicle type
const BASE_FARES: Record<string, number> = {
    BUS: 10,
    AUTO: 15,
    TAXI: 20,
    BIKE: 5
};

// Rate per km by vehicle type
const RATE_PER_KM: Record<string, number> = {
    BUS: 2.5,
    AUTO: 5,
    TAXI: 8,
    BIKE: 3
};

/**
 * Calculate accurate fare based on distance and vehicle type
 */
export const calculateFare = (
    distanceKm: number,
    vehicleType: string = 'BUS',
    passengerCount: number = 1,
    options: {
        isDidiRath?: boolean;
        hasLivestock?: boolean;
        hasInsurance?: boolean;
        applyHappyHour?: boolean;
        applySurge?: boolean;
    } = {}
): {
    baseFare: number;
    distanceFare: number;
    surgeAmount: number;
    discountAmount: number;
    totalFare: number;
    breakdown: string[];
} => {
    const baseFare = BASE_FARES[vehicleType] || BASE_FARES.BUS;
    const ratePerKm = RATE_PER_KM[vehicleType] || RATE_PER_KM.BUS;

    // Calculate distance-based fare
    let distanceFare = Math.round(distanceKm * ratePerKm);

    // Apply passenger multiplier (only for non-bus)
    if (vehicleType !== 'BUS' && passengerCount > 1) {
        distanceFare = Math.round(distanceFare * (1 + (passengerCount - 1) * 0.3));
    }

    const breakdown: string[] = [
        `Base fare: ₹${baseFare}`,
        `Distance (${distanceKm.toFixed(1)} km): ₹${distanceFare}`
    ];

    let surgeAmount = 0;
    let discountAmount = 0;

    // Surge pricing check
    if (options.applySurge) {
        const hour = new Date().getHours();
        const isRushHour = (hour >= 8 && hour <= 10) || (hour >= 17 && hour <= 19);
        if (isRushHour) {
            surgeAmount = Math.round((baseFare + distanceFare) * 0.2);
            breakdown.push(`Rush hour surge: +₹${surgeAmount}`);
        }
    }

    // Happy hour discount
    if (options.applyHappyHour) {
        const hour = new Date().getHours();
        const isHappyHour = hour >= 13 && hour <= 15;
        if (isHappyHour) {
            discountAmount = Math.round((baseFare + distanceFare) * 0.1);
            breakdown.push(`Happy hour discount: -₹${discountAmount}`);
        }
    }

    // Didi Rath discount (women's bus)
    if (options.isDidiRath) {
        discountAmount += Math.round((baseFare + distanceFare) * 0.15);
        breakdown.push(`Didi Rath discount: -₹${Math.round((baseFare + distanceFare) * 0.15)}`);
    }

    // Livestock surcharge
    if (options.hasLivestock) {
        const livestockCharge = 20;
        surgeAmount += livestockCharge;
        breakdown.push(`Livestock surcharge: +₹${livestockCharge}`);
    }

    // Insurance
    if (options.hasInsurance) {
        const insuranceCharge = 5;
        surgeAmount += insuranceCharge;
        breakdown.push(`Travel insurance: +₹${insuranceCharge}`);
    }

    const totalFare = baseFare + distanceFare + surgeAmount - discountAmount;

    breakdown.push(`---`);
    breakdown.push(`Total: ₹${totalFare}`);

    return {
        baseFare,
        distanceFare,
        surgeAmount,
        discountAmount,
        totalFare: Math.max(totalFare, baseFare), // Minimum is base fare
        breakdown
    };
};

// --- UTILITY FUNCTIONS ---

/**
 * Get scan count for a ticket (for driver dashboard)
 */
export const getTicketScanCount = (ticketId: string): number => {
    return scanHistory.get(ticketId)?.count || 0;
};

/**
 * Clear scan history for a ticket (after trip completion)
 */
export const clearTicketScanHistory = (ticketId: string): void => {
    scanHistory.delete(ticketId);
};

/**
 * Generate a display-friendly ticket number
 */
export const formatTicketNumber = (ticketId: string): string => {
    // Extract last 6 characters for display
    return ticketId.slice(-6).toUpperCase();
};

/**
 * Check if QR needs refresh (approaching expiry)
 */
export const shouldRefreshQR = (qrString: string): boolean => {
    const qrPayload = decodeQRPayload(qrString);
    if (!qrPayload) return true;

    const timeRemaining = qrPayload.e - Date.now();
    return timeRemaining < 60000; // Less than 1 minute remaining
};
