import { API_BASE_URL } from '../config';
import { getAuthToken } from './authService';
import { PreOrder, DhabaAmenity, HotspotProvider, Restaurant } from '../types';

// ==================== GEO-FENCED PRE-ORDERING ====================

export const createPreOrder = async (order: PreOrder): Promise<{ success: boolean; preorder?: PreOrder; error?: string }> => {
    try {
        const token = await getAuthToken();
        const res = await fetch(`${API_BASE_URL}/api/foodlink/highway/preorder`, {
            method: 'POST',
            headers: { Authorization: token || '', 'Content-Type': 'application/json' },
            body: JSON.stringify(order)
        });
        const data = await res.json();
        return data;
    } catch (error: any) { return { success: false, error: error.message || 'Failed' }; }
};

export const getActivePreOrders = async (): Promise<{ success: boolean; orders?: PreOrder[]; error?: string }> => {
    try {
        const token = await getAuthToken();
        const response = await fetch(`${API_BASE_URL}/highway/pre-order/active`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        return { success: true, orders: data.orders };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const updateLiveLocation = async (
    orderId: string,
    lat: number,
    lng: number,
    distanceRemaining: number
): Promise<{ success: boolean; newEta?: number }> => {
    try {
        const token = await getAuthToken();
        const response = await fetch(`${API_BASE_URL}/highway/pre-order/${orderId}/location`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ lat, lng, distanceRemaining }),
        });
        const data = await response.json();
        return { success: true, newEta: data.etaMinutes };
    } catch (error) {
        return { success: false };
    }
};

// ==================== AMENTITY RATINGS ====================

export const getDhabaAmenities = async (dhabaId: string): Promise<{ success: boolean; amenities?: DhabaAmenity; error?: string }> => {
    try {
        const response = await fetch(`${API_BASE_URL}/highway/amenities/${dhabaId}`);
        const data = await response.json();
        return { success: true, amenities: data.amenities };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const rateAmenity = async (
    dhabaId: string,
    amenityType: 'restroom' | 'parking' | 'womenFriendly',
    rating: number,
    comment?: string
): Promise<{ success: boolean }> => {
    try {
        const token = await getAuthToken();
        const response = await fetch(`${API_BASE_URL}/highway/amenities/${dhabaId}/rate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ amenityType, rating, comment }),
        });
        return { success: response.ok };
    } catch (error) {
        return { success: false };
    }
};

// ==================== HOTSPOT CONNECTIVITY ====================

export const registerHotspot = async (dhabaId: string): Promise<{ success: boolean; hotspot?: HotspotProvider }> => {
    try {
        const token = await getAuthToken();
        const response = await fetch(`${API_BASE_URL}/highway/hotspot/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ dhabaId }),
        });
        const data = await response.json();
        return { success: true, hotspot: data.hotspot };
    } catch (error) {
        return { success: false };
    }
};

// Mock data removed. Use backend API.

