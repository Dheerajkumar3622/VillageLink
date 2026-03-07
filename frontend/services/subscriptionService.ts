/**
 * Subscription Service for UMG (Unified Mobility Grid)
 * 
 * Implements zero-commission subscription model for drivers:
 * - Daily: ₹25/day
 * - Monthly: ₹500/month (₹100 savings)
 * - Yearly: ₹5000/year (₹1000 savings)
 * 
 * Drivers keep 100% of their fares after subscription.
 */

import { API_BASE_URL } from '../config';
import { getAuthToken, getCurrentUser } from './authService';

// --- TYPES ---

export interface SubscriptionPlan {
    id: string;
    name: string;
    duration: 'DAILY' | 'MONTHLY' | 'YEARLY';
    price: number;
    originalPrice: number;
    savings: number;
    features: string[];
    popular?: boolean;
}

export interface DriverSubscription {
    id: string;
    userId: string;
    planId: string;
    plan: SubscriptionPlan['duration'];
    amount: number;
    startDate: number;
    endDate: number;
    status: 'ACTIVE' | 'EXPIRED' | 'GRACE' | 'CANCELLED';
    autoRenew: boolean;
    razorpaySubscriptionId?: string;
    transactionId?: string;
    createdAt: number;
    updatedAt: number;
}

export interface SubscriptionStats {
    totalActiveSubscribers: number;
    dailyRevenue: number;
    monthlyRevenue: number;
    churnRate: number;
    conversionRate: number;
}

// --- SUBSCRIPTION PLANS ---

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
    {
        id: 'daily',
        name: 'Daily Pass',
        duration: 'DAILY',
        price: 25,
        originalPrice: 25,
        savings: 0,
        features: [
            '100% fare retention',
            'Unlimited ride requests',
            'Real-time navigation',
            'Payment in 24 hours'
        ]
    },
    {
        id: 'monthly',
        name: 'Monthly Premium',
        duration: 'MONTHLY',
        price: 500,
        originalPrice: 750, // 30 days * ₹25
        savings: 250,
        popular: true,
        features: [
            '100% fare retention',
            'Unlimited ride requests',
            'Priority dispatch',
            'Freight mode access',
            'Insurance coverage',
            'Weekly payouts'
        ]
    },
    {
        id: 'yearly',
        name: 'Yearly Champion',
        duration: 'YEARLY',
        price: 5000,
        originalPrice: 9000, // 12 months * ₹750
        savings: 4000,
        features: [
            'All Monthly features',
            'Priority support',
            'Driver training access',
            'Health insurance add-on',
            'Festival bonus program',
            'Loan eligibility'
        ]
    }
];

// --- HELPER FUNCTIONS ---

function getHeaders(): HeadersInit {
    const token = getAuthToken();
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
}

function calculateEndDate(startDate: number, duration: SubscriptionPlan['duration']): number {
    const date = new Date(startDate);
    switch (duration) {
        case 'DAILY':
            date.setDate(date.getDate() + 1);
            break;
        case 'MONTHLY':
            date.setMonth(date.getMonth() + 1);
            break;
        case 'YEARLY':
            date.setFullYear(date.getFullYear() + 1);
            break;
    }
    return date.getTime();
}

// --- API FUNCTIONS ---

/**
 * Get all available subscription plans
 */
export function getSubscriptionPlans(): SubscriptionPlan[] {
    return SUBSCRIPTION_PLANS;
}

/**
 * Get current user's active subscription
 */
export async function getCurrentSubscription(): Promise<DriverSubscription | null> {
    try {
        const user = getCurrentUser();
        if (!user) return null;

        const res = await fetch(`${API_BASE_URL}/api/subscriptions/current`, {
            headers: getHeaders()
        });

        if (!res.ok) {
            if (res.status === 404) return null;
            throw new Error('Failed to fetch subscription');
        }

        return await res.json();
    } catch (error) {
        console.error('Error fetching current subscription:', error);
        return null;
    }
}

/**
 * Create a new subscription
 */
export async function createSubscription(
    planId: string,
    paymentMethod: 'RAZORPAY' | 'UPI' | 'WALLET'
): Promise<{ subscription: DriverSubscription; paymentUrl?: string }> {
    const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId);
    if (!plan) {
        throw new Error('Invalid plan selected');
    }

    const res = await fetch(`${API_BASE_URL}/api/subscriptions/create`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
            planId,
            paymentMethod,
            amount: plan.price,
            duration: plan.duration
        })
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to create subscription');
    }

    return await res.json();
}

/**
 * Activate subscription after successful payment
 */
export async function activateSubscription(
    subscriptionId: string,
    transactionId: string
): Promise<DriverSubscription> {
    const res = await fetch(`${API_BASE_URL}/api/subscriptions/activate`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
            subscriptionId,
            transactionId
        })
    });

    if (!res.ok) {
        throw new Error('Failed to activate subscription');
    }

    return await res.json();
}

/**
 * Cancel subscription (will expire at end of current period)
 */
export async function cancelSubscription(subscriptionId: string): Promise<boolean> {
    const res = await fetch(`${API_BASE_URL}/api/subscriptions/${subscriptionId}/cancel`, {
        method: 'POST',
        headers: getHeaders()
    });

    return res.ok;
}

/**
 * Toggle auto-renewal
 */
export async function toggleAutoRenew(subscriptionId: string, autoRenew: boolean): Promise<boolean> {
    const res = await fetch(`${API_BASE_URL}/api/subscriptions/${subscriptionId}/auto-renew`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ autoRenew })
    });

    return res.ok;
}

/**
 * Get subscription history
 */
export async function getSubscriptionHistory(): Promise<DriverSubscription[]> {
    try {
        const res = await fetch(`${API_BASE_URL}/api/subscriptions/history`, {
            headers: getHeaders()
        });

        if (!res.ok) return [];
        return await res.json();
    } catch {
        return [];
    }
}

/**
 * Check if user has active subscription
 */
export async function hasActiveSubscription(): Promise<boolean> {
    const subscription = await getCurrentSubscription();
    return subscription?.status === 'ACTIVE';
}

/**
 * Get remaining days in subscription
 */
export function getRemainingDays(subscription: DriverSubscription): number {
    if (subscription.status !== 'ACTIVE') return 0;
    const now = Date.now();
    const remaining = subscription.endDate - now;
    return Math.max(0, Math.ceil(remaining / (24 * 60 * 60 * 1000)));
}

/**
 * Check if subscription needs renewal (within 3 days of expiry)
 */
export function needsRenewal(subscription: DriverSubscription): boolean {
    if (subscription.status !== 'ACTIVE') return true;
    const daysRemaining = getRemainingDays(subscription);
    return daysRemaining <= 3;
}

// --- ADMIN/ANALYTICS FUNCTIONS ---

/**
 * Get subscription statistics (admin only)
 */
export async function getSubscriptionStats(): Promise<SubscriptionStats> {
    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/subscriptions/stats`, {
            headers: getHeaders()
        });

        if (!res.ok) {
            throw new Error('Failed to fetch stats');
        }

        return await res.json();
    } catch {
        return {
            totalActiveSubscribers: 0,
            dailyRevenue: 0,
            monthlyRevenue: 0,
            churnRate: 0,
            conversionRate: 0
        };
    }
}

/**
 * Get all active subscriptions (admin only)
 */
export async function getAllActiveSubscriptions(): Promise<DriverSubscription[]> {
    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/subscriptions/active`, {
            headers: getHeaders()
        });

        if (!res.ok) return [];
        return await res.json();
    } catch {
        return [];
    }
}

// --- UTILITY FUNCTIONS ---

/**
 * Format subscription status for display
 */
export function formatSubscriptionStatus(status: DriverSubscription['status']): {
    label: string;
    color: string;
    icon: string;
} {
    switch (status) {
        case 'ACTIVE':
            return { label: 'Active', color: 'green', icon: '✓' };
        case 'EXPIRED':
            return { label: 'Expired', color: 'red', icon: '✗' };
        case 'GRACE':
            return { label: 'Grace Period', color: 'yellow', icon: '⚠' };
        case 'CANCELLED':
            return { label: 'Cancelled', color: 'gray', icon: '−' };
        default:
            return { label: 'Unknown', color: 'gray', icon: '?' };
    }
}

/**
 * Format plan duration for display
 */
export function formatPlanDuration(duration: SubscriptionPlan['duration']): string {
    switch (duration) {
        case 'DAILY': return 'दैनिक / Daily';
        case 'MONTHLY': return 'मासिक / Monthly';
        case 'YEARLY': return 'वार्षिक / Yearly';
        default: return duration;
    }
}

/**
 * Calculate earnings comparison (with vs without subscription)
 */
export function calculateEarningsComparison(
    dailyRides: number,
    avgFarePerRide: number,
    subscription: SubscriptionPlan
): {
    withoutSubscription: number;
    withSubscription: number;
    netGain: number;
    roiPercentage: number;
} {
    const days = subscription.duration === 'DAILY' ? 1
        : subscription.duration === 'MONTHLY' ? 30 : 365;

    const totalFares = dailyRides * avgFarePerRide * days;

    // Assume 20% commission model for comparison
    const commissionRate = 0.20;
    const withoutSubscription = totalFares * (1 - commissionRate);
    const withSubscription = totalFares - subscription.price;
    const netGain = withSubscription - withoutSubscription;
    const roiPercentage = (netGain / subscription.price) * 100;

    return {
        withoutSubscription: Math.round(withoutSubscription),
        withSubscription: Math.round(withSubscription),
        netGain: Math.round(netGain),
        roiPercentage: Math.round(roiPercentage)
    };
}
