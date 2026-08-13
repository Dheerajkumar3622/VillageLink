// --- CENTRAL BACKEND DOMAIN CONFIGURATION ---

/** Single source of truth production backend domain */
export const PRODUCTION_BACKEND_URL = 'https://backendlink-0xjs.onrender.com';

/**
 * Dynamic getter for active backend server URL.
 * Automatically checks environment variables (RENDER_EXTERNAL_URL, BACKEND_URL) or falls back to PRODUCTION_BACKEND_URL.
 */
export function getBackendUrl() {
    return process.env.RENDER_EXTERNAL_URL || process.env.BACKEND_URL || PRODUCTION_BACKEND_URL;
}

/**
 * Universal Allowed Origins array for CORS configuration.
 */
export function getAllowedOrigins() {
    const activeUrl = getBackendUrl();
    const origins = [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:8100',
        'capacitor://localhost',
        'http://localhost',
        PRODUCTION_BACKEND_URL
    ];
    if (activeUrl && !origins.includes(activeUrl)) {
        origins.push(activeUrl);
    }
    return origins;
}

export default getBackendUrl;
