
// --- APP CONFIGURATION ---

// Production backend URL
const PRODUCTION_BACKEND = 'https://backendlink-0xjs.onrender.com';

const getBaseUrl = () => {
    // If local dev server (localhost, 127.0.0.1, or local LAN IP) or flag set, use local backend
    if (typeof window !== 'undefined') {
        const host = window.location.hostname;
        if (host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.') || host.startsWith('10.') || host.startsWith('172.')) {
            return `http://${host}:3001`;
        }
    }
    if (import.meta.env.VITE_USE_LOCAL_BACKEND === 'true' && import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
    }

    // Fixed Permanent Production Backend
    return PRODUCTION_BACKEND;
};

export const API_BASE_URL = getBaseUrl();
 
