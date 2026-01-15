/**
 * Soundbox Service for UMG (Unified Mobility Grid)
 * 
 * Revenue Protection System implementing:
 * - Audio verification for ticket validation
 * - Text-to-speech fare announcements
 * - Fraud detection triggers
 * - Offline queue with sync
 */

import { API_BASE_URL } from '../config';
import { getAuthToken } from './authService';

// --- TYPES ---

export interface AudioVerification {
    id: string;
    type: 'TICKET_VALIDATED' | 'PAYMENT_RECEIVED' | 'FARE_COLLECTED' | 'FRAUD_ALERT';
    amount?: number;
    ticketId?: string;
    message: string;
    language: 'EN' | 'HI' | 'LOCAL';
    timestamp: number;
    synced: boolean;
}

export interface ConductorMetrics {
    conductorId: string;
    date: string;
    totalTickets: number;
    digitalTickets: number;
    cashTickets: number;
    totalRevenue: number;
    verifiedRevenue: number;
    fraudAlerts: number;
    bonusEarned: number;
}

export interface FraudAlert {
    id: string;
    type: 'ZERO_TICKET' | 'MULTI_SCAN' | 'EXPIRED_TICKET' | 'INVALID_SIGNATURE' | 'DEVICE_MISMATCH';
    ticketId?: string;
    conductorId: string;
    description: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    timestamp: number;
    resolved: boolean;
}

// --- AUDIO CONFIGURATION ---

const AUDIO_MESSAGES = {
    EN: {
        TICKET_VALIDATED: (amount: number) => `Ticket validated. ${amount} rupees.`,
        PAYMENT_RECEIVED: (amount: number) => `Payment received. ${amount} rupees.`,
        FARE_COLLECTED: (amount: number) => `Fare collected. ${amount} rupees.`,
        FRAUD_ALERT: () => `Alert. Invalid ticket detected.`
    },
    HI: {
        TICKET_VALIDATED: (amount: number) => `टिकट मान्य। ${amount} रुपये।`,
        PAYMENT_RECEIVED: (amount: number) => `भुगतान प्राप्त। ${amount} रुपये।`,
        FARE_COLLECTED: (amount: number) => `किराया एकत्र। ${amount} रुपये।`,
        FRAUD_ALERT: () => `सावधान। अमान्य टिकट।`
    },
    LOCAL: {
        TICKET_VALIDATED: (amount: number) => `Ticket OK. ${amount} rupees.`,
        PAYMENT_RECEIVED: (amount: number) => `Payment OK. ${amount} rupees.`,
        FARE_COLLECTED: (amount: number) => `Fare OK. ${amount} rupees.`,
        FRAUD_ALERT: () => `Alert. Bad ticket.`
    }
};

// --- STATE ---

let offlineQueue: AudioVerification[] = [];
let isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
let speechSynthesis: SpeechSynthesis | null = null;
let preferredVoice: SpeechSynthesisVoice | null = null;

// Initialize speech synthesis
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    speechSynthesis = window.speechSynthesis;

    // Wait for voices to load
    const loadVoices = () => {
        const voices = speechSynthesis?.getVoices() || [];
        // Prefer Hindi voice if available
        preferredVoice = voices.find(v => v.lang.startsWith('hi'))
            || voices.find(v => v.lang.startsWith('en'))
            || voices[0];
    };

    loadVoices();
    speechSynthesis.addEventListener?.('voiceschanged', loadVoices);
}

// Network status listener
if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
        isOnline = true;
        syncOfflineQueue();
    });
    window.addEventListener('offline', () => {
        isOnline = false;
    });
}

// --- HELPER FUNCTIONS ---

function getHeaders(): HeadersInit {
    const token = getAuthToken();
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
}

// --- AUDIO VERIFICATION ---

/**
 * Announce ticket validation with audio
 */
export async function announceTicketValidation(
    amount: number,
    ticketId: string,
    language: AudioVerification['language'] = 'HI'
): Promise<void> {
    const message = AUDIO_MESSAGES[language].TICKET_VALIDATED(amount);

    // Play audio announcement
    await speakMessage(message, language);

    // Log verification
    const verification: AudioVerification = {
        id: `av_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'TICKET_VALIDATED',
        amount,
        ticketId,
        message,
        language,
        timestamp: Date.now(),
        synced: false
    };

    await logVerification(verification);
}

/**
 * Announce payment received
 */
export async function announcePaymentReceived(
    amount: number,
    language: AudioVerification['language'] = 'HI'
): Promise<void> {
    const message = AUDIO_MESSAGES[language].PAYMENT_RECEIVED(amount);
    await speakMessage(message, language);
}

/**
 * Announce fare collection (cash)
 */
export async function announceFareCollected(
    amount: number,
    language: AudioVerification['language'] = 'HI'
): Promise<void> {
    const message = AUDIO_MESSAGES[language].FARE_COLLECTED(amount);
    await speakMessage(message, language);

    const verification: AudioVerification = {
        id: `av_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'FARE_COLLECTED',
        amount,
        message,
        language,
        timestamp: Date.now(),
        synced: false
    };

    await logVerification(verification);
}

/**
 * Announce fraud alert
 */
export async function announceFraudAlert(
    language: AudioVerification['language'] = 'HI'
): Promise<void> {
    const message = AUDIO_MESSAGES[language].FRAUD_ALERT();
    await speakMessage(message, language);
}

/**
 * Speak a message using Web Speech API
 */
async function speakMessage(message: string, language: string): Promise<void> {
    return new Promise((resolve, reject) => {
        if (!speechSynthesis) {
            console.warn('Speech synthesis not available');
            resolve();
            return;
        }

        // Cancel any ongoing speech
        speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(message);
        utterance.voice = preferredVoice;
        utterance.lang = language === 'HI' ? 'hi-IN' : 'en-IN';
        utterance.rate = 1.1; // Slightly faster for announcements
        utterance.pitch = 1;
        utterance.volume = 1;

        utterance.onend = () => resolve();
        utterance.onerror = (e) => {
            console.error('Speech error:', e);
            resolve(); // Don't fail if speech fails
        };

        speechSynthesis.speak(utterance);
    });
}

// --- OFFLINE QUEUE ---

/**
 * Log verification (with offline support)
 */
async function logVerification(verification: AudioVerification): Promise<void> {
    if (isOnline) {
        try {
            await fetch(`${API_BASE_URL}/api/conductor/verifications`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(verification)
            });
            verification.synced = true;
        } catch {
            offlineQueue.push(verification);
            saveOfflineQueue();
        }
    } else {
        offlineQueue.push(verification);
        saveOfflineQueue();
    }
}

/**
 * Save offline queue to localStorage
 */
function saveOfflineQueue(): void {
    if (typeof localStorage !== 'undefined') {
        localStorage.setItem('soundbox_offline_queue', JSON.stringify(offlineQueue));
    }
}

/**
 * Load offline queue from localStorage
 */
export function loadOfflineQueue(): void {
    if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem('soundbox_offline_queue');
        if (saved) {
            offlineQueue = JSON.parse(saved);
        }
    }
}

/**
 * Sync offline queue with server
 */
export async function syncOfflineQueue(): Promise<{ synced: number; failed: number }> {
    let synced = 0;
    let failed = 0;

    const toSync = [...offlineQueue];
    offlineQueue = [];

    for (const verification of toSync) {
        try {
            await fetch(`${API_BASE_URL}/api/conductor/verifications`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ ...verification, synced: true })
            });
            synced++;
        } catch {
            offlineQueue.push(verification);
            failed++;
        }
    }

    saveOfflineQueue();
    return { synced, failed };
}

/**
 * Get pending offline verifications count
 */
export function getPendingCount(): number {
    return offlineQueue.length;
}

// --- FRAUD DETECTION ---

/**
 * Detect potential fraud patterns
 */
export function detectFraudPatterns(
    metrics: ConductorMetrics,
    historicalAvg: ConductorMetrics
): FraudAlert[] {
    const alerts: FraudAlert[] = [];

    // Zero ticket fraud: Digital tickets but no revenue 
    if (metrics.digitalTickets > 10 && metrics.verifiedRevenue === 0) {
        alerts.push({
            id: `fraud_${Date.now()}_1`,
            type: 'ZERO_TICKET',
            conductorId: metrics.conductorId,
            description: 'High ticket count with zero verified revenue',
            severity: 'HIGH',
            timestamp: Date.now(),
            resolved: false
        });
    }

    // Revenue mismatch
    const expectedRevenue = metrics.totalTickets * 15; // Avg fare assumption
    if (metrics.totalRevenue < expectedRevenue * 0.5) {
        alerts.push({
            id: `fraud_${Date.now()}_2`,
            type: 'ZERO_TICKET',
            conductorId: metrics.conductorId,
            description: `Revenue significantly below expected (₹${metrics.totalRevenue} vs ₹${expectedRevenue} expected)`,
            severity: 'MEDIUM',
            timestamp: Date.now(),
            resolved: false
        });
    }

    // Unusual cash ratio (too much cash vs digital)
    const cashRatio = metrics.cashTickets / (metrics.totalTickets || 1);
    if (cashRatio > 0.9 && metrics.totalTickets > 50) {
        alerts.push({
            id: `fraud_${Date.now()}_3`,
            type: 'DEVICE_MISMATCH',
            conductorId: metrics.conductorId,
            description: 'Unusually high cash ratio - digital device may be bypassed',
            severity: 'MEDIUM',
            timestamp: Date.now(),
            resolved: false
        });
    }

    return alerts;
}

// --- CONDUCTOR INCENTIVES ---

/**
 * Calculate conductor bonus for verified tickets
 */
export function calculateConductorBonus(metrics: ConductorMetrics): number {
    // 1% of verified digital revenue as bonus
    const baseBonusRate = 0.01;

    // Extra 0.5% if digital ratio > 70%
    const digitalRatio = metrics.digitalTickets / (metrics.totalTickets || 1);
    const bonusRate = digitalRatio > 0.7 ? baseBonusRate + 0.005 : baseBonusRate;

    // Penalty for fraud alerts
    const penaltyFactor = Math.max(0, 1 - (metrics.fraudAlerts * 0.1));

    return Math.round(metrics.verifiedRevenue * bonusRate * penaltyFactor);
}

/**
 * Get conductor metrics for today
 */
export async function getTodayMetrics(conductorId: string): Promise<ConductorMetrics> {
    try {
        const today = new Date().toISOString().split('T')[0];
        const res = await fetch(
            `${API_BASE_URL}/api/conductor/${conductorId}/metrics/${today}`,
            { headers: getHeaders() }
        );

        if (!res.ok) throw new Error();
        return await res.json();
    } catch {
        return {
            conductorId,
            date: new Date().toISOString().split('T')[0],
            totalTickets: 0,
            digitalTickets: 0,
            cashTickets: 0,
            totalRevenue: 0,
            verifiedRevenue: 0,
            fraudAlerts: 0,
            bonusEarned: 0
        };
    }
}

/**
 * Get historical metrics
 */
export async function getHistoricalMetrics(
    conductorId: string,
    days: number = 7
): Promise<ConductorMetrics[]> {
    try {
        const res = await fetch(
            `${API_BASE_URL}/api/conductor/${conductorId}/metrics?days=${days}`,
            { headers: getHeaders() }
        );

        if (!res.ok) return [];
        return await res.json();
    } catch {
        return [];
    }
}

// --- UTILITY FUNCTIONS ---

/**
 * Format amount for audio (e.g., "125" → "one hundred twenty five")
 * Note: Web Speech API handles this automatically for most cases
 */
export function formatAmountForSpeech(amount: number): string {
    return amount.toString();
}

/**
 * Test audio announcement
 */
export async function testAudioAnnouncement(): Promise<boolean> {
    try {
        await speakMessage('Soundbox test successful', 'EN');
        return true;
    } catch {
        return false;
    }
}

/**
 * Get soundbox status
 */
export function getSoundboxStatus(): {
    available: boolean;
    online: boolean;
    pendingSync: number;
    preferredLanguage: string;
} {
    return {
        available: speechSynthesis !== null,
        online: isOnline,
        pendingSync: offlineQueue.length,
        preferredLanguage: 'HI'
    };
}

// Initialize on load
loadOfflineQueue();
