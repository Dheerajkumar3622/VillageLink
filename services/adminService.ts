
import { User, AdminStats, RouteDefinition } from '../types';
import { getAuthToken } from './authService';
import { API_BASE_URL } from '../config';

const API_URL = `${API_BASE_URL}/api/admin`;

const getHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': getAuthToken() || ''
});

export const getAdminStats = async (): Promise<AdminStats | null> => {
    try {
        const res = await fetch(`${API_URL}/stats`, { headers: getHeaders() });
        if (!res.ok) throw new Error('Failed to fetch stats');
        return await res.json();
    } catch (e) {
        console.error(e);
        return null;
    }
};

export const getAllUsers = async (): Promise<User[]> => {
    try {
        const res = await fetch(`${API_URL}/users`, { headers: getHeaders() });
        if (!res.ok) throw new Error('Failed to fetch users');
        return await res.json();
    } catch (e) {
        console.error(e);
        return [];
    }
};

export const verifyDriver = async (userId: string, isVerified: boolean): Promise<boolean> => {
    try {
        const res = await fetch(`${API_URL}/verify-driver`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ userId, isVerified })
        });
        return res.ok;
    } catch (e) {
        console.error(e);
        return false;
    }
};

export const toggleUserBan = async (userId: string, isBanned: boolean): Promise<boolean> => {
    try {
        const res = await fetch(`${API_URL}/toggle-ban`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ userId, isBanned })
        });
        return res.ok;
    } catch (e) {
        console.error(e);
        return false;
    }
};

// --- ROUTE MANAGEMENT ---

export const getRoutes = async (): Promise<RouteDefinition[]> => {
    try {
        const res = await fetch(`${API_BASE_URL}/api/routes`, { headers: getHeaders() });
        if (!res.ok) return [];
        return await res.json();
    } catch (e) { return []; }
};

export const createRoute = async (route: Omit<RouteDefinition, 'id'>): Promise<boolean> => {
    try {
        const res = await fetch(`${API_BASE_URL}/api/routes`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(route)
        });
        return res.ok;
    } catch (e) { return false; }
};

export const deleteRoute = async (id: string): Promise<boolean> => {
    try {
        const res = await fetch(`${API_BASE_URL}/api/routes/${id}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        return res.ok;
    } catch (e) { return false; }
};

// --- PRICING MANAGEMENT (SUPER PANEL) ---

export interface PricingConfig {
    baseFare: number;
    perKmRate: number;
}

export const getPricingConfig = async (): Promise<PricingConfig> => {
    try {
        const res = await fetch(`${API_URL}/pricing`, { headers: getHeaders() });
        if (!res.ok) throw new Error("Failed");
        return await res.json();
    } catch (e) {
        return { baseFare: 10, perKmRate: 6 }; // Default fallback
    }
};

export const updatePricingConfig = async (config: PricingConfig): Promise<boolean> => {
    try {
        const res = await fetch(`${API_URL}/pricing`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(config)
        });
        return res.ok;
    } catch (e) { return false; }
};
