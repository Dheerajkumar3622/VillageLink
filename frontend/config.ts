
// --- UNIVERSAL APP BACKEND CONFIGURATION ---

// Fixed Single Source of Truth Production Backend Domain
export const PRODUCTION_BACKEND_URL = 'https://backendlink-0xjs.onrender.com';

/**
 * Universal function to get the current active Backend Domain / Base URL.
 * Automatically respects VITE_API_URL environment variable, local dev server detection, or production default.
 */
export const getBackendUrl = (): string => {
    if (import.meta.env?.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
    }
    if (typeof window !== 'undefined') {
        const host = window.location.hostname;
        if (host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.') || host.startsWith('10.') || host.startsWith('172.')) {
            return `http://${host}:3001`;
        }
    }
    if (import.meta.env?.VITE_USE_LOCAL_BACKEND === 'true' && import.meta.env?.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
    }

    return PRODUCTION_BACKEND_URL;
};

export const getBaseUrl = getBackendUrl;
export const API_BASE_URL = getBackendUrl();
export default getBackendUrl;

