
// --- APP CONFIGURATION ---

// Production backend URL
const PRODUCTION_BACKEND = 'https://villagelink-jh20.onrender.com';

const getBaseUrl = () => {
    // If VITE_API_URL is explicitly set, use it
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;

    // specific check for local development
    if (typeof window !== 'undefined') {
        const host = window.location.hostname;
        if (host === 'localhost' || host.startsWith('192.168.') || host.startsWith('10.') || host.startsWith('172.')) {
            // Return empty string to allow Vite's secure HTTPS proxy to handle the API calls
            return '';
        }
    }

    // Default to production
    return 'https://villagelink-jh20.onrender.com';
};

export const API_BASE_URL = getBaseUrl();
 
