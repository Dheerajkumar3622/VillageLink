import { API_BASE_URL } from '../config';
import { getAuthToken } from './authService';
import { BulkOrder, VendorKhata, VendorKhataEntry, HygieneAudit, CreditScore, LoanApplication } from '../types';

// ==================== AGGREGATOR (BULK PROCUREMENT) ====================

export const createBulkOrder = async (
    items: { name: string; quantity: number; unit: string; targetPrice: number }[]
): Promise<{ success: boolean; order?: BulkOrder; error?: string }> => {
    try {
        const token = await getAuthToken();
        const response = await fetch(`${API_BASE_URL}/vendor/bulk-order`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ items }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to create bulk order');
        return { success: true, order: data.order };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const getOpenBulkOrders = async (
    latitude: number,
    longitude: number
): Promise<{ success: boolean; orders?: BulkOrder[]; error?: string }> => {
    try {
        const token = await getAuthToken();
        const response = await fetch(
            `${API_BASE_URL}/vendor/bulk-order/nearby?lat=${latitude}&lng=${longitude}`,
            {
                headers: { Authorization: `Bearer ${token}` },
            }
        );
        const data = await response.json();
        return { success: true, orders: data.orders };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const joinBulkOrder = async (
    orderId: string,
    items: { name: string; quantity: number }[]
): Promise<{ success: boolean; order?: BulkOrder; error?: string }> => {
    try {
        const token = await getAuthToken();
        const response = await fetch(`${API_BASE_URL}/vendor/bulk-order/${orderId}/join`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ items }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to join bulk order');
        return { success: true, order: data.order };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

// ==================== DIGITAL KHATA (LEDGER) ====================

export const getVendorKhata = async (): Promise<{ success: boolean; khata?: VendorKhata; error?: string }> => {
    try {
        const token = await getAuthToken();
        const response = await fetch(`${API_BASE_URL}/vendor/khata`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        return { success: true, khata: data.khata };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const recordKhataEntry = async (
    entry: Partial<VendorKhataEntry>
): Promise<{ success: boolean; entry?: VendorKhataEntry; error?: string }> => {
    try {
        const token = await getAuthToken();
        // Simulate Voice recording upload if voiceNoteUrl is meant to be a file
        // Here we assume text or pre-uploaded URL
        const response = await fetch(`${API_BASE_URL}/vendor/khata/entry`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(entry),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to record entry');
        return { success: true, entry: data.entry };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

// ==================== HYGIENE & TRUST ====================

export const submitHygieneSelfAudit = async (
    photos: { type: string; base64: string }[]
): Promise<{ success: boolean; audit?: HygieneAudit; error?: string }> => {
    try {
        const token = await getAuthToken();
        const response = await fetch(`${API_BASE_URL}/vendor/hygiene-audit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ photos }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Audit submission failed');
        return { success: true, audit: data.audit };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const getHygieneHistory = async (): Promise<{ success: boolean; audits?: HygieneAudit[]; error?: string }> => {
    try {
        const token = await getAuthToken();
        const response = await fetch(`${API_BASE_URL}/vendor/hygiene-audit/history`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        return { success: true, audits: data.audits };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

// ==================== FINANCIAL INCLUSION (PM SVANidhi) ====================

export const getCreditScore = async (): Promise<{ success: boolean; score?: CreditScore; error?: string }> => {
    try {
        const token = await getAuthToken();
        const response = await fetch(`${API_BASE_URL}/vendor/credit-score`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        return { success: true, score: data.score };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const applyForLoan = async (
    schemeType: string,
    amount: number
): Promise<{ success: boolean; application?: LoanApplication; error?: string }> => {
    try {
        const token = await getAuthToken();
        const response = await fetch(`${API_BASE_URL}/vendor/loans/apply`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ schemeType, amount }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Loan application failed');
        return { success: true, application: data.application };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

// ==================== MOCK DATA GENERATORS (For Development) ====================

export const getMockCreditScore = (): CreditScore => ({
    vendorId: 'vendor_123',
    score: 650,
    tier: 'GOOD',
    factors: [
        { name: 'UPI Velocity', impact: 'POSITIVE', weight: 30, value: 85 },
        { name: 'Daily Consistency', impact: 'POSITIVE', weight: 25, value: 90 },
        { name: 'Business Age', impact: 'NEUTRAL', weight: 10, value: 40 },
    ],
    metrics: {
        avgDailySales: 2500,
        salesConsistencyScore: 88,
        upiTransactionRatio: 0.65,
        repaymentHistory: 100,
        businessAge: 12,
        appEngagementScore: 75,
    },
    loanEligibility: {
        pmSvanidhi: { eligible: true, maxAmount: 10000, tier: 1 },
        workingCapital: { eligible: true, maxAmount: 50000, interestRate: 14 },
    },
});
