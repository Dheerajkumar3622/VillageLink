
// --- APP CONFIGURATION ---

// Production backend URL
const PRODUCTION_BACKEND = 'https://backendlink-0xjs.onrender.com';

const getBaseUrl = () => {
    // Allow explicit override if VITE_USE_LOCAL_BACKEND is set to true
    if (import.meta.env.VITE_USE_LOCAL_BACKEND === 'true') {
        if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
        if (typeof window !== 'undefined') {
            const host = window.location.hostname;
            return `http://${host}:3001`;
        }
        return 'http://localhost:3001';
    }

    // Fixed Permanent Production Backend for OTP & all services
    return PRODUCTION_BACKEND;
};

export const API_BASE_URL = getBaseUrl();
 
