/**
 * Aero Service - Smart Aeroponics API & Socket Client
 * Frontend service for aeroponic IoT module
 */

import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../config';
import { getAuthToken } from './authService';
import type {
    AeroDevice,
    AeroLiveData,
    AeroLiveDataWithStatus,
    AeroAlert,
    CropPreset,
    AeroHarvestPrediction,
    AeroCommand
} from '../types';

// Socket instance for live data
let aeroSocket: Socket | null = null;

// ==================== AUTH HELPER ====================

const getAuthHeaders = () => ({
    'Authorization': `Bearer ${getAuthToken()}`,
    'Content-Type': 'application/json'
});

// ==================== DEVICE MANAGEMENT ====================

export const getDevices = async (): Promise<AeroDevice[]> => {
    try {
        const res = await fetch(`${API_BASE_URL}/api/aero/devices`, {
            headers: getAuthHeaders()
        });
        if (!res.ok) throw new Error('Failed to fetch devices');
        return await res.json();
    } catch (error) {
        console.error('Error fetching aero devices:', error);
        return [];
    }
};

export const registerDevice = async (deviceData: Partial<AeroDevice>): Promise<AeroDevice | null> => {
    try {
        const res = await fetch(`${API_BASE_URL}/api/aero/devices`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(deviceData)
        });
        if (!res.ok) throw new Error('Failed to register device');
        return await res.json();
    } catch (error) {
        console.error('Error registering device:', error);
        return null;
    }
};

export const pairDevice = async (deviceId: string, macAddress: string, name?: string): Promise<{ success: boolean; device?: AeroDevice; error?: string }> => {
    try {
        const res = await fetch(`${API_BASE_URL}/api/aero/devices/pair`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ deviceId, macAddress, name })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to pair device');
        return { success: true, device: data.device };
    } catch (error: any) {
        console.error('Error pairing device:', error);
        return { success: false, error: error.message };
    }
};

// ==================== LIVE DATA ====================

export const getLiveData = async (deviceId: string): Promise<AeroLiveDataWithStatus | null> => {
    try {
        const res = await fetch(`${API_BASE_URL}/api/aero/live/${deviceId}`, {
            headers: getAuthHeaders()
        });
        if (!res.ok) throw new Error('Failed to fetch live data');
        return await res.json();
    } catch (error) {
        console.error('Error fetching live data:', error);
        return null;
    }
};

// ==================== COMMANDS ====================

export const sendCommand = async (
    deviceId: string,
    command: AeroCommand['command'],
    value?: any,
    towerId?: string
): Promise<{ success: boolean; commandId?: string; message?: string }> => {
    try {
        const res = await fetch(`${API_BASE_URL}/api/aero/command`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                device_id: deviceId,
                command,
                value,
                towerId
            })
        });
        if (!res.ok) throw new Error('Failed to send command');
        return await res.json();
    } catch (error) {
        console.error('Error sending command:', error);
        return { success: false, message: 'Failed to send command' };
    }
};

// ==================== AI PREDICTION ====================

export const getHarvestPrediction = async (
    deviceId: string,
    towerId?: string
): Promise<AeroHarvestPrediction | null> => {
    try {
        const url = towerId
            ? `${API_BASE_URL}/api/aero/predict/${deviceId}?towerId=${towerId}`
            : `${API_BASE_URL}/api/aero/predict/${deviceId}`;
        const res = await fetch(url, {
            headers: getAuthHeaders()
        });
        if (!res.ok) throw new Error('Failed to fetch prediction');
        return await res.json();
    } catch (error) {
        console.error('Error fetching prediction:', error);
        return null;
    }
};

// ==================== CROP PRESETS ====================

export const getCropPresets = async (): Promise<CropPreset[]> => {
    try {
        const res = await fetch(`${API_BASE_URL}/api/aero/presets`);
        if (!res.ok) throw new Error('Failed to fetch presets');
        return await res.json();
    } catch (error) {
        console.error('Error fetching presets:', error);
        return [];
    }
};

export const plantCrop = async (towerId: string, presetId: string): Promise<boolean> => {
    try {
        const res = await fetch(`${API_BASE_URL}/api/aero/tower/${towerId}/plant`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ presetId })
        });
        return res.ok;
    } catch (error) {
        console.error('Error planting crop:', error);
        return false;
    }
};

// ==================== ALERTS ====================

export const getAlerts = async (
    deviceId: string,
    unacknowledgedOnly = false
): Promise<AeroAlert[]> => {
    try {
        const url = unacknowledgedOnly
            ? `${API_BASE_URL}/api/aero/alerts/${deviceId}?unacknowledged=true`
            : `${API_BASE_URL}/api/aero/alerts/${deviceId}`;
        const res = await fetch(url, {
            headers: getAuthHeaders()
        });
        if (!res.ok) throw new Error('Failed to fetch alerts');
        return await res.json();
    } catch (error) {
        console.error('Error fetching alerts:', error);
        return [];
    }
};

export const acknowledgeAlert = async (alertId: string): Promise<boolean> => {
    try {
        const res = await fetch(`${API_BASE_URL}/api/aero/alerts/${alertId}/acknowledge`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        return res.ok;
    } catch (error) {
        console.error('Error acknowledging alert:', error);
        return false;
    }
};

// ==================== HISTORY ====================

export const getHistory = async (
    deviceId: string,
    period: '24h' | '7d' | '30d' = '24h',
    towerId?: string
): Promise<any[]> => {
    try {
        let url = `${API_BASE_URL}/api/aero/history/${deviceId}?period=${period}`;
        if (towerId) url += `&towerId=${towerId}`;
        const res = await fetch(url, {
            headers: getAuthHeaders()
        });
        if (!res.ok) throw new Error('Failed to fetch history');
        return await res.json();
    } catch (error) {
        console.error('Error fetching history:', error);
        return [];
    }
};

// ==================== SOCKET.IO REAL-TIME ====================

export const connectAeroSocket = (socketUrl?: string): Socket => {
    if (aeroSocket?.connected) return aeroSocket;

    aeroSocket = io(socketUrl || API_BASE_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
    });

    aeroSocket.on('connect', () => {
        console.log('🌿 Aero Socket connected');
    });

    aeroSocket.on('disconnect', () => {
        console.log('🔌 Aero Socket disconnected');
    });

    return aeroSocket;
};

export const subscribeToLiveData = (
    deviceId: string,
    callback: (data: AeroLiveData) => void
): (() => void) => {
    if (!aeroSocket) connectAeroSocket();

    const eventName = `aero_live_${deviceId}`;
    aeroSocket?.on(eventName, callback);

    // Join room for this device
    aeroSocket?.emit('subscribe_aero', deviceId);

    // Return unsubscribe function
    return () => {
        aeroSocket?.off(eventName, callback);
        aeroSocket?.emit('unsubscribe_aero', deviceId);
    };
};

export const subscribeToAlerts = (
    deviceId: string,
    callback: (alert: AeroAlert) => void
): (() => void) => {
    if (!aeroSocket) connectAeroSocket();

    const eventName = `aero_alert_${deviceId}`;
    aeroSocket?.on(eventName, callback);

    return () => {
        aeroSocket?.off(eventName, callback);
    };
};

export const disconnectAeroSocket = () => {
    if (aeroSocket) {
        aeroSocket.disconnect();
        aeroSocket = null;
    }
};

// ==================== OFFLINE CACHE ====================

const CACHE_KEY = 'aero_offline_cache';
const COMMAND_QUEUE_KEY = 'aero_command_queue';

export const cacheData = (deviceId: string, data: AeroLiveData) => {
    try {
        const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
        cache[deviceId] = { ...data, cachedAt: Date.now() };
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (e) {
        console.error('Cache error:', e);
    }
};

export const getCachedData = (deviceId: string): AeroLiveData | null => {
    try {
        const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
        return cache[deviceId] || null;
    } catch (e) {
        return null;
    }
};

export const queueCommand = (command: AeroCommand) => {
    try {
        const queue: AeroCommand[] = JSON.parse(localStorage.getItem(COMMAND_QUEUE_KEY) || '[]');
        queue.push({ ...command, id: crypto.randomUUID(), timestamp: Date.now() });
        localStorage.setItem(COMMAND_QUEUE_KEY, JSON.stringify(queue));
    } catch (e) {
        console.error('Queue error:', e);
    }
};

export const syncQueuedCommands = async (): Promise<number> => {
    try {
        const queue: AeroCommand[] = JSON.parse(localStorage.getItem(COMMAND_QUEUE_KEY) || '[]');
        if (queue.length === 0) return 0;

        let synced = 0;
        for (const cmd of queue) {
            const result = await sendCommand(cmd.deviceId, cmd.command, cmd.value, cmd.towerId);
            if (result.success) synced++;
        }

        // Clear queue after sync attempt
        localStorage.setItem(COMMAND_QUEUE_KEY, '[]');
        return synced;
    } catch (e) {
        console.error('Sync error:', e);
        return 0;
    }
};

// ==================== UTILITY FUNCTIONS ====================

export const formatStatus = (status: string, lang: 'en' | 'hi' = 'hi'): string => {
    const statusMap: Record<string, { en: string; hi: string }> = {
        'LOW': { en: 'Low', hi: 'कम' },
        'NORMAL': { en: 'Normal', hi: 'सामान्य' },
        'HIGH': { en: 'High', hi: 'अधिक' },
        'FULL': { en: 'Full', hi: 'भरा हुआ' },
        'ON': { en: 'On', hi: 'चालू' },
        'OFF': { en: 'Off', hi: 'बंद' },
        'AUTO': { en: 'Auto', hi: 'ऑटो' },
        'ACTIVE': { en: 'Active', hi: 'सक्रिय' },
        'IDLE': { en: 'Idle', hi: 'निष्क्रिय' },
        'OFFLINE': { en: 'Offline', hi: 'ऑफलाइन' }
    };
    return statusMap[status]?.[lang] || status;
};

export const getStatusColor = (status: string): string => {
    const colorMap: Record<string, string> = {
        'LOW': '#ef4444',     // red
        'HIGH': '#f97316',    // orange
        'NORMAL': '#22c55e',  // green
        'FULL': '#3b82f6',    // blue
        'ON': '#22c55e',
        'OFF': '#6b7280',
        'AUTO': '#8b5cf6',    // purple
        'ACTIVE': '#22c55e',
        'IDLE': '#6b7280',
        'OFFLINE': '#ef4444'
    };
    return colorMap[status] || '#6b7280';
};

export default {
    getDevices,
    registerDevice,
    getLiveData,
    sendCommand,
    getHarvestPrediction,
    getCropPresets,
    plantCrop,
    getAlerts,
    acknowledgeAlert,
    getHistory,
    connectAeroSocket,
    subscribeToLiveData,
    subscribeToAlerts,
    disconnectAeroSocket,
    cacheData,
    getCachedData,
    queueCommand,
    syncQueuedCommands,
    formatStatus,
    getStatusColor,
    pairDevice
};
