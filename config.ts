
// --- APP CONFIGURATION ---

const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// Automatically select the correct API URL
// 1. If VITE_API_URL is set (e.g. for Capacitor), use it.
// 2. If running locally, use localhost:3001
// 3. If running in production (Render), use the current origin.
// Use VITE_API_URL if set, otherwise use current origin in production, or fallback to Render URL
export const API_BASE_URL = import.meta.env.VITE_API_URL ||
    (typeof window !== 'undefined' && !window.location.hostname.includes('localhost') ? window.location.origin : '') ||
    'https://villagelink-c75g.onrender.com'; 
