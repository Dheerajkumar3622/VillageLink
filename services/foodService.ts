/**
 * FoodLink Service - Business logic for food discovery and ordering
 */

import { API_BASE_URL } from '../config';
import { getAuthToken } from './authService';
import { FoodVendor, Restaurant, FoodOrder, BudgetTier, RestaurantCategory, CuisineType } from '../types';

// ==================== DISCOVERY ====================

export interface DiscoveryFilters {
    pincode?: string;
    lat?: number;
    lng?: number;
    maxDistance?: number;
    category?: RestaurantCategory;
    budgetTier?: BudgetTier;
    cuisines?: CuisineType[];
    pureVegOnly?: boolean;
    minRating?: number;
    isOpen?: boolean;
    hasTableBooking?: boolean;
    hasSubscription?: boolean;
}

export const discoverStalls = async (filters: DiscoveryFilters = {}): Promise<FoodVendor[]> => {
    try {
        const params = new URLSearchParams();
        if (filters.pincode) params.append('pincode', filters.pincode);
        if (filters.lat) params.append('lat', String(filters.lat));
        if (filters.lng) params.append('lng', String(filters.lng));
        if (filters.maxDistance) params.append('maxDistance', String(filters.maxDistance));
        if (filters.category) params.append('category', filters.category);
        if (filters.pureVegOnly) params.append('pureVeg', 'true');

        const res = await fetch(`${API_BASE_URL}/api/food/stalls?${params}`);
        if (!res.ok) throw new Error('Failed to fetch stalls');
        return res.json();
    } catch (e) {
        console.error('Stall discovery error:', e);
        return [];
    }
};

export const discoverRestaurants = async (filters: DiscoveryFilters = {}): Promise<Restaurant[]> => {
    try {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, val]) => {
            if (val !== undefined && val !== null) {
                params.append(key, String(val));
            }
        });

        const res = await fetch(`${API_BASE_URL}/api/food/restaurants?${params}`);
        if (!res.ok) throw new Error('Failed to fetch restaurants');
        return res.json();
    } catch (e) {
        console.error('Restaurant discovery error:', e);
        return [];
    }
};

// ==================== ORDERING ====================

export interface OrderRequest {
    vendorId: string;
    vendorType: 'RESTAURANT' | 'STALL';
    items: {
        itemId: string;
        name: string;
        price: number;
        quantity: number;
        customization?: {
            spiceLevel?: 'MILD' | 'MEDIUM' | 'SPICY' | 'EXTRA_SPICY';
            addOns?: { name: string; price: number }[];
            exclusions?: string[];
            specialInstructions?: string;
        };
    }[];
    orderType: 'DINE_IN' | 'TAKEAWAY' | 'PRE_ORDER';
    scheduledFor?: number;
    tableBookingId?: string;
}

export const placeOrder = async (order: OrderRequest): Promise<{ success: boolean; order?: FoodOrder; error?: string }> => {
    try {
        const endpoint = order.vendorType === 'STALL'
            ? `${API_BASE_URL}/api/food/stalls/order`
            : `${API_BASE_URL}/api/food/restaurants/order`;

        const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify(order)
        });

        const data = await res.json();
        if (!res.ok) return { success: false, error: data.message || 'Order failed' };
        return { success: true, order: data.order };
    } catch (e) {
        console.error('Order placement error:', e);
        return { success: false, error: 'Network error' };
    }
};

export const getOrderStatus = async (orderId: string): Promise<FoodOrder | null> => {
    try {
        const res = await fetch(`${API_BASE_URL}/api/food/order/${orderId}`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });
        if (!res.ok) return null;
        return res.json();
    } catch (e) {
        console.error('Order status error:', e);
        return null;
    }
};

export const getMyOrders = async (): Promise<FoodOrder[]> => {
    try {
        const res = await fetch(`${API_BASE_URL}/api/food/my-orders`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });
        if (!res.ok) return [];
        return res.json();
    } catch (e) {
        console.error('My orders error:', e);
        return [];
    }
};

// ==================== TABLE BOOKING ====================

export interface TableBookingRequest {
    restaurantId: string;
    date: string;
    timeSlot: string;
    partySize: number;
    occasion?: 'BIRTHDAY' | 'ANNIVERSARY' | 'BUSINESS' | 'CASUAL';
    specialRequests?: string;
    preOrderItems?: { itemId: string; quantity: number }[];
}

export const bookTable = async (booking: TableBookingRequest): Promise<{ success: boolean; booking?: any; error?: string }> => {
    try {
        const res = await fetch(`${API_BASE_URL}/api/food/table-booking`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify(booking)
        });

        const data = await res.json();
        if (!res.ok) return { success: false, error: data.message || 'Booking failed' };
        return { success: true, booking: data.booking };
    } catch (e) {
        console.error('Table booking error:', e);
        return { success: false, error: 'Network error' };
    }
};

export const getMyTableBookings = async (): Promise<any[]> => {
    try {
        const res = await fetch(`${API_BASE_URL}/api/food/my-table-bookings`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });
        if (!res.ok) return [];
        return res.json();
    } catch (e) {
        console.error('Table bookings error:', e);
        return [];
    }
};

export const cancelTableBooking = async (bookingId: string): Promise<boolean> => {
    try {
        const res = await fetch(`${API_BASE_URL}/api/food/table-booking/${bookingId}/cancel`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });
        return res.ok;
    } catch (e) {
        console.error('Cancel booking error:', e);
        return false;
    }
};

// ==================== SUBSCRIPTIONS ====================

export interface SubscriptionRequest {
    vendorId: string;
    vendorType: 'RESTAURANT' | 'STALL';
    planType: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM';
    tier: 'BASIC' | 'STANDARD' | 'PREMIUM';
    meals: ('BREAKFAST' | 'LUNCH' | 'DINNER')[];
    startDate: number;
    customDays?: number[];
}

export const subscribe = async (subscription: SubscriptionRequest): Promise<{ success: boolean; subscription?: any; error?: string }> => {
    try {
        const res = await fetch(`${API_BASE_URL}/api/food/subscribe`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify(subscription)
        });

        const data = await res.json();
        if (!res.ok) return { success: false, error: data.message || 'Subscription failed' };
        return { success: true, subscription: data.subscription };
    } catch (e) {
        console.error('Subscription error:', e);
        return { success: false, error: 'Network error' };
    }
};

export const getMySubscriptions = async (): Promise<any[]> => {
    try {
        const res = await fetch(`${API_BASE_URL}/api/food/my-subscriptions`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });
        if (!res.ok) return [];
        return res.json();
    } catch (e) {
        console.error('Subscriptions error:', e);
        return [];
    }
};

export const pauseSubscription = async (subscriptionId: string, pauseUntil: number): Promise<boolean> => {
    try {
        const res = await fetch(`${API_BASE_URL}/api/food/subscription/${subscriptionId}/pause`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify({ pauseUntil })
        });
        return res.ok;
    } catch (e) {
        console.error('Pause subscription error:', e);
        return false;
    }
};

export const resumeSubscription = async (subscriptionId: string): Promise<boolean> => {
    try {
        const res = await fetch(`${API_BASE_URL}/api/food/subscription/${subscriptionId}/resume`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });
        return res.ok;
    } catch (e) {
        console.error('Resume subscription error:', e);
        return false;
    }
};

// ==================== REVIEWS ====================

export interface ReviewRequest {
    vendorId: string;
    vendorType: 'RESTAURANT' | 'STALL';
    ratings: {
        food: number;
        service: number;
        value: number;
        hygiene: number;
    };
    comment?: string;
    photos?: string[];
    orderedItems?: string[];
}

export const submitReview = async (review: ReviewRequest): Promise<{ success: boolean; error?: string }> => {
    try {
        const overallRating = (review.ratings.food + review.ratings.service + review.ratings.value + review.ratings.hygiene) / 4;

        const res = await fetch(`${API_BASE_URL}/api/food/reviews`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify({ ...review, overallRating })
        });

        if (!res.ok) {
            const data = await res.json();
            return { success: false, error: data.message || 'Review failed' };
        }
        return { success: true };
    } catch (e) {
        console.error('Review submission error:', e);
        return { success: false, error: 'Network error' };
    }
};

export const getVendorReviews = async (vendorId: string): Promise<any[]> => {
    try {
        const res = await fetch(`${API_BASE_URL}/api/food/reviews/${vendorId}`);
        if (!res.ok) return [];
        return res.json();
    } catch (e) {
        console.error('Vendor reviews error:', e);
        return [];
    }
};

// ==================== SMART FEATURES ====================

export const getRecommendations = async (userId: string): Promise<any[]> => {
    try {
        const res = await fetch(`${API_BASE_URL}/api/food/recommendations/${userId}`, {
            headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });
        if (!res.ok) return [];
        return res.json();
    } catch (e) {
        console.error('Recommendations error:', e);
        return [];
    }
};

export const getTrendingDishes = async (location?: string): Promise<any[]> => {
    try {
        const params = location ? `?location=${encodeURIComponent(location)}` : '';
        const res = await fetch(`${API_BASE_URL}/api/food/trending${params}`);
        if (!res.ok) return [];
        return res.json();
    } catch (e) {
        console.error('Trending dishes error:', e);
        return [];
    }
};

export const estimateBudget = async (partySize: number, vendorId: string): Promise<{ min: number; avg: number; max: number } | null> => {
    try {
        const res = await fetch(`${API_BASE_URL}/api/food/budget-estimate?partySize=${partySize}&vendorId=${vendorId}`);
        if (!res.ok) return null;
        return res.json();
    } catch (e) {
        console.error('Budget estimate error:', e);
        return null;
    }
};

export const getCrowdLevel = async (vendorId: string): Promise<'QUIET' | 'MODERATE' | 'BUSY' | 'VERY_BUSY' | null> => {
    try {
        const res = await fetch(`${API_BASE_URL}/api/food/crowd-level/${vendorId}`);
        if (!res.ok) return null;
        const data = await res.json();
        return data.level;
    } catch (e) {
        console.error('Crowd level error:', e);
        return null;
    }
};

export const getWaitTime = async (vendorId: string): Promise<number | null> => {
    try {
        const res = await fetch(`${API_BASE_URL}/api/food/wait-time/${vendorId}`);
        if (!res.ok) return null;
        const data = await res.json();
        return data.minutes;
    } catch (e) {
        console.error('Wait time error:', e);
        return null;
    }
};

// ==================== UTILITIES ====================

export const formatPrice = (amount: number): string => {
    return `₹${amount.toLocaleString('en-IN')}`;
};

export const getBudgetLabel = (tier: BudgetTier): string => {
    const labels: Record<BudgetTier, string> = {
        BUDGET: '₹ Budget',
        MID_RANGE: '₹₹ Mid-Range',
        PREMIUM: '₹₹₹ Premium',
        LUXURY: '₹₹₹₹ Luxury'
    };
    return labels[tier];
};

export const getCategoryIcon = (category: RestaurantCategory): string => {
    const icons: Record<RestaurantCategory, string> = {
        DHABA: '🍛',
        MESS: '🥗',
        FAST_FOOD: '🍔',
        RESTAURANT: '🍴',
        CAFE: '☕',
        STREET_STALL: '🍜',
        FINE_DINING: '🥂'
    };
    return icons[category] || '🍽️';
};

export const getTimeSlots = (openTime: string, closeTime: string, intervalMins: number = 30): string[] => {
    const slots: string[] = [];
    const [openH, openM] = openTime.split(':').map(Number);
    const [closeH, closeM] = closeTime.split(':').map(Number);

    let currentMins = openH * 60 + openM;
    const closeMins = closeH * 60 + closeM;

    while (currentMins < closeMins) {
        const h = Math.floor(currentMins / 60);
        const m = currentMins % 60;
        slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
        currentMins += intervalMins;
    }

    return slots;
};
